import React, { useState, useEffect, useRef } from 'react';
import { Question, QuestionType, UserAnswer } from '../types';
import { Circle, CheckCircle2, ChevronLeft, Save } from 'lucide-react';

interface ExamPaperProps {
  questions: Question[];
  initialAnswers?: UserAnswer[];
  onComplete: (answers: UserAnswer[]) => void;
  onSaveProgress: (answers: UserAnswer[]) => void;
  onExit: () => void;
}

const ExamPaper: React.FC<ExamPaperProps> = ({ questions, initialAnswers = [], onComplete, onSaveProgress, onExit }) => {
  // Initialize state with initialAnswers converted to record
  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    initialAnswers.forEach(a => {
      initial[a.questionId] = a.answer;
    });
    return initial;
  });

  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save logic
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    setIsSaving(true);
    timeoutRef.current = setTimeout(() => {
      const formattedAnswers: UserAnswer[] = Object.entries(answers).map(([key, value]) => ({
        questionId: Number(key),
        answer: value as string
      }));
      onSaveProgress(formattedAnswers);
      setIsSaving(false);
    }, 1000); // Debounce save by 1 second

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [answers, onSaveProgress]);

  const handleAnswerChange = (qId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = () => {
    if (confirm('시험을 제출하고 채점하시겠습니까?')) {
        const formattedAnswers: UserAnswer[] = Object.entries(answers).map(([key, value]) => ({
          questionId: Number(key),
          answer: value as string
        }));
        onComplete(formattedAnswers);
    }
  };

  const progress = Math.round((Object.keys(answers).length / questions.length) * 100);

  // Helper to get A, B, C, D labels
  const getOptionLabel = (index: number) => String.fromCharCode(65 + index);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur shadow-sm border-b border-gray-200 dark:border-gray-700 py-3 px-4 mb-8 flex justify-between items-center rounded-b-xl transition-all">
        <div className="flex items-center gap-4">
            <button 
                onClick={onExit}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-gray-300"
                title="저장하고 나가기"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    시험 진행 중
                    {isSaving && <span className="text-xs font-normal text-gray-400 flex items-center"><Save className="w-3 h-3 mr-1" /> 저장 중...</span>}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{Object.keys(answers).length} / {questions.length} 문제 풀이됨</p>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="hidden sm:block w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
            <button 
                onClick={handleSubmit}
                className="bg-black dark:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-blue-700 transition-colors shadow-lg"
            >
                채점하기
            </button>
        </div>
      </div>

      {/* Paper Content */}
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-xl min-h-[80vh] p-8 md:p-12 relative">
        <div className="border-b-2 border-gray-800 dark:border-gray-600 pb-6 mb-10 text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">종합 평가</h1>
            <p className="text-gray-500 dark:text-gray-400 italic">최선을 다해 모든 문제에 답해주세요. (자동 저장됨)</p>
        </div>

        <div className="space-y-12">
            {questions.map((q, index) => (
                <div key={q.id} className="exam-font">
                    <div className="flex gap-4 mb-4">
                        <span className="font-bold text-lg text-gray-400 dark:text-gray-500 select-none">Q{index + 1}.</span>
                        <div className="flex-1">
                            <p className="text-lg text-gray-900 dark:text-gray-100 leading-relaxed font-bold whitespace-pre-wrap">
                                {q.questionText.replace(/\*\*/g, '').replace(/\_\_/g, '')}
                                <span className="ml-2 text-xs font-normal text-gray-400 border border-gray-200 dark:border-gray-600 px-2 py-0.5 rounded-full align-middle inline-block">
                                    {q.type === QuestionType.MULTIPLE_CHOICE ? '객관식' : q.type === QuestionType.SHORT_ANSWER ? '단답형' : '주관식'}
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="pl-10">
                        {q.type === QuestionType.MULTIPLE_CHOICE && q.options ? (
                            <div className="space-y-3">
                                {q.options.map((opt, optIdx) => (
                                    <label key={optIdx} className="flex items-start gap-3 p-3 rounded-lg border border-transparent hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-200 dark:hover:border-gray-600 cursor-pointer transition-all group">
                                        <div className="relative flex items-center mt-0.5">
                                            <input 
                                                type="radio" 
                                                name={`q-${q.id}`} 
                                                value={opt}
                                                checked={answers[q.id] === opt}
                                                onChange={() => handleAnswerChange(q.id, opt)}
                                                className="peer sr-only"
                                            />
                                            <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600 peer-checked:text-blue-600 dark:peer-checked:text-blue-500 group-hover:text-gray-400" />
                                            <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-500 absolute opacity-0 peer-checked:opacity-100 transition-opacity scale-50 peer-checked:scale-100" />
                                        </div>
                                        <span className={`text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white ${answers[q.id] === opt ? 'font-medium text-gray-900 dark:text-white' : ''}`}>
                                            <span className="font-semibold mr-1">{getOptionLabel(optIdx)})</span> {opt}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-2">
                                <textarea 
                                    placeholder={q.type === QuestionType.SHORT_ANSWER ? "정답을 입력하세요..." : "서술형 답안을 작성하세요..."}
                                    value={answers[q.id] || ''}
                                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                    className={`w-full p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-sans dark:text-white ${q.type === QuestionType.SUBJECTIVE ? 'min-h-[150px]' : 'min-h-[60px]'}`}
                                />
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </div>
      
      <div className="h-20"></div> {/* Bottom spacer */}
    </div>
  );
};

export default ExamPaper;