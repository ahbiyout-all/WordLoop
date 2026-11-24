import React, { useEffect, useState } from 'react';
import {
  Key,
  Eye,
  EyeOff,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Trash2,
  Sparkles,
  RefreshCw,
  Globe,
  Cpu,
} from 'lucide-react';
import {
  AI_ENGINE_LABELS,
  AiEngineMode,
  getAiEngineMode,
  getUserGeminiKey,
  setAiEngineMode,
  setUserGeminiKey,
} from '../services/apiClient';
import { testFreeAiConnection } from '../services/freeAiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ENGINE_ORDER: AiEngineMode[] = [
  'auto_free',
  'kilo_free',
  'ovhcloud_free',
  'pollinations',
  'cloudflare_free',
  'llm7_free',
  'mlvoca',
  'chrome_builtin',
  'gemini_byok',
];

const ENGINE_CONNECTION_TAG: Record<AiEngineMode, { label: string; style: string }> = {
  auto_free: {
    label: 'API 키 불필요 · 7중 자동 체인',
    style: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
  kilo_free: {
    label: '무료 · 서버 프록시 (시간당 200회)',
    style: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
  ovhcloud_free: {
    label: '무료 · 브라우저 직결 (EU 클라우드)',
    style: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
  pollinations: {
    label: '무료 · 브라우저 직결',
    style: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
  cloudflare_free: {
    label: '무료 · 브라우저 직결',
    style: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
  llm7_free: {
    label: '무료 · 브라우저 직결',
    style: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
  mlvoca: {
    label: '무료 · 서버 프록시',
    style: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
  chrome_builtin: {
    label: '무료 · 기기 내장 온디바이스',
    style: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  },
  gemini_byok: {
    label: '개인 키 전용 (BYOK)',
    style: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  },
};

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [selectedEngine, setSelectedEngine] = useState<AiEngineMode>(() => getAiEngineMode());
  const [apiKey, setApiKey] = useState<string>(() => getUserGeminiKey());
  const [showKey, setShowKey] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedEngine(getAiEngineMode());
      setApiKey(getUserGeminiKey());
      setTestStatus('idle');
      setTestMessage('');
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectEngine = (mode: AiEngineMode) => {
    setSelectedEngine(mode);
    setAiEngineMode(mode);
    setTestStatus('idle');
    setTestMessage('');
  };

  const handleSave = () => {
    setAiEngineMode(selectedEngine);
    setUserGeminiKey(apiKey);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleRemove = () => {
    setUserGeminiKey('');
    setApiKey('');
    if (selectedEngine === 'gemini_byok') {
      setSelectedEngine('auto_free');
      setAiEngineMode('auto_free');
    }
    setTestStatus('idle');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestFreeAi = async () => {
    setTestStatus('testing');
    setTestMessage(
      `${AI_ENGINE_LABELS[selectedEngine === 'gemini_byok' ? 'auto_free' : selectedEngine].badge} 무료 AI 엔진 연결을 테스트하는 중입니다...`
    );

    const targetMode: AiEngineMode =
      selectedEngine === 'gemini_byok' ? 'auto_free' : selectedEngine;
    const result = await testFreeAiConnection(targetMode);

    if (result.success) {
      setTestStatus('success');
      setTestMessage(result.message);
    } else {
      setTestStatus('error');
      setTestMessage(result.message);
    }
  };

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setTestStatus('error');
      setTestMessage('테스트할 Gemini API 키를 입력하거나 위의 [무료 AI 연결 테스트]를 이용해 주세요.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Gemini API 키 연결을 검증하는 중입니다...');

    try {
      let isSuccess = false;
      let errMsg = '';
      let serverRespondedExplicitly = false;

      try {
        const res = await fetch('/api/dictionary/lookup?word=hello', {
          headers: {
            'x-gemini-api-key': apiKey.trim(),
            'x-ai-engine': 'gemini_byok',
          },
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          serverRespondedExplicitly = true;
          const data = await res.json().catch(() => ({}));
          if (res.status === 401 || res.status === 429) {
            errMsg = data?.error || `Gemini API 키 인증에 실패했습니다. (HTTP ${res.status})`;
          } else if (
            res.ok &&
            data?.success &&
            Array.isArray(data?.sourcesUsed) &&
            data.sourcesUsed.some((s: unknown) => typeof s === 'string' && s.includes('Gemini'))
          ) {
            isSuccess = true;
          } else {
            errMsg = data?.error || '입력하신 Gemini API 키로 응답을 검증하지 못했습니다.';
          }
        }
      } catch {
        // Server API not present (e.g. GitHub Pages) - proceed to direct test
      }

      if (!isSuccess && !serverRespondedExplicitly && !errMsg) {
        try {
          const directRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello' }] }] }),
            }
          );
          if (directRes.ok) {
            isSuccess = true;
          } else {
            const errData = await directRes.json().catch(() => ({}));
            errMsg = errData?.error?.message || `Google API 오류 (${directRes.status})`;
          }
        } catch (directErr: any) {
          errMsg = directErr?.message || '네트워크 연결 오류';
        }
      }

      if (isSuccess) {
        setTestStatus('success');
        setTestMessage('연결 성공! 유효한 Gemini API 키입니다.');
      } else {
        setTestStatus('error');
        setTestMessage(errMsg || 'API 키 검증에 실패했습니다. 키를 확인해주세요.');
      }
    } catch {
      setTestStatus('error');
      setTestMessage('연결 테스트 중 오류가 발생했습니다.');
    }
  };

  const hasCustomKey = Boolean(getUserGeminiKey().trim());

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-xl shadow-2xl space-y-5 my-auto max-h-[92dvh] overflow-y-auto animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  무료 AI 엔진 · API 키 설정
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  키 없이 무료 사용 가능
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                API 키가 없어도 전 세계 무료 오픈 AI로 롤플레잉·단어생성·발음 분석을 바로 이용할 수 있습니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Engine Status Card */}
        <div className="p-3.5 rounded-2xl border bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-500/30 text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>현재 선택된 AI 엔진:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950">
                {AI_ENGINE_LABELS[selectedEngine].badge}
              </span>
              {hasCustomKey && (
                <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-indigo-600 text-white">
                  + 개인 Gemini 키
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Engine Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-500" />
              <span>사용할 AI 엔진 방식 선택 (즉시 적용)</span>
            </span>
            <button
              type="button"
              onClick={handleTestFreeAi}
              disabled={testStatus === 'testing'}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-extrabold transition-colors cursor-pointer disabled:opacity-50"
            >
              무료 AI 연결 테스트
            </button>
          </div>

          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
            {ENGINE_ORDER.map((mode) => {
              const info = AI_ENGINE_LABELS[mode];
              const connTag = ENGINE_CONNECTION_TAG[mode];
              const isSelected = selectedEngine === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleSelectEngine(mode)}
                  className={`w-full p-3 rounded-2xl border text-left transition-all flex items-start justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/40'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {info.title}
                      </span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${connTag.style}`}>
                        {connTag.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {info.subtitle}
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional BYOK Gemini API Key Section */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="space-y-2 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 p-3.5 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                (선택) 개인 Gemini API Key 등록
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1 text-[11px] transition-colors shrink-0"
              >
                <span>AI Studio 열기</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] leading-relaxed text-indigo-700 dark:text-indigo-300">
              API 키를 등록하지 않아도 무료 AI를 바로 쓸 수 있습니다. 직접 녹음한 음성을 오디오 그대로 Gemini에게 청취시켜 교정받고 싶을 때만 개인 키를 입력하세요.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-500" />
                <span>Gemini API Key 입력 (선택 사항):</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">예: AIzaSy...</span>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="비워두면 API 키 없이 무료 오픈 AI가 동작합니다"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
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
        </div>

        {/* Test Result Indicator */}
        {testStatus !== 'idle' && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              testStatus === 'testing'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : testStatus === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
            }`}
          >
            {testStatus === 'testing' && <RefreshCw className="w-4 h-4 animate-spin shrink-0" />}
            {testStatus === 'success' && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
            {testStatus === 'error' && <X className="w-4 h-4 text-rose-500 shrink-0" />}
            <span>{testMessage}</span>
          </div>
        )}

        {/* Security Note */}
        <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
          🔒 <strong>보안 안내:</strong> 무료 AI 호출에는 어떤 개인 API 키도 전송되지 않으며, 개인 Gemini 키를 입력한 경우에도 브라우저 로컬 스토리지에만 보관되어 Google Gemini 호출 시에만 전달됩니다.
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            {hasCustomKey && (
              <button
                type="button"
                onClick={handleRemove}
                className="px-3 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>개인 키 삭제</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {apiKey.trim() && (
              <button
                type="button"
                onClick={handleTestKey}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Gemini 키 테스트
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>적용 완료!</span>
                </>
              ) : (
                <span>설정 적용하기</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
