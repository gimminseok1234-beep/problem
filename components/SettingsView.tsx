import React, { useState } from 'react';
import { Key, Save, ArrowLeft, Edit2, CheckCircle2 } from 'lucide-react';
import { saveUserApiKey } from '../services/firebase';

interface SettingsViewProps {
  userId: string;
  initialApiKey?: string;
  onSave: (apiKey: string) => void;
  onCancel: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ userId, initialApiKey, onSave, onCancel }) => {
  const [apiKey, setApiKey] = useState(initialApiKey || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(!initialApiKey);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('API 키를 입력해주세요.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await saveUserApiKey(userId, apiKey.trim());
      onSave(apiKey.trim());
    } catch (e) {
      console.error(e);
      setError('API 키 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (initialApiKey) {
      setIsEditing(false);
      setApiKey(initialApiKey);
      setError(null);
    } else {
      onCancel();
    }
  };

  const maskApiKey = (key: string) => {
    if (!key || key.length < 10) return '********';
    return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-4 mb-8 border-b border-gray-100 dark:border-gray-700 pb-4">
        <button onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Key className="w-6 h-6 text-blue-600" />
            설정
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI 기능을 사용하기 위한 API 키를 관리하세요.</p>
        </div>
      </div>

      <div className="space-y-6">
        {!isEditing ? (
          <div className="p-6 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-gray-800 dark:text-white">API 키가 등록되어 있습니다</h3>
                </div>
                <p className="text-sm font-mono text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-3 py-1 rounded inline-block">
                  {maskApiKey(initialApiKey || '')}
                </p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
              >
                <Edit2 className="w-4 h-4" />
                변경
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gemini API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                입력하신 API 키는 귀하의 구글 계정(Firestore)에 안전하게 저장되며, 다른 기기에서 로그인해도 계속 사용할 수 있습니다.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={handleCancelEdit}
                className="px-6 py-3 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !apiKey.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all flex items-center gap-2 disabled:opacity-50 disabled:shadow-none"
              >
                {isSaving ? '저장 중...' : (
                  <>
                    <Save className="w-5 h-5" />
                    적용하기
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
