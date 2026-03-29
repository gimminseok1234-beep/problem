import React, { useState } from 'react';
import { SavedExam, SavedSummary, User } from '../types';
import { FileText, BrainCircuit, Trash2, Edit2, Play, Eye, Plus, Calendar, RefreshCw, Copy } from 'lucide-react';

interface DashboardProps {
  user?: User | null;
  savedExams: SavedExam[];
  savedSummaries: SavedSummary[];
  onStartExam: (exam: SavedExam) => void;
  onRetakeExam: (exam: SavedExam) => void;
  onViewSummary: (summary: SavedSummary) => void;
  onDeleteExam: (id: string) => void;
  onDeleteSummary: (id: string) => void;
  onRenameExam: (id: string, newName: string) => void;
  onRenameSummary: (id: string, newName: string) => void;
  onNew: () => void;
  onReuseProject: (exam: SavedExam) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    user, savedExams, savedSummaries, 
    onStartExam, onRetakeExam, onViewSummary, 
    onDeleteExam, onDeleteSummary, 
    onRenameExam, onRenameSummary,
    onNew, onReuseProject
}) => {
  const [activeTab, setActiveTab] = useState<'exams' | 'summaries'>('exams');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const saveEdit = () => {
    if (activeTab === 'exams') {
        onRenameExam(editingId!, editName);
    } else {
        onRenameSummary(editingId!, editName);
    }
    setEditingId(null);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex justify-between items-end mb-8">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">안녕하세요, {user ? user.name : '게스트'}님! 👋</h1>
            <p className="text-gray-500 dark:text-gray-400">나만의 학습 보관함입니다.</p>
        </div>
        <button 
            onClick={onNew}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg transition-transform hover:scale-105"
        >
            <Plus className="w-5 h-5" /> 새로 만들기
        </button>
      </div>

      <div className="flex gap-6 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button 
            onClick={() => setActiveTab('exams')}
            className={`pb-4 px-2 font-medium text-sm flex items-center gap-2 transition-colors relative ${activeTab === 'exams' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
            <BrainCircuit className="w-4 h-4" /> 나의 시험지
            {activeTab === 'exams' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />}
        </button>
        <button 
            onClick={() => setActiveTab('summaries')}
            className={`pb-4 px-2 font-medium text-sm flex items-center gap-2 transition-colors relative ${activeTab === 'summaries' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
            <FileText className="w-4 h-4" /> 학습 정리본
            {activeTab === 'summaries' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-t-full" />}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {activeTab === 'exams' ? (
            savedExams.length === 0 ? (
                <div className="col-span-full py-20 text-center text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                    <BrainCircuit className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>저장된 시험지가 없습니다.<br/>새로 만들기를 눌러 시작해보세요!</p>
                </div>
            ) : (
                savedExams.map(exam => {
                    const hasProgress = exam.userAnswers && exam.userAnswers.length > 0;
                    const canReuse = !!(exam.styleAnalysis && exam.materialAnalysis);

                    return (
                        <div key={exam.id} className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col min-h-[300px] relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                                <button onClick={() => startEditing(exam.id, exam.title)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => onDeleteExam(exam.id)} className="p-2 bg-red-50 dark:bg-red-900/30 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex-1 flex flex-col justify-center items-center text-center w-full">
                                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                                    <BrainCircuit className="w-8 h-8" />
                                </div>
                                
                                {editingId === exam.id ? (
                                    <input 
                                        autoFocus
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={saveEdit}
                                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                        className="w-full text-center font-bold bg-gray-50 dark:bg-gray-700 rounded px-2 py-1 outline-none"
                                    />
                                ) : (
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 mb-2 px-2">{exam.title}</h3>
                                )}
                                
                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(exam.createdAt).toLocaleDateString()}
                                </div>
                                <span className="text-xs font-medium bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300 mb-4">
                                    {exam.questions.length} 문제
                                </span>
                            </div>

                            <div className="mt-auto space-y-2 w-full">
                                {hasProgress ? (
                                    <div className="flex gap-2 w-full">
                                         <button 
                                            onClick={() => onStartExam(exam)}
                                            className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs"
                                            title="기존 답안 유지"
                                        >
                                            <Eye className="w-3 h-3" /> 기록 열람
                                        </button>
                                        <button 
                                            onClick={() => onRetakeExam(exam)}
                                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors text-xs"
                                            title="답안 초기화 후 다시 풀기"
                                        >
                                            <RefreshCw className="w-3 h-3" /> 재시험
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => onStartExam(exam)}
                                        className="w-full py-3 bg-gray-900 dark:bg-blue-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-800 dark:hover:bg-blue-700 transition-colors text-sm"
                                    >
                                        <Play className="w-4 h-4" /> 시험 시작
                                    </button>
                                )}

                                {canReuse && (
                                    <button 
                                        onClick={() => onReuseProject(exam)}
                                        className="w-full py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-xs border border-indigo-100 dark:border-indigo-800"
                                    >
                                        <Copy className="w-3 h-3" /> 이 소스로 새 문제 만들기
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })
            )
        ) : (
            savedSummaries.length === 0 ? (
                <div className="col-span-full py-20 text-center text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>저장된 정리본이 없습니다.</p>
                </div>
            ) : (
                savedSummaries.map(summary => (
                    <div key={summary.id} className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col aspect-square relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                             <button onClick={() => startEditing(summary.id, summary.title)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300">
                                <Edit2 className="w-4 h-4" />
                             </button>
                             <button onClick={() => onDeleteSummary(summary.id)} className="p-2 bg-red-50 dark:bg-red-900/30 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500">
                                <Trash2 className="w-4 h-4" />
                             </button>
                        </div>

                        <div className="flex-1 flex flex-col justify-center items-center text-center">
                             <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
                                <FileText className="w-8 h-8" />
                            </div>

                            {editingId === summary.id ? (
                                <input 
                                    autoFocus
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onBlur={saveEdit}
                                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                    className="w-full text-center font-bold bg-gray-50 dark:bg-gray-700 rounded px-2 py-1 outline-none"
                                />
                            ) : (
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 mb-2 px-2">{summary.title}</h3>
                            )}

                             <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(summary.createdAt).toLocaleDateString()}
                            </div>
                        </div>

                        <button 
                            onClick={() => onViewSummary(summary)}
                            className="w-full mt-4 py-3 bg-gray-900 dark:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 dark:hover:bg-emerald-700 transition-colors"
                        >
                            <Eye className="w-4 h-4" /> 보기
                        </button>
                    </div>
                ))
            )
        )}
      </div>
    </div>
  );
};

export default Dashboard;