import React, { useState, useEffect } from 'react';
import { AppState, FileData, Question, UserAnswer, ExamConfig, User, SavedExam, SavedSummary } from './types';
import FileUploader from './components/FileUploader';
import ExamPaper from './components/ExamPaper';
import ResultView from './components/ResultView';
import SummaryView from './components/SummaryView';
import Dashboard from './components/Dashboard';
import FeedbackView from './components/FeedbackView';
import SettingsView from './components/SettingsView';
import { readFileContent, analyzeStyle, analyzeMaterials, generateExam, generateSummary, generateExamFeedback } from './services/geminiService';
import { Loader2, BrainCircuit, BookOpen, Settings2, Moon, Sun, FileText, LogIn, Sparkles, RefreshCcw, CheckCircle, Search, CloudUpload, Save, Flame } from 'lucide-react';
import { auth, loginWithGoogle, logout, saveUserData, loadUserData } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('DASHBOARD');
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  
  // Data State
  const [styleFiles, setStyleFiles] = useState<File[]>([]);
  const [materialFiles, setMaterialFiles] = useState<File[]>([]);
  const [styleAnalysis, setStyleAnalysis] = useState<string>('');
  const [materialAnalysis, setMaterialAnalysis] = useState<string>(''); // New state for deep learning content
  const [examConfig, setExamConfig] = useState<ExamConfig>({ 
    totalQuestions: 20, 
    mcCount: 15, 
    saCount: 5, 
    subjCount: 0,
    additionalInstructions: '',
    confusionMode: false
  });
  
  // Runtime State
  const [currentExamId, setCurrentExamId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [generatedSummary, setGeneratedSummary] = useState<string>('');
  const [generatedFeedback, setGeneratedFeedback] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Persistence State
  const [savedExams, setSavedExams] = useState<SavedExam[]>([]);
  const [savedSummaries, setSavedSummaries] = useState<SavedSummary[]>([]);

  const [darkMode, setDarkMode] = useState(false);

  // Initialize Dark Mode & Load Data
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Auth Listener & Cloud Data Load
  useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
              const mappedUser: User = {
                  name: firebaseUser.displayName || 'User',
                  email: firebaseUser.email || '',
                  imageUrl: firebaseUser.photoURL || undefined
              };
              setFirebaseUid(firebaseUser.uid);

              // Load data from Firestore on login
              try {
                  setIsSyncing(true);
                  const cloudData = await loadUserData(firebaseUser.uid);
                  if (cloudData) {
                      setSavedExams(cloudData.exams || []);
                      setSavedSummaries(cloudData.summaries || []);
                      if (cloudData.geminiApiKey) {
                          mappedUser.geminiApiKey = cloudData.geminiApiKey;
                      }
                      console.log("Data loaded from cloud");
                  } else {
                      // If no cloud data, try local storage (migration case)
                      const storedExams = localStorage.getItem('savedExams');
                      const storedSummaries = localStorage.getItem('savedSummaries');
                      if (storedExams) setSavedExams(JSON.parse(storedExams));
                      if (storedSummaries) setSavedSummaries(JSON.parse(storedSummaries));
                  }
              } catch (e) {
                  console.error("Failed to load cloud data", e);
              } finally {
                  setIsSyncing(false);
                  setUser(mappedUser);
                  
                  if (!mappedUser.geminiApiKey) {
                      setAppState('SETTINGS');
                  } else {
                      setAppState(prev => prev === 'SETTINGS' ? 'DASHBOARD' : prev);
                  }
              }

          } else {
              setUser(null);
              setFirebaseUid(null);
              // Fallback to local storage for guests
              const storedExams = localStorage.getItem('savedExams');
              const storedSummaries = localStorage.getItem('savedSummaries');
              if (storedExams) setSavedExams(JSON.parse(storedExams));
              if (storedSummaries) setSavedSummaries(JSON.parse(storedSummaries));
          }
      });
      return () => unsubscribe();
  }, []);

  useEffect(() => {
      const storedStyleAnalysis = localStorage.getItem('styleAnalysis');
      if (storedStyleAnalysis) setStyleAnalysis(storedStyleAnalysis);
  }, []);

  // Save Data on Change (Local Storage Always)
  useEffect(() => {
      localStorage.setItem('savedExams', JSON.stringify(savedExams));
  }, [savedExams]);

  useEffect(() => {
      localStorage.setItem('savedSummaries', JSON.stringify(savedSummaries));
  }, [savedSummaries]);

  useEffect(() => {
      localStorage.setItem('styleAnalysis', styleAnalysis);
  }, [styleAnalysis]);


  const handleLogin = async () => {
      try {
        await loginWithGoogle();
      } catch (error) {
        console.error("Login failed", error);
        setError("로그인에 실패했습니다.");
      }
  };

  const handleLogout = async () => {
      try {
        await logout();
        setAppState('DASHBOARD');
        setSavedExams([]);
        setSavedSummaries([]);
      } catch (error) {
          console.error("Logout failed", error);
      }
  };

  const handleCloudSave = async () => {
      if (!firebaseUid) {
          setError("클라우드 저장을 위해 먼저 로그인해주세요.");
          return;
      }

      setIsSyncing(true);
      try {
          await saveUserData(firebaseUid, {
              exams: savedExams,
              summaries: savedSummaries
          });
          alert("데이터가 구글 계정에 안전하게 저장되었습니다!");
      } catch (e) {
          console.error(e);
          setError("저장 중 오류가 발생했습니다.");
      } finally {
          setIsSyncing(false);
      }
  };

  const handlePresetChange = (type: 'ALL_MC' | 'ALL_SA' | 'ALL_SUBJ' | 'CUSTOM') => {
      const total = examConfig.totalQuestions;
      if (type === 'ALL_MC') {
          setExamConfig(prev => ({ ...prev, mcCount: total, saCount: 0, subjCount: 0 }));
      } else if (type === 'ALL_SA') {
          setExamConfig(prev => ({ ...prev, mcCount: 0, saCount: total, subjCount: 0 }));
      } else if (type === 'ALL_SUBJ') {
          setExamConfig(prev => ({ ...prev, mcCount: 0, saCount: 0, subjCount: total }));
      }
  };

  const handleCountChange = (key: 'mcCount' | 'saCount' | 'subjCount', val: number) => {
      setExamConfig(prev => {
          const newConfig = { ...prev, [key]: val };
          // Update total automatically based on sum
          newConfig.totalQuestions = newConfig.mcCount + newConfig.saCount + newConfig.subjCount;
          return newConfig;
      });
  };

  const handleTotalChange = (val: number) => {
      // Scale ratios when total slider moves
      setExamConfig(prev => {
          if (prev.totalQuestions === 0) return { ...prev, totalQuestions: val, mcCount: val, saCount: 0, subjCount: 0 };
          
          const ratioMc = prev.mcCount / prev.totalQuestions;
          const ratioSa = prev.saCount / prev.totalQuestions;
          
          let newMc = Math.round(val * ratioMc);
          let newSa = Math.round(val * ratioSa);
          let newSubj = val - newMc - newSa;
          
          if (newSubj < 0) {
              if (newMc > newSa) newMc += newSubj;
              else newSa += newSubj;
              newSubj = 0;
          }

          return { ...prev, totalQuestions: val, mcCount: newMc, saCount: newSa, subjCount: newSubj };
      });
  };

  const checkApiKey = () => {
      if (user && !user.geminiApiKey) {
          setError("AI 기능을 사용하려면 설정에서 API 키를 등록해주세요.");
          setAppState('SETTINGS');
          return false;
      }
      return true;
  };

  const startStyleAnalysis = async () => {
    if (!checkApiKey()) return;
    if (styleFiles.length === 0) {
      setError("최소 하나의 스타일 파일(과거 시험지, 워크시트 등)을 업로드해주세요.");
      return;
    }
    setAppState('ANALYZING');
    setError(null);
    try {
      const processedStyleFiles = await Promise.all(styleFiles.map(readFileContent));
      const analysis = await analyzeStyle(processedStyleFiles, user?.geminiApiKey);
      setStyleAnalysis(analysis);
      setAppState('SETUP');
    } catch (e) {
      console.error(e);
      setError("파일 분석에 실패했습니다.");
      setAppState('SETUP');
    }
  };

  const startMaterialAnalysis = async () => {
    if (!checkApiKey()) return;
    if (materialFiles.length === 0) {
        setError("학습 자료를 업로드해주세요.");
        return;
    }
    setAppState('MATERIAL_ANALYZING');
    setError(null);
    try {
        const processedMaterialFiles = await Promise.all(materialFiles.map(readFileContent));
        const analysis = await analyzeMaterials(processedMaterialFiles, user?.geminiApiKey);
        setMaterialAnalysis(analysis);
        setAppState('SETUP');
    } catch (e) {
        console.error(e);
        setError("학습 자료 분석에 실패했습니다. 파일 크기가 너무 클 수 있습니다.");
        setAppState('SETUP');
    }
  };

  const clearAnalysis = () => {
      if (confirm('저장된 문제 스타일 분석을 초기화하시겠습니까?')) {
          setStyleAnalysis('');
          localStorage.removeItem('styleAnalysis');
      }
  };
  
  const clearMaterialAnalysis = () => {
      setMaterialAnalysis('');
  };

  const createExam = async () => {
    if (!checkApiKey()) return;
    if (!materialAnalysis) {
      setError("먼저 학습 자료를 분석해주세요 (2단계 '내용 분석 시작').");
      return;
    }
    if (!styleAnalysis) {
        setError("먼저 문제 스타일을 분석해주세요 (1단계).");
        return;
    }

    if (examConfig.totalQuestions === 0) {
        setError("문제 수는 최소 1개 이상이어야 합니다.");
        return;
    }

    setAppState('GENERATING');
    setError(null);

    try {
      // NOTE: If files are present, we read them. If reused, files might be empty but analysis is set.
      const processedMaterialFiles = materialFiles.length > 0 ? await Promise.all(materialFiles.map(readFileContent)) : [];
      
      const generatedQuestions = await generateExam(
        processedMaterialFiles,
        materialAnalysis,
        styleAnalysis,
        examConfig.mcCount,
        examConfig.saCount,
        examConfig.subjCount,
        examConfig.additionalInstructions,
        examConfig.confusionMode, // Pass confusionMode
        user?.geminiApiKey
      );
      
      if (generatedQuestions.length === 0) {
        throw new Error("문제가 생성되지 않았습니다.");
      }

      setQuestions(generatedQuestions);
      setUserAnswers([]); 
      setCurrentExamId(Date.now().toString());
      
      const newExam: SavedExam = {
          id: Date.now().toString(),
          title: `생성된 시험 ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
          createdAt: Date.now(),
          questions: generatedQuestions,
          config: examConfig,
          userAnswers: [],
          // Save the analysis context for future reuse
          styleAnalysis: styleAnalysis,
          materialAnalysis: materialAnalysis
      };
      setSavedExams(prev => [newExam, ...prev]);
      setCurrentExamId(newExam.id);

      setAppState('EXAM');
    } catch (e) {
        console.error(e);
        setError("시험 생성 실패. API 오류일 수 있습니다.");
        setAppState('SETUP');
    }
  };

  const createSummary = async () => {
      if (!checkApiKey()) return;
      if (!materialAnalysis) {
          setError("먼저 학습 자료를 분석해주세요 (2단계 '내용 분석 시작').");
          return;
      }
      setAppState('SUMMARY_GENERATING');
      setError(null);

      try {
          // Use materialAnalysis directly for summary
          const summary = await generateSummary(materialAnalysis, examConfig.additionalInstructions, user?.geminiApiKey);
          setGeneratedSummary(summary);
          
          const newSummary: SavedSummary = {
              id: Date.now().toString(),
              title: `핵심 정리본 ${new Date().toLocaleDateString()}`,
              createdAt: Date.now(),
              content: summary
          };
          setSavedSummaries(prev => [newSummary, ...prev]);

          setAppState('SUMMARY_VIEW');
      } catch (e) {
          console.error(e);
          setError("정리본 생성에 실패했습니다.");
          setAppState('SETUP');
      }
  };

  const handleExamProgress = (answers: UserAnswer[]) => {
      setUserAnswers(answers);
      if (currentExamId) {
          setSavedExams(prev => prev.map(e => {
              if (e.id === currentExamId) {
                  return { ...e, userAnswers: answers };
              }
              return e;
          }));
      }
  };

  const handleExamComplete = (answers: UserAnswer[]) => {
    handleExamProgress(answers);
    setAppState('REVIEW');
  };

  const handleExamExit = () => {
      setAppState('DASHBOARD');
  };

  const generateFeedback = async () => {
      if (!checkApiKey()) return;
      setAppState('FEEDBACK_GENERATING');
      try {
          const feedback = await generateExamFeedback(questions, userAnswers, user?.geminiApiKey);
          setGeneratedFeedback(feedback);
          setAppState('FEEDBACK_VIEW');
      } catch (e) {
          console.error(e);
          setError("AI 피드백 생성에 실패했습니다.");
          setAppState('REVIEW');
      }
  };

  const reset = () => {
    setAppState('DASHBOARD');
    setQuestions([]);
    setUserAnswers([]);
    setGeneratedSummary('');
    setCurrentExamId(null);
    setError(null);
  };

  // Dashboard Handlers
  const handleStartExamFromDashboard = (exam: SavedExam) => {
      setQuestions(exam.questions);
      setExamConfig(exam.config);
      setCurrentExamId(exam.id);
      
      // Load existing answers (continue or review)
      if (exam.userAnswers) {
          setUserAnswers(exam.userAnswers);
      } else {
          setUserAnswers([]);
      }
      
      setAppState('EXAM');
  };

  const handleRetakeExamFromDashboard = (exam: SavedExam) => {
      if (confirm('이 시험을 처음부터 다시 풉니다. 기존 풀이 기록은 초기화됩니다. 계속하시겠습니까?')) {
          setQuestions(exam.questions);
          setExamConfig(exam.config);
          setCurrentExamId(exam.id);
          setUserAnswers([]); // Clear answers explicitly
          
          // Update the saved exam to clear answers immediately in state
          setSavedExams(prev => prev.map(e => {
              if (e.id === exam.id) {
                  return { ...e, userAnswers: [] };
              }
              return e;
          }));
          
          setAppState('EXAM');
      }
  };

  // [NEW] Reuse Handler
  const handleReuseProject = (exam: SavedExam) => {
      if (!exam.styleAnalysis || !exam.materialAnalysis) {
          alert("이 프로젝트는 소스 데이터가 포함되어 있지 않아 재사용할 수 없습니다. (이전 버전 데이터)");
          return;
      }
      
      // Restore analysis data
      setStyleAnalysis(exam.styleAnalysis);
      setMaterialAnalysis(exam.materialAnalysis);
      
      // Clear file inputs to indicate we are using stored analysis
      setStyleFiles([]);
      setMaterialFiles([]);
      
      // Restore config if available
      setExamConfig(prev => ({
          ...prev,
          ...exam.config,
      }));

      // Go to setup screen directly, skipping analysis
      setAppState('SETUP');
      setError(null);
  };

  const handleViewSummaryFromDashboard = (summary: SavedSummary) => {
      setGeneratedSummary(summary.content);
      setAppState('SUMMARY_VIEW');
  };

  const handleDeleteExam = (id: string) => {
      if (confirm('정말 삭제하시겠습니까?')) {
          setSavedExams(prev => prev.filter(e => e.id !== id));
      }
  };

  const handleDeleteSummary = (id: string) => {
      if (confirm('정말 삭제하시겠습니까?')) {
          setSavedSummaries(prev => prev.filter(e => e.id !== id));
      }
  };
  
  const handleRenameExam = (id: string, newName: string) => {
      setSavedExams(prev => prev.map(e => e.id === id ? { ...e, title: newName } : e));
  };
  
  const handleRenameSummary = (id: string, newName: string) => {
      setSavedSummaries(prev => prev.map(s => s.id === id ? { ...s, title: newName } : s));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <div className="bg-blue-600 p-2 rounded-lg">
                <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">ExamGenius AI</span>
          </div>
          <div className="flex items-center gap-4">
              {user && (
                  <button
                    onClick={handleCloudSave}
                    disabled={isSyncing}
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                      {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                      {isSyncing ? '저장 중...' : '클라우드 저장'}
                  </button>
              )}

              {user && (
                  <button 
                    onClick={() => setAppState('SETTINGS')}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="설정"
                  >
                      <Settings2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
              )}
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                  {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>
              
              {user ? (
                 <div className="flex items-center gap-3">
                     <div className="text-right hidden sm:block">
                         <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{user.name}</p>
                         <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                     </div>
                     {user.imageUrl && (
                         <img src={user.imageUrl} alt="Profile" className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600" />
                     )}
                     <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700 dark:text-red-400">로그아웃</button>
                 </div>
              ) : (
                 <button 
                    onClick={handleLogin}
                    className="flex items-center gap-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                 >
                     <LogIn className="w-4 h-4" />
                     <span>Google 로그인</span>
                 </button>
              )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative">
                <span className="block sm:inline">{error}</span>
            </div>
        )}

        {appState === 'DASHBOARD' && (
            <Dashboard 
                user={user}
                savedExams={savedExams}
                savedSummaries={savedSummaries}
                onStartExam={handleStartExamFromDashboard}
                onRetakeExam={handleRetakeExamFromDashboard}
                onViewSummary={handleViewSummaryFromDashboard}
                onDeleteExam={handleDeleteExam}
                onDeleteSummary={handleDeleteSummary}
                onRenameExam={handleRenameExam}
                onRenameSummary={handleRenameSummary}
                onNew={() => setAppState('SETUP')}
                onReuseProject={handleReuseProject}
            />
        )}

        {appState === 'SETUP' && (
          <div className="grid lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Left Col: Inputs */}
            <div className="space-y-8">
              <section className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                    <div className="flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-blue-600" />
                        <h2 className="text-lg font-semibold">1. 유형 분석 (Form)</h2>
                    </div>
                    {styleAnalysis && (
                        <button onClick={clearAnalysis} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                            <RefreshCcw className="w-3 h-3" /> 초기화
                        </button>
                    )}
                </div>
                
                {styleAnalysis ? (
                     <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <h3 className="font-bold text-green-800 dark:text-green-300 mb-1">유형 분석 완료</h3>
                        <p className="text-sm text-green-700 dark:text-green-400 mb-4">문제의 형식, 난이도, 말투를 파악했습니다.</p>
                        <div className="text-left text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 max-h-24 overflow-y-auto">
                            {styleAnalysis}
                        </div>
                     </div>
                ) : (
                    <>
                        <FileUploader 
                        label="기출문제 / 문제집 업로드" 
                        description="AI가 형식을 분석합니다. (내용은 2단계에서 분석합니다)"
                        files={styleFiles} 
                        onFilesChanged={setStyleFiles} 
                        />
                        <button 
                        onClick={startStyleAnalysis}
                        disabled={styleFiles.length === 0}
                        className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex justify-center items-center gap-2
                            bg-gray-900 dark:bg-blue-600 text-white hover:bg-gray-800 dark:hover:bg-blue-700 shadow-lg hover:shadow-xl
                            disabled:opacity-50 disabled:shadow-none`}
                        >
                        유형 분석 시작
                        </button>
                    </>
                )}
              </section>

              <section className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                 <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        <h2 className="text-lg font-semibold">2. 학습 자료 (Content)</h2>
                    </div>
                    {materialAnalysis && (
                        <button onClick={clearMaterialAnalysis} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                            <RefreshCcw className="w-3 h-3" /> 재분석
                        </button>
                    )}
                </div>

                {materialAnalysis ? (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
                        <Search className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                        <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-1">자료 내용 학습 완료</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">AI가 자료의 핵심 개념과 원리를 학습했습니다.</p>
                        <div className="text-left text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 max-h-24 overflow-y-auto">
                            핵심 개념 요약 데이터 포함됨
                        </div>
                    </div>
                ) : (
                    <>
                         <FileUploader 
                            label="교과서, 강의 노트, 요약본 업로드" 
                            description="AI가 내용을 철저하게 학습합니다."
                            files={materialFiles} 
                            onFilesChanged={setMaterialFiles} 
                        />
                        <button 
                            onClick={startMaterialAnalysis}
                            disabled={materialFiles.length === 0}
                            className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex justify-center items-center gap-2
                                bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg hover:shadow-xl
                                disabled:opacity-50 disabled:shadow-none`}
                            >
                            <Search className="w-4 h-4" />
                            내용 분석 시작 (필수)
                        </button>
                    </>
                )}
              </section>
            </div>

            {/* Right Col: Config & Action */}
            <div className="space-y-8">
               <section className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col">
                 <div className="flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-gray-700 pb-2">
                    <Settings2 className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold">3. 시험 설정 및 생성</h2>
                </div>

                <div className="space-y-6 flex-1">
                    {/* Presets */}
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => handlePresetChange('ALL_MC')} className="text-xs py-2 px-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">올 객관식</button>
                        <button onClick={() => handlePresetChange('ALL_SA')} className="text-xs py-2 px-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">올 단답형</button>
                        <button onClick={() => handlePresetChange('ALL_SUBJ')} className="text-xs py-2 px-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">올 주관식</button>
                    </div>

                    <div>
                        <label className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <span>총 문제 수</span>
                            <span className="text-blue-600 font-bold">{examConfig.totalQuestions}</span>
                        </label>
                        <input 
                            type="range" min="1" max="50" step="1"
                            value={examConfig.totalQuestions}
                            onChange={(e) => handleTotalChange(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">객관식</label>
                            <input 
                                type="number" 
                                min="0"
                                value={examConfig.mcCount}
                                onChange={(e) => handleCountChange('mcCount', parseInt(e.target.value) || 0)}
                                className="w-full bg-transparent text-xl font-bold text-gray-800 dark:text-white outline-none"
                            />
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                             <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">단답형</label>
                             <input 
                                type="number" 
                                min="0"
                                value={examConfig.saCount}
                                onChange={(e) => handleCountChange('saCount', parseInt(e.target.value) || 0)}
                                className="w-full bg-transparent text-xl font-bold text-gray-800 dark:text-white outline-none"
                            />
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                             <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">주관식</label>
                             <input 
                                type="number" 
                                min="0"
                                value={examConfig.subjCount}
                                onChange={(e) => handleCountChange('subjCount', parseInt(e.target.value) || 0)}
                                className="w-full bg-transparent text-xl font-bold text-gray-800 dark:text-white outline-none"
                            />
                        </div>
                    </div>
                    
                    {/* 헷갈림 모드 토글 */}
                    <div 
                        onClick={() => setExamConfig(prev => ({...prev, confusionMode: !prev.confusionMode}))}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                            examConfig.confusionMode 
                                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${examConfig.confusionMode ? 'bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-200' : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'}`}>
                                <Flame className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className={`font-bold text-sm ${examConfig.confusionMode ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                    🔥🔥 헷갈림 모드 (Hard)
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">선지가 아주 헷갈리게 출제됩니다.</p>
                            </div>
                        </div>
                        <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${examConfig.confusionMode ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-300 ${examConfig.confusionMode ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">추가 요청사항</label>
                        <textarea 
                            value={examConfig.additionalInstructions}
                            onChange={(e) => setExamConfig(prev => ({ ...prev, additionalInstructions: e.target.value }))}
                            placeholder="예: 계산 문제를 많이 넣어줘, 3단원 내용을 중심으로 내줘..."
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:text-white h-24 resize-none"
                        />
                    </div>

                    <div className="pt-2 mt-auto grid grid-cols-2 gap-3">
                        <button 
                            onClick={createSummary}
                            disabled={!materialAnalysis}
                            className="py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none flex items-center justify-center gap-2"
                        >
                            <FileText className="w-5 h-5" />
                            핵심 정리본 생성
                        </button>
                        <button 
                            onClick={createExam}
                            disabled={!styleAnalysis || !materialAnalysis}
                            className="py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-blue-200 dark:shadow-none shadow-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none flex items-center justify-center gap-2"
                        >
                            <BrainCircuit className="w-5 h-5" />
                            시험 문제 생성
                        </button>
                    </div>
                    {(!styleAnalysis || !materialAnalysis) && (
                        <p className="text-center text-xs text-red-400 mt-2">
                             {!styleAnalysis && "1단계(유형 분석) "}
                             {!styleAnalysis && !materialAnalysis && "및 "}
                             {!materialAnalysis && "2단계(내용 분석) "}
                             을 완료해주세요.
                        </p>
                    )}
                </div>
               </section>
            </div>
          </div>
        )}

        {(appState === 'ANALYZING' || appState === 'MATERIAL_ANALYZING' || appState === 'GENERATING' || appState === 'SUMMARY_GENERATING' || appState === 'FEEDBACK_GENERATING') && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                {appState === 'ANALYZING' ? '출제 스타일 분석 중...' : 
                 appState === 'MATERIAL_ANALYZING' ? '학습 자료 내용 학습 중...' :
                 appState === 'SUMMARY_GENERATING' ? '핵심 노트 정리 중...' : 
                 appState === 'FEEDBACK_GENERATING' ? 'AI가 학습 피드백을 작성 중입니다...' :
                 '시험지 제작 중...'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
                {appState === 'ANALYZING' ? 'AI가 기출문제의 형식, 난이도, 함정 패턴을 파악하고 있습니다.' : 
                 appState === 'MATERIAL_ANALYZING' ? 'AI가 교과서 내용을 꼼꼼하게 읽고 핵심 개념 지도를 그리고 있습니다.' :
                 appState === 'SUMMARY_GENERATING' ? '학습된 개념 지도를 바탕으로 노션 스타일의 정리본을 만들고 있습니다.' :
                 appState === 'FEEDBACK_GENERATING' ? '틀린 문제의 원인을 분석하고 관련된 핵심 개념을 정리하고 있습니다.' :
                 '분석된 스타일(형식)에 학습된 내용(Content)을 결합하여 문제를 생성하고 있습니다.'}
            </p>
          </div>
        )}

        {appState === 'SETTINGS' && user && firebaseUid && (
            <SettingsView 
                userId={firebaseUid}
                initialApiKey={user.geminiApiKey}
                onSave={(apiKey) => {
                    setUser(prev => prev ? { ...prev, geminiApiKey: apiKey } : null);
                    setAppState('DASHBOARD');
                }}
                onCancel={() => setAppState('DASHBOARD')}
            />
        )}

        {appState === 'EXAM' && (
            <ExamPaper 
                questions={questions} 
                initialAnswers={userAnswers}
                onComplete={handleExamComplete} 
                onSaveProgress={handleExamProgress}
                onExit={handleExamExit}
            />
        )}

        {appState === 'REVIEW' && (
            <ResultView 
                questions={questions} 
                userAnswers={userAnswers} 
                onRetry={reset} 
                onGenerateFeedback={generateFeedback}
            />
        )}
        
        {appState === 'SUMMARY_VIEW' && (
            <SummaryView summary={generatedSummary} onBack={reset} />
        )}

        {appState === 'FEEDBACK_VIEW' && (
            <FeedbackView feedback={generatedFeedback} onBack={() => setAppState('REVIEW')} />
        )}
      </main>
    </div>
  );
};

export default App;