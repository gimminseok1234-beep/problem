import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, ArrowLeft, Download } from 'lucide-react';

interface SummaryViewProps {
  summary: string;
  onBack: () => void;
}

const SummaryView: React.FC<SummaryViewProps> = ({ summary, onBack }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(summary).then(() => {
        alert("복사되었습니다! Notion에 'Ctrl+V' (또는 Cmd+V) 하세요. 마크다운 형식이 자동으로 적용됩니다.");
    });
  };

  const handleDownload = () => {
    const blob = new Blob([summary], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Study_Summary.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
        <div className="flex justify-between items-center mb-6">
            <button 
                onClick={onBack}
                className="flex items-center text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
            >
                <ArrowLeft className="w-5 h-5 mr-2" />
                돌아가기
            </button>
            <div className="flex gap-3">
                <button 
                    onClick={handleDownload}
                    className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200 shadow-sm transition-colors"
                >
                    <Download className="w-4 h-4 mr-2" />
                    MD 파일 저장
                </button>
                <button 
                    onClick={handleCopy}
                    className="flex items-center px-4 py-2 bg-black dark:bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-emerald-700 shadow-lg transition-colors"
                >
                    <Copy className="w-4 h-4 mr-2" />
                    복사하기 (Notion용)
                </button>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 md:p-12 min-h-[70vh] border border-gray-100 dark:border-gray-700">
            <article className="markdown-body dark:text-gray-200">
                <ReactMarkdown>{summary}</ReactMarkdown>
            </article>
        </div>
    </div>
  );
};

export default SummaryView;