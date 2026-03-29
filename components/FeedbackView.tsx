import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, ArrowLeft, Lightbulb } from 'lucide-react';

interface FeedbackViewProps {
  feedback: string;
  onBack: () => void;
}

const FeedbackView: React.FC<FeedbackViewProps> = ({ feedback, onBack }) => {
  const handleCopy = () => {
    // For Notion, copying plain text Markdown often works best as Notion auto-converts it.
    // However, some browsers/OS combinations work better if we just write text.
    navigator.clipboard.writeText(feedback).then(() => {
        alert("복사되었습니다! Notion에 'Ctrl+V' (또는 Cmd+V) 하세요. 마크다운 형식이 자동으로 적용됩니다.");
    });
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
        <div className="flex justify-between items-center mb-6">
            <button 
                onClick={onBack}
                className="flex items-center text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
            >
                <ArrowLeft className="w-5 h-5 mr-2" />
                돌아가기
            </button>
            <button 
                onClick={handleCopy}
                className="flex items-center px-4 py-2 bg-black dark:bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-indigo-700 shadow-lg transition-colors"
            >
                <Copy className="w-4 h-4 mr-2" />
                Notion용 복사하기
            </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 border-b border-indigo-100 dark:border-indigo-800 flex items-center gap-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-800 rounded-full text-indigo-600 dark:text-indigo-300">
                    <Lightbulb className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI 맞춤형 오답 노트</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">틀린 문제를 기반으로 생성된 핵심 개념 정리입니다.</p>
                </div>
            </div>
            
            <div className="p-8 md:p-12 min-h-[60vh]">
                <article className="markdown-body dark:text-gray-200">
                    <ReactMarkdown>{feedback}</ReactMarkdown>
                </article>
            </div>
        </div>
    </div>
  );
};

export default FeedbackView;