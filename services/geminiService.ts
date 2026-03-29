import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuestionType, FileData, UserAnswer } from "../types";
import { getConfusionModePrompt, getNormalModePrompt } from "./confusionService";

const getAiClient = (userApiKey?: string) => {
  const apiKey = userApiKey || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set the API_KEY environment variable or provide a user API key.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to calculate text similarity (Jaccard Index) for deduplication
const calculateSimilarity = (str1: string, str2: string) => {
  const set1 = new Set(str1.toLowerCase().replace(/[^\w\s\u3131-\uD79D]/g, '').split(/\s+/));
  const set2 = new Set(str2.toLowerCase().replace(/[^\w\s\u3131-\uD79D]/g, '').split(/\s+/));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
};

// Helper to convert File objects to base64/text
export const readFileContent = (file: File): Promise<FileData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (file.type.startsWith('image/')) {
        const base64Data = result.split(',')[1];
        resolve({ name: file.name, content: base64Data, mimeType: file.type });
      } else {
        resolve({ name: file.name, content: result, mimeType: 'text/plain' });
      }
    };
    reader.onerror = reject;
    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  });
};

/**
 * Splits file data into manageable chunks.
 */
const chunkMaterials = (files: FileData[], chunkSize = 100000): FileData[][] => {
    const chunks: FileData[][] = [];
    let currentChunk: FileData[] = [];
    let currentSize = 0;

    for (const file of files) {
        if (file.mimeType.startsWith('text/') && file.content.length > chunkSize) {
            if (currentChunk.length > 0) {
                chunks.push(currentChunk);
                currentChunk = [];
                currentSize = 0;
            }
            
            let offset = 0;
            while (offset < file.content.length) {
                const slice = file.content.slice(offset, offset + chunkSize);
                chunks.push([{
                    name: `${file.name}_part_${Math.floor(offset/chunkSize) + 1}`,
                    content: slice,
                    mimeType: file.mimeType
                }]);
                offset += chunkSize;
            }
        } else {
            const estimatedSize = file.mimeType.startsWith('image/') ? 10000 : file.content.length;
            
            if (currentSize + estimatedSize > chunkSize && currentChunk.length > 0) {
                chunks.push(currentChunk);
                currentChunk = [];
                currentSize = 0;
            }
            currentChunk.push(file);
            currentSize += estimatedSize;
        }
    }
    
    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }

    return chunks;
};

export const analyzeStyle = async (files: FileData[], userApiKey?: string): Promise<string> => {
  const ai = getAiClient(userApiKey);
  const chunks = chunkMaterials(files);
  const sampleFiles = chunks[0] || [];

  const contents = [
    { text: `
      당신은 **'시험 출제 포렌식(Forensic) 전문가'**입니다. 
      제공된 문제 파일들을 현미경으로 관찰하듯 분석하여, 출제자의 **'출제 DNA'와 '습관'**을 완벽하게 추출해내십시오.
      이 분석 결과는 나중에 원본과 200% 유사한 '쌍둥이 문제'를 만드는 설계도로 사용됩니다.

      [분석 필수 항목 - 심층 해부]:

      1. **발문(Question Stem)의 문법적 구조**:
         - 질문이 끝나는 어미의 형태 (예: "~로 가장 적절한 것은?", "~의 값을 구하시오.", "~에 대한 설명으로 옳은 것은?")
         - 문제의 도입부 패턴 (예: "다음 <보기>의 상황에서...", "그림 (가)와 (나)는...", "A회사의 네트워크 관리자는...")
         - 부정형 질문("~아닌 것은?")의 빈도와 표기 방식(밑줄, 굵게 등).

      2. **선지(Option) 설계의 미시적 법칙 (가장 중요)**:
         - **오답 유도 메커니즘**: 출제자가 오답을 만들 때 자주 쓰는 속임수는 무엇인가?
           (예: 핵심 키워드는 맞지만 서술어를 반대로 뒤집음, 인과관계 역전, 부분적 사실에 거짓 정보 섞기, 수치만 살짝 변경)
         - **선지 간의 관계성(Correlation)**: 
           (예: ①번과 ②번이 서로 반대되는 개념인가? ③번과 ④번은 유사한 개념을 다루는가? 선지 길이를 비슷하게 맞추는가?)
         - **매력적인 오답(Distractor)**: 수험생이 가장 많이 낚일법한 오답을 어떻게 배치하는가?

      3. **자료 제시 유형 및 구조**:
         - <보기>, [조건], <표>, <그림> 등의 박스형 자료가 얼마나 자주 등장하는가?
         - 자료가 주어질 때 문제 해결의 단서는 보통 어디에 숨겨져 있는가?

      4. **난이도 및 인지적 깊이**:
         - 단순 암기형(Recall)인가, 복합 추론형(Reasoning)인가?
         - 한 문제 내에서 몇 단계의 사고 과정을 요구하는가?

      [🚨 절대 금지 사항]:
      - 분석 결과에 "TCP/IP가 나왔다", "역사 문제가 많다" 같은 **구체적인 교과 내용(Content)**을 포함하지 마십시오. 오직 **형식(Format)과 구조(Structure)**만 추출하십시오.
      - 추상적으로 "어렵다"라고 하지 말고, "두 가지 개념을 복합적으로 묻는 방식이라 어렵다"처럼 구체적인 메커니즘을 서술하십시오.
    `},
    ...sampleFiles.map(f => ({
      inlineData: f.mimeType.startsWith('image/') ? { data: f.content, mimeType: f.mimeType } : undefined,
      text: f.mimeType.startsWith('text/') ? `[스타일 분석용 파일] ${f.name}:\n${f.content}` : undefined
    })).filter(p => p.inlineData || p.text)
  ];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: contents.map(c => ({ parts: [c] })),
  });

  return response.text || "분석 실패.";
};

export const analyzeMaterials = async (files: FileData[], userApiKey?: string): Promise<string> => {
    const ai = getAiClient(userApiKey);
    const chunks = chunkMaterials(files, 150000); 

    const promises = chunks.map(async (chunkFiles, index) => {
        const prompt = `
            당신은 '학습 자료 정밀 분석가'입니다. 제공된 텍스트에서 학습에 필요한 **모든 내용**을 추출하여 정리하십시오.
            
            [매우 중요 - 상세 분석 지침]:
            1. **요약 금지**: 내용을 축약하거나 "핵심만 간단히" 정리하지 마십시오. 교과서나 강의록의 내용을 **상세하게 풀어서(Verbose)** 기록하십시오.
            2. **디테일 보존**: 구체적인 수치, 공식, 예시 상황, 예외 조건, 도표의 설명 텍스트 등을 빠짐없이 포함하십시오.
            3. **메타데이터 제외**: 파일 헤더, 페이지 번호, PDF 구조 정보(Trailer, Root, Size 등)는 제외하십시오.
            4. **목적**: 이 분석본은 나중에 사용자가 "이 페이지만 보고 공부해도 될 정도"로 완벽한 정리본을 만드는 데 사용됩니다.

            최대한 자세하고 풍부하게 작성하십시오.
        `;

        const fileParts = chunkFiles.map(f => ({
            inlineData: f.mimeType.startsWith('image/') ? { data: f.content, mimeType: f.mimeType } : undefined,
            text: f.mimeType.startsWith('text/') ? `[학습 자료] (${f.name}):\n${f.content}` : undefined
        })).filter(p => p.inlineData || p.text);

        try {
            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: [{ role: 'user', parts: [{ text: prompt }, ...fileParts] }]
            });
            return response.text || "";
        } catch (e) {
            console.error(`Material analysis error chunk ${index}`, e);
            return "";
        }
    });

    const analysisResults = await Promise.all(promises);
    return analysisResults.join("\n\n");
};

export const generateExam = async (
  materialFiles: FileData[],
  materialAnalysis: string,
  styleAnalysis: string,
  mcCount: number,
  saCount: number,
  subjCount: number,
  additionalInstructions: string = "",
  confusionMode: boolean = false,
  userApiKey?: string
): Promise<Question[]> => {
  const ai = getAiClient(userApiKey);
  
  // Handle Project Reuse case: No raw files, but analysis exists.
  let workingFiles = [...materialFiles];
  if (workingFiles.length === 0 && materialAnalysis) {
      workingFiles = [{
          name: "Stored_Analysis_Context_For_Reuse.txt",
          content: materialAnalysis,
          mimeType: "text/plain"
      }];
  }

  const chunks = chunkMaterials(workingFiles);
  const numChunks = chunks.length;
  
  if (numChunks === 0) return [];

  const distribute = (total: number, parts: number) => {
      const base = Math.floor(total / parts);
      const remainder = total % parts;
      return Array(parts).fill(base).map((val, idx) => idx < remainder ? val + 1 : val);
  };

  const mcDist = distribute(mcCount, numChunks);
  const saDist = distribute(saCount, numChunks);
  const subjDist = distribute(subjCount, numChunks);

  let rawQuestions: Question[] = [];

  const promises = chunks.map(async (chunkFiles, index) => {
      const localMc = mcDist[index];
      const localSa = saDist[index];
      const localSubj = subjDist[index];
      
      if (localMc === 0 && localSa === 0 && localSubj === 0) return [];

      const prompt = `
        당신은 수석 출제 위원입니다. 
        제공된 **"학습 자료(Raw Source)"**와 사전에 분석된 **"개념 지도(Knowledge Base)"**를 바탕으로 문제를 출제해야 합니다.

        [🚨 데이터 무결성 필수 규칙 - CRITICAL]:
        1. **정답 인덱스 필수**: 객관식 문제의 경우, 반드시 \`correctAnswerIndex\` (0~3 사이의 정수)를 정확하게 명시하십시오. 이 인덱스가 정답의 기준이 됩니다.
        2. **텍스트 일치**: 시스템은 \`correctAnswerIndex\`가 가리키는 \`options\`의 텍스트를 정답으로 사용할 것입니다.

        ${confusionMode ? getConfusionModePrompt() : getNormalModePrompt()}

        [🚨 포맷팅 주의사항 - 매우 중요]:
        1. **내용(Content)의 원천**: 문제는 오직 **"학습 자료"**와 **"개념 지도"**에 있는 사실에 기반해야 합니다.
        2. **형식(Style)의 완벽 모방**: 제공된 **"${styleAnalysis}"**에 분석된 출제자의 습관을 200% 반영하십시오.
        3. **특수문자 금지**: JSON 값(questionText 등)에는 '**', '*', '__' 같은 마크다운 문법을 **절대 사용하지 마십시오**. 
        4. **<보기> 가독성**: ㄱ, ㄴ, ㄷ 등의 보기가 있는 경우, 각 항목은 **반드시 줄바꿈 문자(\\n)로 구분**하십시오.
        5. **선지별 해설**: 객관식 문제의 경우, 정답뿐만 아니라 각 오답 선지가 왜 틀렸는지에 대한 짧은 해설을 반드시 포함하십시오.

        [출제 수량]:
        - 객관식: ${localMc}문제 (보기 4개 필수)
        - 단답형: ${localSa}문제
        - 주관식: ${localSubj}문제
        
        [추가 요청사항]:
        ${additionalInstructions}
        
        참고할 개념 지도 요약:
        ${materialAnalysis.substring(0, 5000)}... (생략됨)

        결과는 반드시 유효한 JSON 형식이어야 하며, 한국어로 작성하십시오.
      `;

      const fileParts = chunkFiles.map(f => ({
          inlineData: f.mimeType.startsWith('image/') ? { data: f.content, mimeType: f.mimeType } : undefined,
          text: f.mimeType.startsWith('text/') ? `[RAW 학습 자료 텍스트]:\n${f.content}` : undefined
      })).filter(p => p.inlineData || p.text);

      try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
            { role: 'user', parts: [{ text: prompt }, ...fileParts] }
            ],
            config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, enum: [QuestionType.MULTIPLE_CHOICE, QuestionType.SHORT_ANSWER, QuestionType.SUBJECTIVE] },
                    questionText: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    optionsExplanations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "각 선지에 대한 1:1 대응 개별 해설. 선지 순서와 일치해야 함." },
                    correctAnswer: { type: Type.STRING },
                    correctAnswerIndex: { type: Type.INTEGER, description: "정답 선지의 배열 인덱스 (0-3). 이것이 채점의 기준이 됨." },
                    explanation: { type: Type.STRING, description: "전체적인 문제 해설 및 핵심 개념 설명" }
                },
                required: ["type", "questionText", "correctAnswer", "explanation"]
                }
            }
            }
        });
        
        const jsonStr = response.text || "[]";
        const parsed: any[] = JSON.parse(jsonStr);

        // [CRITICAL FIX] Sanitize Data: Force Answer Synchronization
        // 헷갈림 모드 등에서 AI가 텍스트를 비틀면 correctAnswer 텍스트와 options 텍스트가 달라질 수 있음.
        // 따라서 인덱스를 기준으로 correctAnswer 텍스트를 강제로 덮어씌움.
        return parsed.map((q: any) => {
             if (q.type === QuestionType.MULTIPLE_CHOICE && q.options && Array.isArray(q.options) && q.options.length > 0) {
                 
                 let finalIndex = -1;

                 // 1. 인덱스가 유효한 경우, 최우선으로 사용
                 if (typeof q.correctAnswerIndex === 'number' && q.correctAnswerIndex >= 0 && q.correctAnswerIndex < q.options.length) {
                     finalIndex = q.correctAnswerIndex;
                 } 
                 // 2. 인덱스가 없거나 이상하면, 텍스트 매칭 시도 (Fallback)
                 else {
                     const normAnswer = (q.correctAnswer || '').replace(/\s+/g, '').toLowerCase();
                     const foundIdx = q.options.findIndex((opt: string) => opt.replace(/\s+/g, '').toLowerCase() === normAnswer);
                     
                     if (foundIdx !== -1) {
                         finalIndex = foundIdx;
                     } else {
                         // 3. 텍스트 매칭도 실패하면 알파벳(A, B..) 체크
                         const charMap = ['a', 'b', 'c', 'd', 'e'];
                         const answerChar = (q.correctAnswer || '').trim().toLowerCase().replace('.', '');
                         const charIdx = charMap.indexOf(answerChar);
                         if (charIdx !== -1 && charIdx < q.options.length) {
                             finalIndex = charIdx;
                         }
                     }
                 }

                 // 데이터 강제 동기화 (Data Enforcement)
                 if (finalIndex !== -1) {
                     q.correctAnswerIndex = finalIndex;
                     q.correctAnswer = q.options[finalIndex]; // 선지 텍스트를 그대로 정답으로 설정 (버그 원천 차단)
                 } else {
                     // 최악의 경우: 매칭되는 게 없음. 첫 번째 선지를 정답으로 설정하여 에러 방지 (혹은 로직에 따라 처리)
                     // 여기서는 안전하게 인덱스 0으로 설정
                     q.correctAnswerIndex = 0;
                     q.correctAnswer = q.options[0]; 
                 }
             }
             return q as Question;
        });

      } catch (e) {
          console.error(`Error generating questions for chunk ${index}`, e);
          return [];
      }
  });

  const results = await Promise.all(promises);
  rawQuestions = results.flat().filter(q => q && q.questionText);

  // Deduplication Logic
  const uniqueQuestions: Question[] = [];
  
  for (const q of rawQuestions) {
      // Check similarity
      const isDuplicate = uniqueQuestions.some(existing => {
          const similarity = calculateSimilarity(existing.questionText, q.questionText);
          return similarity > 0.6; 
      });

      // Filter out garbage questions about file structure
      const isMetaQuestion = /pdf|trailer|size|part|file|structure|format/i.test(q.questionText) && !/protocol|network|layer/i.test(q.questionText); // Allow valid tech terms

      if (!isDuplicate && !isMetaQuestion) {
          uniqueQuestions.push(q);
      }
  }

  return uniqueQuestions.map((q, idx) => ({ ...q, id: idx + 1 }));
};

export const generateSummary = async (materialAnalysis: string, additionalInstructions: string = "", userApiKey?: string): Promise<string> => {
    const ai = getAiClient(userApiKey);
    
    // Updated prompt to focus on comprehensive, detailed note-taking instead of summarizing.
    const prompt = `
      당신은 전공 서적 전문 에디터이자 최고의 노트 정리 전문가입니다. 
      아래 제공된 **"학습 자료 전체 분석 내용(Material Analysis)"**을 바탕으로 **완벽하고 상세한 학습 대본(Detailed Study Guide)**을 작성하십시오.
      
      [핵심 요구사항 - 반드시 준수]:
      1. **절대 요약하지 마십시오**: 내용을 줄이려 하지 말고, 오히려 교과서보다 더 친절하고 자세하게 서술하십시오.
      2. **생략 금지**: 분석 데이터에 있는 모든 예시, 수치, 도표의 의미, 예외 사항을 전부 포함하십시오. "등등"으로 얼버무리지 마십시오.
      3. **분량 극대화**: 사용자가 이 글만 읽고도 시험 만점을 받을 수 있도록 풍부한 설명을 덧붙이십시오.
      4. **구조화**: Notion 스타일의 계층 구조(#, ##, ###)를 사용하여 깊이 있게 정리하십시오.
      
      [형식 가이드]:
      - **정의(Definition)**: 개념의 정의는 명확한 문장으로 서술하십시오.
      - **예시(Example)**: 추상적인 개념 뒤에는 반드시 구체적인 예시를 별도 항목으로 작성하십시오.
      - **비교(Comparison)**: 헷갈리기 쉬운 개념은 반드시 마크다운 표(| Table |)로 비교 정리하십시오.
      - **심화(Deep Dive)**: 단순 암기 사항 외에 '왜 그런지(Why)'에 대한 원리 설명 섹션을 추가하십시오.
      - **강조**: 중요한 키워드는 **굵게**, 주의사항은 ⚠️ 이모지와 함께 인용구(>)로 표시하십시오.

      [추가 요청사항]:
      ${additionalInstructions}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ role: 'user', parts: [{ text: prompt }, { text: `[전체 자료 분석 데이터 - 이 내용을 전부 풀어서 쓰세요]:\n${materialAnalysis}` }] }]
        });
        return response.text || "요약 생성 실패";
    } catch (e) {
        console.error(`Summary generation error`, e);
        return "요약 생성 중 오류가 발생했습니다.";
    }
};

export const generateExamFeedback = async (
    questions: Question[], 
    userAnswers: UserAnswer[],
    userApiKey?: string
): Promise<string> => {
    const ai = getAiClient(userApiKey);

    // Filter only wrong answers or significant questions
    const wrongQuestions = questions.filter(q => {
        const ua = userAnswers.find(a => a.questionId === q.id);
        const isCorrect = ua && ua.answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
        return !isCorrect;
    });

    if (wrongQuestions.length === 0) {
        return "# 🎉 완벽합니다!\n\n틀린 문제가 없습니다. 학습한 내용이 완벽하게 숙지되었습니다.";
    }

    const prompt = `
      학생이 시험에서 다음 문제들을 틀렸습니다. 
      **틀린 문제들과 관련된 핵심 개념을 중심으로 상세한 복습 가이드**를 작성해주십시오.
      
      [형식 요구사항]:
      1. **Notion 스타일**의 마크다운(Markdown)을 사용하십시오.
      2. 틀린 문제별로 단순히 해설을 나열하지 말고, **부족한 개념(Concept)** 위주로 챕터를 나누어 설명하십시오.
      3. **굵게(Bold)**, 마크다운 표(| Table |), 이모지(💡, ⚠️)를 사용하여 가독성을 극대화하십시오.
      4. 개념 간의 차이점을 명확히 하기 위해 비교표를 적극적으로 사용하십시오.

      [틀린 문제 데이터]:
      ${JSON.stringify(wrongQuestions.map(q => ({
          question: q.questionText,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation
      })), null, 2)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ parts: [{ text: prompt }] }]
        });
        return response.text || "피드백 생성에 실패했습니다.";
    } catch (e) {
        console.error("Feedback generation error", e);
        return "피드백 생성 중 오류가 발생했습니다.";
    }
};

export const generateSimilarProblem = async (originalQuestion: Question, materials: FileData[], userApiKey?: string): Promise<Question | null> => {
  const ai = getAiClient(userApiKey);
  
  const prompt = `
    사용자가 다음 문제를 틀렸습니다. 동일한 개념을 테스트하지만 다른 값이나 맥락을 가진 **새로운 유사 문제 1개**를 한국어로 만들어주세요.
    단순히 숫자만 바꾸지 말고, 문제의 상황이나 예시를 변경하여 개념 이해도를 확실히 체크할 수 있게 하세요.
    절대 파일 포맷이나 PDF 구조에 대한 메타데이터 문제를 내지 마십시오. 교과 내용에 집중하세요.
    
    원래 문제: ${originalQuestion.questionText}
    원래 유형: ${originalQuestion.type}
    원래 해설: ${originalQuestion.explanation}
    
    JSON 형식으로 반환해주세요.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.INTEGER },
                type: { type: Type.STRING, enum: [QuestionType.MULTIPLE_CHOICE, QuestionType.SHORT_ANSWER, QuestionType.SUBJECTIVE] },
                questionText: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
                explanation: { type: Type.STRING }
            },
            required: ["questionText", "correctAnswer", "explanation"]
        }
    }
  });

  const jsonStr = response.text;
  if (!jsonStr) return null;
  return JSON.parse(jsonStr);
};

export const askAiTutor = async (
    history: { role: 'user' | 'model'; text: string }[],
    newMessage: string,
    contextQuestion?: Question,
    userApiKey?: string
): Promise<string> => {
    const ai = getAiClient(userApiKey);
    
    let systemInstruction = "당신은 친절하고 격려해주는 AI 튜터입니다. 개념을 명확하게 설명해주세요. 한국어로 답변하세요.";
    systemInstruction += " 답변 시 '###' 같은 마크다운 헤더 문법은 절대 사용하지 마세요. 가독성을 위해 불필요한 기호 없이 편안한 줄글과 글머리 기호(-), 굵은 글씨(**)만 사용하세요.";

    if (contextQuestion) {
        systemInstruction += ` 사용자는 다음 시험 문제에 대해 질문하고 있습니다: "${contextQuestion.questionText}". 정답은 "${contextQuestion.correctAnswer}"입니다. 해설: "${contextQuestion.explanation}".`;
    }

    const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: { systemInstruction }
    });
    
    const response = await chat.sendMessage({
        message: newMessage
    });

    return response.text || "답변을 생성할 수 없습니다.";
};