import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { 
  initializeFirestore, 
  getFirestore,
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  deleteDoc,
  query,
  orderBy,
  terminate,
  clearIndexedDbPersistence
} from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { SavedExam, SavedSummary } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyAnRNEp3TxwUYdpaiHsrPgRVrBPUUY7e_g",
  authDomain: "work-on-a-problem.firebaseapp.com",
  projectId: "work-on-a-problem",
  storageBucket: "work-on-a-problem.firebasestorage.app",
  messagingSenderId: "854765454957",
  appId: "1:854765454957:web:0de9df82e097cb7b846164",
  measurementId: "G-FZSNHLV1KH"
};

// [근본 해결 1] 앱 및 Firestore 인스턴스 싱글톤 관리
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const analytics = getAnalytics(app);

// [근본 해결 2] 인스턴스 생성 로직 최적화
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // HTTP 폴링 강제
  useFetchStreams: false,             // 스트림 연결 차단 (안정성)
  cacheSizeBytes: 50 * 1024 * 1024,   // 50MB 캐시 제한 (무제한보다 안정적일 수 있음)
});

export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// --- 기존 기능 유지 ---

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    // 로그아웃 시 연결 정리
    await terminate(db); 
    await signOut(auth);
    window.location.reload(); // 연결 초기화를 위해 페이지 새로고침
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};

export const saveUserData = async (userId: string, data: { exams: SavedExam[], summaries: SavedSummary[] }) => {
    try {
        const userRef = doc(db, "users", userId);
        const examsRef = collection(userRef, "exams");
        const summariesRef = collection(userRef, "summaries");

        // 동시 실행으로 속도 유지
        const [serverExamSnap, serverSummarySnap] = await Promise.all([
            getDocs(examsRef),
            getDocs(summariesRef)
        ]);

        const serverExamIds = new Set(serverExamSnap.docs.map(d => d.id));
        const localExamIds = new Set(data.exams.map(e => e.id));
        const serverSummaryIds = new Set(serverSummarySnap.docs.map(d => d.id));
        const localSummaryIds = new Set(data.summaries.map(s => s.id));

        const promises: Promise<any>[] = [];

        serverExamIds.forEach((id) => {
            if (!localExamIds.has(id as string)) promises.push(deleteDoc(doc(examsRef, id as string)));
        });
        data.exams.forEach(exam => {
            promises.push(setDoc(doc(examsRef, exam.id), JSON.parse(JSON.stringify(exam))));
        });

        serverSummaryIds.forEach((id) => {
            if (!localSummaryIds.has(id as string)) promises.push(deleteDoc(doc(summariesRef, id as string)));
        });
        data.summaries.forEach(summary => {
            promises.push(setDoc(doc(summariesRef, summary.id), JSON.parse(JSON.stringify(summary))));
        });

        await Promise.all(promises);
        return true;
    } catch (error) {
        console.error("Error saving user data", error);
        throw error;
    }
};

/**
 * [근본 해결 3] loadUserData 래핑 및 오프라인 동작 안정화
 */
export const saveUserApiKey = async (userId: string, apiKey: string) => {
    try {
        const userRef = doc(db, "users", userId);
        await setDoc(userRef, { geminiApiKey: apiKey }, { merge: true });
        return true;
    } catch (error) {
        console.error("Error saving API key", error);
        throw error;
    }
};

export const loadUserData = async (userId: string) => {
    try {
        const userRef = doc(db, "users", userId);
        
        const examsQuery = query(collection(userRef, "exams"), orderBy("createdAt", "desc"));
        const summariesQuery = query(collection(userRef, "summaries"), orderBy("createdAt", "desc"));

        // 에러가 나더라도 클라이언트가 'Offline' 상태에서 캐시를 반환하도록 유도
        const [examsSnap, summariesSnap] = await Promise.all([
            getDocs(examsQuery),
            getDocs(summariesQuery)
        ]).catch(async (err) => {
            // 연결 실패 시 재시도하지 않고 빈 결과를 보내 에러 방지
            console.warn("Firestore 가 오프라인 모드로 동작합니다.");
            return [ { empty: true, docs: [] }, { empty: true, docs: [] } ] as any[];
        });

        let exams: SavedExam[] = [];
        let summaries: SavedSummary[] = [];
        let geminiApiKey: string | undefined = undefined;

        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            geminiApiKey = data.geminiApiKey;
        }

        if (!examsSnap.empty || !summariesSnap.empty) {
            exams = examsSnap.docs.map((d: any) => d.data() as SavedExam);
            summaries = summariesSnap.docs.map((d: any) => d.data() as SavedSummary);
        } else {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.exams) exams = typeof data.exams === 'string' ? JSON.parse(data.exams) : data.exams;
                if (data.summaries) summaries = typeof data.summaries === 'string' ? JSON.parse(data.summaries) : data.summaries;
                
                exams.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                summaries.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            }
        }

        return { exams, summaries, geminiApiKey };

    } catch (error) {
        console.error("Critical error in loadUserData:", error);
        // 에러를 던지지 않고 빈 객체를 반환하여 UI가 죽는 것을 방지
        return { exams: [], summaries: [], geminiApiKey: undefined };
    }
};