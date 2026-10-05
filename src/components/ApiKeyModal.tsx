import React, { useState } from 'react';
import { Key, Eye, EyeOff, Check, X, ExternalLink, ShieldCheck, Trash2, Sparkles, RefreshCw } from 'lucide-react';
import { getUserGeminiKey, setUserGeminiKey } from '../services/apiClient';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState<string>(() => getUserGeminiKey());
  const [showKey, setShowKey] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleSave = () => {
    setUserGeminiKey(apiKey);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleRemove = () => {
    setUserGeminiKey('');
    setApiKey('');
    setTestStatus('idle');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setTestStatus('error');
      setTestMessage('테스트할 API 키를 입력해주세요.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Gemini API 키 연결을 검증하는 중입니다...');

    try {
      const res = await fetch('/api/dictionary/lookup?word=hello', {
        headers: {
          'x-gemini-api-key': apiKey.trim(),
        },
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setTestStatus('success');
        setTestMessage('연결 성공! 유효한 Gemini API 키입니다.');
      } else {
        setTestStatus('error');
        setTestMessage(data.error || 'API 키 검증에 실패했습니다. 키를 확인해주세요.');
      }
    } catch (e: any) {
      setTestStatus('error');
      setTestMessage('연결 테스트 중 오류가 발생했습니다.');
    }
  };

  const hasCustomKey = Boolean(getUserGeminiKey());

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-6 animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  개인 Gemini API 키 설정 (BYOK)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  Bring Your Own Key
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                개인 단독 사용 시 자신만의 Gemini API 키를 등록하여 이용합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Key Status Card */}
        <div className={`p-4 rounded-2xl border ${hasCustomKey ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/30 text-emerald-800 dark:text-emerald-300' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xs">
              <ShieldCheck className={`w-4 h-4 ${hasCustomKey ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span>현재 사용 중인 API 키 방식:</span>
            </div>
            <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${hasCustomKey ? 'bg-emerald-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
              {hasCustomKey ? '개인 전용 API Key' : '서버 공유 기본 Key'}
            </span>
          </div>
        </div>

        {/* Info & Get Key Link */}
        <div className="space-y-2 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 p-4 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              무료 Gemini API Key 발급받기
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1 text-[11px] transition-colors"
            >
              <span>AI Studio 열기</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-[11px] leading-relaxed text-indigo-700 dark:text-indigo-300">
            Google AI Studio에서 구글 계정으로 로그인 후 1분 만에 무료 API Key를 발급받으실 수 있습니다.
          </p>
        </div>

        {/* Input Field */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Gemini API Key 입력:</span>
            <span className="text-[10px] text-slate-400 font-normal">예: AIzaSy...</span>
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy로 시작하는 Gemini API Key를 붙여넣으세요"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Test Result Indicator */}
        {testStatus !== 'idle' && (
          <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            testStatus === 'testing'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
              : testStatus === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
          }`}>
            {testStatus === 'testing' && <RefreshCw className="w-4 h-4 animate-spin" />}
            {testStatus === 'success' && <Check className="w-4 h-4 text-emerald-500" />}
            {testStatus === 'error' && <X className="w-4 h-4 text-rose-500" />}
            <span>{testMessage}</span>
          </div>
        )}

        {/* Security Note */}
        <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
          🔒 <strong>보안 안내:</strong> 입력하신 API Key는 외부 서버로 보관되지 않으며, 사용자의 브라우저 내 안전한 이격 공간(localStorage)에만 저장되어 API 호출 헤더로만 전달됩니다.
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            {hasCustomKey && (
              <button
                onClick={handleRemove}
                className="px-3 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>키 삭제</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestKey}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold transition-all"
            >
              연결 테스트
            </button>

            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-all"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>저장 완료!</span>
                </>
              ) : (
                <span>저장하기</span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
