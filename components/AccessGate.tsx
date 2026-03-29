import React, { useState, useEffect } from 'react';
import { Key, Lock, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { setCustomApiKey } from '../services/geminiService';

interface AccessGateProps {
  onAuthorized: () => void;
}

const AccessGate: React.FC<AccessGateProps> = ({ onAuthorized }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedAccess = localStorage.getItem('app_access_granted');
    const savedKey = localStorage.getItem('custom_gemini_api_key');
    
    if (savedAccess === 'true') {
      if (savedKey) {
        setCustomApiKey(savedKey);
      }
      onAuthorized();
    }
  }, [onAuthorized]);

  const handleVerify = () => {
    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      const trimmedInput = input.trim();
      
      if (trimmedInput === '8187') {
        // Access granted with default key
        localStorage.setItem('app_access_granted', 'true');
        localStorage.removeItem('custom_gemini_api_key');
        setCustomApiKey(null);
        onAuthorized();
      } else if (trimmedInput.startsWith('AIza') && trimmedInput.length > 20) {
        // Access granted with custom API key
        localStorage.setItem('app_access_granted', 'true');
        localStorage.setItem('custom_gemini_api_key', trimmedInput);
        setCustomApiKey(trimmedInput);
        onAuthorized();
      } else {
        setError('올바른 비밀번호 또는 API 키를 입력해주세요.');
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-6">
            <Lock className="w-8 h-8" />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            접근 권한 확인
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            프로그램을 사용하려면 비밀번호 또는 <br />
            본인의 Gemini API 키를 입력해주세요.
          </p>

          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Key className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="password"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                placeholder="비밀번호 또는 API 키"
                className="block w-full pl-11 pr-4 py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={isLoading || !input.trim()}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-semibold rounded-2xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>입장하기</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="text-left">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">보안 안내</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                입력하신 API 키는 브라우저의 로컬 스토리지에만 저장되며, 외부 서버로 전송되지 않습니다. 
                비밀번호를 아시는 경우 별도의 키 없이 사용 가능합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessGate;
