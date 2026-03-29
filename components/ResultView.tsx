import React, { useState } from 'react';
import { Question, UserAnswer, QuestionType } from '../types';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, ChevronDown, ChevronUp, HelpCircle, Eye, Sparkles, Check, X, Bot, MessageCircle } from 'lucide-react';
import { generateSimilarProblem } from '../services/geminiService';
import ChatAssistant from './ChatAssistant';

interface ResultViewProps {
  questions: Question[];
  userAnswers: UserAnswer[];
  onRetry: () => void;
  onGenerateFeedback: () => void;
  userApiKey?: string;
}

const ResultView: React.FC<ResultViewProps> = ({ questions, userAnswers, onRetry, onGenerateFeedback, userApiKey }) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [generatingSimilarId, setGeneratingSimilarId] = useState<number | null>(null);
  const [similarQuestions, setSimilarQuestions] = useState<Record<number, Question>>({});
  const [revealedSimilarAnswers, setRevealedSimilarAnswers] = useState<Record<number, boolean>>({});
  
  // Chat context
  const [activeChatQuestion, setActiveChatQuestion] = useState<Question | undefined>(undefined);
  
  // State to track which option explanation is being shown for each question
  const [selectedExplanationIndices, setSelectedExplanationIndices] = useState<Record<number, number>>({});

  // Helper to normalize text for comparison
  const normalizeText = (text: string) => {
      return text
        .replace(/[\u200B-\u200D\uFEFF]/g, "") 
        .replace(/[.,/#!$%^&*;:{}=\-_`~()\[\]]/g, "") 
        .replace(/\s+/g, "") 
        .toLowerCase();
  };

  /**
   * Finds the index of the correct option.
   * Priority: 1. `correctAnswerIndex` field (Data Integrity)
   *           2. Text Matching
   */
  const findCorrectOptionIndex = (q: Question): number => {
      if (!q.options || q.type !== QuestionType.MULTIPLE_CHOICE) return -1;
      
      // 1. Use Explicit Index (Most Reliable)
      if (typeof q.correctAnswerIndex === 'number' && q.correctAnswerIndex >= 0 && q.correctAnswerIndex < q.options.length) {
          return q.correctAnswerIndex;
      }

      // 2. Exact/Contains Normalized Match (Fallback)
      const normCorrect = normalizeText(q.correctAnswer);
      const exactIdx = q.options.findIndex(opt => normalizeText(opt) === normCorrect);
      if (exactIdx !== -1) return exactIdx;

      return -1;
  };

  /**
   * Finds the index of the option the user selected.
   */
  const findUserSelectedOptionIndex = (q: Question, userAnswerText: string): number => {
      if (!q.options || q.type !== QuestionType.MULTIPLE_CHOICE || !userAnswerText) return -1;
      
      const normUser = normalizeText(userAnswerText);
      return q.options.findIndex(opt => normalizeText(opt) === normUser);
  };

  const getResult = (q: Question) => {
    const ua = userAnswers.find(a => a.questionId === q.id);
    if (!ua || !ua.answer.trim()) return 'unanswered';
    
    if (q.type === QuestionType.SUBJECTIVE) return 'review';

    if (q.type === QuestionType.MULTIPLE_CHOICE && q.options) {
        const correctIdx = findCorrectOptionIndex(q);
        const userIdx = findUserSelectedOptionIndex(q, ua.answer);

        // [핵심 수정] 인덱스가 일치하면 무조건 정답
        if (correctIdx !== -1 && userIdx !== -1 && correctIdx === userIdx) {
             return 'correct';
        }
        
        // 인덱스를 못 찾았을 경우 최후의 수단으로 텍스트 직접 비교
        const userNorm = normalizeText(ua.answer);
        const correctNorm = normalizeText(q.correctAnswer);
        if (userNorm === correctNorm) return 'correct';
    } else {
        // 단답형/주관식
        if (normalizeText(ua.answer) === normalizeText(q.correctAnswer)) return 'correct';
    }
    
    return 'incorrect';
  };

  const score = questions.reduce((acc, q) => {
      const res = getResult(q);
      return acc + (res === 'correct' || res === 'review' ? 1 : 0);
  }, 0);
  
  const percentage = Math.round((score / questions.length) * 100);
  const strokeWidth = 10;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const toggleExpand = (id: number) => {
    if (expandedId === id) {
        setExpandedId(null);
        setActiveChatQuestion(undefined);
    } else {
        setExpandedId(id);
        setActiveChatQuestion(questions.find(q => q.id === id));
    }
  };

  const toggleSimilarAnswer = (qId: number) => {
      setRevealedSimilarAnswers(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleOptionExplain = (q: Question, index: number) => {
      setSelectedExplanationIndices(prev => ({ ...prev, [q.id]: index }));
  };

  const handleGenerateSimilar = async (e: React.MouseEvent, q: Question) => {
    e.stopPropagation();
    setGeneratingSimilarId(q.id);
    try {
        const newQ = await generateSimilarProblem(q, [], userApiKey); 
        if (newQ) {
            setSimilarQuestions(prev => ({ ...prev, [q.id]: { ...newQ, id: Date.now() } })); // Temp ID
        }
    } catch (err) {
        console.error("Error generating similar", err);
    } finally {
        setGeneratingSimilarId(null);
    }
  };

  const getOptionLabel = (index: number) => String.fromCharCode(65 + index);

  const getFormattedCorrectAnswer = (q: Question) => {
    if (q.type === QuestionType.MULTIPLE_CHOICE && q.options) {
        const idx = findCorrectOptionIndex(q);
        if (idx !== -1) {
            return `${getOptionLabel(idx)}) ${q.options[idx]}`; // Return the matched option text
        }
    }
    return q.correctAnswer;
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Score Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8 text-center border border-gray-100 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">시험 결과</h2>
        
        <div className="flex items-center justify-center mb-6">
            <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90 drop-shadow-md" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-gray-100 dark:text-gray-700" />
                    <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className={`text-blue-600 dark:text-blue-500 transition-all duration-1000 ease-out`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-gray-900 dark:text-white">{percentage}%</span>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">정답률</span>
                </div>
            </div>
        </div>

        <p className="text-gray-600 dark:text-gray-300 font-medium mb-8">
            총 <span className="font-bold text-gray-900 dark:text-white">{questions.length}</span>문제 중 <span className="font-bold text-blue-600 dark:text-blue-400">{score}</span>점 (주관식/검토 포함)
        </p>
        
        <div className="flex justify-center gap-4">
            <button onClick={onRetry} className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-gray-700 dark:text-gray-200 font-bold transition-colors">
                메인으로
            </button>
            <button onClick={onGenerateFeedback} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2 transition-transform hover:scale-105">
                <Sparkles className="w-4 h-4" />
                AI 오답 노트 & 피드백
            </button>
        </div>
      </div>

      {/* Question Review List */}
      <div className="space-y-4">
        {questions.map((q, idx) => {
            const result = getResult(q);
            const userAnswer = userAnswers.find(a => a.questionId === q.id)?.answer;
            const isExpanded = expandedId === q.id;
            const activeExplanationIndex = selectedExplanationIndices[q.id];
            
            // Identify the correct option index for this question
            const correctOptionIdx = findCorrectOptionIndex(q);

            let borderColor = 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500';
            if (isExpanded) borderColor = 'ring-2 ring-blue-500 border-transparent';

            // Determine specific explanation to show
            let specificExplanation = q.explanation;
            let explanationTitle = "전체 해설";
            
            if (activeExplanationIndex !== undefined && q.optionsExplanations && q.optionsExplanations[activeExplanationIndex]) {
                specificExplanation = q.optionsExplanations[activeExplanationIndex];
                explanationTitle = `${getOptionLabel(activeExplanationIndex)}번 선지 AI 분석`;
            }

            return (
                <div key={q.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all overflow-hidden ${borderColor}`}>
                    <div onClick={() => toggleExpand(q.id)} className="p-4 flex items-start gap-4 cursor-pointer">
                        <div className="mt-1">
                            {result === 'correct' ? <CheckCircle className="w-6 h-6 text-green-500" /> : 
                             result === 'review' ? <HelpCircle className="w-6 h-6 text-orange-500" /> :
                             <XCircle className="w-6 h-6 text-red-500" />}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-bold text-gray-400 dark:text-gray-500">문제 {idx + 1}</span>
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                            </div>
                            <h3 className="text-gray-800 dark:text-gray-200 font-bold line-clamp-2 md:line-clamp-none leading-relaxed">{q.questionText}</h3>
                        </div>
                    </div>

                    {isExpanded && (
                        <div className="bg-gray-50 dark:bg-gray-900 p-6 border-t border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
                            
                            {/* Options Display for Multiple Choice */}
                            {q.type === QuestionType.MULTIPLE_CHOICE && q.options && (
                                <div className="space-y-3 mb-6">
                                    {q.options.map((opt, optIdx) => {
                                        // Visual Selection Logic: Relaxed Matching
                                        const isSelected = userAnswer === opt || normalizeText(userAnswer || '') === normalizeText(opt);
                                        // Correctness Logic: Index Matching
                                        const isCorrect = optIdx === correctOptionIdx;
                                        
                                        // Default Style
                                        let optionClass = "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400";
                                        let icon = null;
                                        let label = null;
                                        let statusBorder = "";

                                        // Status Logic
                                        if (isCorrect) {
                                            // Correct Answer (ALWAYS Green)
                                            statusBorder = "border-2 border-green-500 dark:border-green-500";
                                            optionClass = "bg-green-50 dark:bg-green-900/10 text-gray-900 dark:text-white";
                                            label = <span className="text-[10px] font-bold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded ml-2">정답</span>;
                                            icon = <Check className="w-5 h-5 text-green-600 shrink-0" />;
                                            
                                            if (isSelected) {
                                                // Correct & Selected (User got it right)
                                                label = <span className="text-[10px] font-bold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded ml-2">내 정답</span>;
                                            }
                                        } else if (isSelected) {
                                            // Selected BUT Wrong (Red)
                                            statusBorder = "border-2 border-red-500 dark:border-red-500";
                                            optionClass = "bg-red-50 dark:bg-red-900/10 text-gray-900 dark:text-white";
                                            label = <span className="text-[10px] font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded ml-2">내 답안 (오답)</span>;
                                            icon = <X className="w-5 h-5 text-red-500 shrink-0" />;
                                        }

                                        // Active explanation highlight
                                        const isActiveExplanation = activeExplanationIndex === optIdx;
                                        if (isActiveExplanation) {
                                            optionClass += " ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-900";
                                        }

                                        return (
                                            <div 
                                                key={optIdx} 
                                                className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center gap-3 transition-all ${optionClass} ${statusBorder}`}
                                            >
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className="min-w-[24px] font-bold pt-0.5 sm:pt-0">{getOptionLabel(optIdx)}.</div>
                                                    <div className="flex-1 text-sm font-medium">
                                                        {opt}
                                                        {label}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-2 mt-2 sm:mt-0 ml-8 sm:ml-0">
                                                    {icon}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOptionExplain(q, optIdx);
                                                        }}
                                                        className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors ${
                                                            isActiveExplanation 
                                                            ? 'bg-indigo-600 text-white shadow-md' 
                                                            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900'
                                                        }`}
                                                    >
                                                        <Bot className="w-3 h-3" />
                                                        {isActiveExplanation ? '해설 보는 중' : 'AI 해설'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Answer Details (Legacy view for SA/Subj) */}
                            {q.type !== QuestionType.MULTIPLE_CHOICE && (
                                <div className="grid md:grid-cols-2 gap-6 mb-6">
                                    <div className={`p-4 rounded-lg border ${result === 'correct' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : result === 'review' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                                        <span className="block text-xs font-bold uppercase tracking-wide opacity-60 mb-1 dark:text-gray-300">내 답안</span>
                                        <p className="font-medium dark:text-white whitespace-pre-wrap">{userAnswer || '(답안 없음)'}</p>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-lg">
                                        <span className="block text-xs font-bold uppercase tracking-wide opacity-60 mb-1 text-blue-800 dark:text-blue-300">정답 (모범 답안)</span>
                                        <p className="font-medium text-blue-900 dark:text-blue-100 whitespace-pre-wrap">{getFormattedCorrectAnswer(q)}</p>
                                    </div>
                                </div>
                            )}

                            {/* Explanation Box */}
                            <div className="mb-6 animate-in fade-in slide-in-from-bottom-2">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 transition-all">
                                    <AlertCircle className="w-4 h-4 text-indigo-500" /> 
                                    <span className={explanationTitle !== "전체 해설" ? "text-indigo-600 dark:text-indigo-400" : ""}>
                                        {explanationTitle}
                                    </span>
                                </h4>
                                <div className={`text-gray-600 dark:text-gray-300 text-sm leading-relaxed p-4 rounded-lg border min-h-[80px] transition-all duration-300 ${
                                    explanationTitle !== "전체 해설" 
                                    ? "bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800" 
                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                }`}>
                                    {specificExplanation || (
                                        <div className="flex flex-col items-center justify-center h-full py-4 text-gray-400">
                                            <MessageCircle className="w-6 h-6 mb-2 opacity-50" />
                                            <p>해당 선지에 대한 별도 해설이 없습니다.</p>
                                            <button 
                                                onClick={() => {
                                                    setActiveChatQuestion(q);
                                                }}
                                                className="mt-2 text-xs text-indigo-500 hover:underline"
                                            >
                                                AI 튜터에게 물어보기
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-3">
                                {result === 'incorrect' && !similarQuestions[q.id] && (
                                    <button 
                                        onClick={(e) => handleGenerateSimilar(e, q)}
                                        disabled={generatingSimilarId === q.id}
                                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 dark:text-white disabled:opacity-50"
                                    >
                                        {generatingSimilarId === q.id ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <RefreshCw className="w-4 h-4" />
                                        )}
                                        유사 문제 연습하기
                                    </button>
                                )}
                            </div>

                            {/* Generated Similar Question */}
                            {similarQuestions[q.id] && (
                                <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                                    <span className="inline-block bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 text-xs font-bold px-2 py-1 rounded mb-3">보너스 문제</span>
                                    <p className="font-bold text-gray-800 dark:text-gray-200 mb-4">{similarQuestions[q.id].questionText}</p>
                                    
                                    {similarQuestions[q.id].type === QuestionType.MULTIPLE_CHOICE && similarQuestions[q.id].options?.map((opt, i) => (
                                        <div key={i} className="ml-4 mb-2 text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                                            <span className="font-semibold text-gray-500">{getOptionLabel(i)})</span>
                                            {opt}
                                        </div>
                                    ))}

                                    <div className="mt-4">
                                        {!revealedSimilarAnswers[q.id] ? (
                                             <button 
                                                onClick={() => toggleSimilarAnswer(q.id)}
                                                className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 font-medium"
                                             >
                                                 <Eye className="w-4 h-4" /> 정답 보기
                                             </button>
                                        ) : (
                                            <div className="animate-in fade-in slide-in-from-top-1">
                                                <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded text-sm text-purple-900 dark:text-purple-100 border border-purple-100 dark:border-purple-800 mb-2">
                                                    <span className="font-bold">정답: </span> {getFormattedCorrectAnswer(similarQuestions[q.id])}
                                                </div>
                                                <div className="p-3 bg-white dark:bg-gray-800 rounded text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                                    <span className="font-bold block mb-1">해설:</span>
                                                    {similarQuestions[q.id].explanation}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        })}
      </div>
      
      <ChatAssistant contextQuestion={activeChatQuestion} userApiKey={userApiKey} />
    </div>
  );
};

export default ResultView;