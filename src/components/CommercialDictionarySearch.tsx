import React, { useState } from 'react';
import { Search, BookMarked, Sparkles, Volume2, Globe, Check, Loader2, Plus, Info, ShieldCheck, Database } from 'lucide-react';
import { VocabItem } from '../types';
import { speechService } from '../services/speechService';
import { lookupEmbeddedDict, EMBEDDED_DICTIONARY } from '../data/embeddedDictionary';
import { getAuthHeaders } from '../services/apiClient';

interface CommercialDictionarySearchProps {
  onAddVocab: (item: Omit<VocabItem, 'id'>) => void;
}

export const CommercialDictionarySearch: React.FC<CommercialDictionarySearchProps> = ({ onAddVocab }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAdded, setIsAdded] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchTerm.trim();
    if (!query) return;

    setLoading(true);
    setErrorMsg('');
    setResult(null);
    setIsAdded(false);

    // 1. Check embedded dictionary in code first
    const embeddedEntry = lookupEmbeddedDict(query);
    if (embeddedEntry) {
      setResult({
        word: embeddedEntry.word,
        ipa: embeddedEntry.ipa,
        koreanMeaning: embeddedEntry.koreanMeaning,
        partOfSpeech: embeddedEntry.partOfSpeech,
        nuanceTip: embeddedEntry.nuanceTip,
        examples: embeddedEntry.examples,
        englishDefinitions: [
          { definition: embeddedEntry.englishDefinition, example: embeddedEntry.examples[0]?.en },
        ],
        sourcesUsed: ['코드 내 내장 사전 (Pre-bundled Embedded Code Dictionary)', 'FreeDictionaryAPI / Gemini AI'],
        isEmbedded: true,
      });
      setLoading(false);
      return;
    }

    // 2. Fetch from Combined Server API if not found in embedded list
    try {
      const res = await fetch(`/api/dictionary/lookup?word=${encodeURIComponent(query)}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || '사전 검색 실패');
      }

      setResult(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || '사전 검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = () => {
    if (result?.audioUrl) {
      const audio = new Audio(result.audioUrl);
      audio.play().catch(() => {
        if (result?.word) {
          speechService.playItem(`dict-${result.word}`, result.word, result.koreanMeaning || result.meaning);
        }
      });
    } else if (result?.word) {
      speechService.playItem(`dict-${result.word}`, result.word, result.koreanMeaning || result.meaning);
    }
  };

  const handleAddToList = () => {
    if (!result) return;

    const firstExample = result.examples?.[0] || {
      en: `I studied the word ${result.word} today.`,
      ko: `나는 오늘 ${result.word} 단어를 공부했다.`,
    };

    onAddVocab({
      word: result.word,
      ipa: result.ipa || '',
      meaning: result.koreanMeaning || '',
      partOfSpeech: result.partOfSpeech || 'n.',
      sentence: firstExample.en,
      sentenceMeaning: firstExample.ko,
      categoryId: 'elementary',
      isCustom: true,
      tip: result.nuanceTip || undefined,
    });

    setIsAdded(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner explaining combined sources 1, 2, 5 */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex items-start justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold mb-2">
              <Database className="w-3.5 h-3.5" />
              <span>코드 내 사전 데이터 내장 + 오픈사전 (1+2+5) 결합</span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">
              내장 코드 사전 & 실시간 오픈사전 / AI 연동 검색
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              앱 코드 내에 필수 단어 사전 데이터베이스(IPA, 한국어 뜻, 품사, 예문, 뉘앙스)가 <strong>미리 탑재</strong>되어 있어 즉각 검색되며, 그 외 모든 단어는 <strong>FreeDictionaryAPI + Wiktionary + Gemini AI</strong> 결합 검색으로 자동 처리됩니다.
            </p>
          </div>
        </div>

        {/* Source Badges */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-400">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            ✓ 내장 코드 사전 (Offline-Ready)
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            ✓ 1. FreeDictionaryAPI (Open)
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            ✓ 2. Wiktionary CC-BY-SA
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            ✓ 5. Gemini AI Engine
          </span>
        </div>
      </div>

      {/* Search Input Form */}
      <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              placeholder="검색할 영단어를 입력하세요 (예: resilience, serendipity, negotiate)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>사전 검색</span>
          </button>
        </form>

        {/* Quick Example Tags from Embedded Dictionary */}
        <div className="mt-3 flex items-start gap-2 text-xs">
          <span className="text-slate-400 font-semibold shrink-0 mt-0.5">코드 내장 사전 단어:</span>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(EMBEDDED_DICTIONARY).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => {
                  setSearchTerm(w);
                }}
                className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 transition-all font-mono"
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Search Result Card */}
      {result && (
        <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-baseline gap-3">
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {result.word}
                </h3>
                {result.ipa && (
                  <span className="text-base font-mono text-slate-400">{result.ipa}</span>
                )}
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                  {result.partOfSpeech}
                </span>
              </div>

              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {result.koreanMeaning}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePlayAudio}
                className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all"
                title="음성 듣기"
              >
                <Volume2 className="w-5 h-5" />
              </button>

              <button
                onClick={handleAddToList}
                disabled={isAdded}
                className={`px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                  isAdded
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                }`}
              >
                {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{isAdded ? '암기장 추가 완료' : '내 단어장에 등록'}</span>
              </button>
            </div>
          </div>

          {/* Nuance & Usage Tip */}
          {result.nuanceTip && (
            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                <Sparkles className="w-4 h-4" />
                <span>원어민 활용 뉘앙스 & 발음 팁 (Gemini AI)</span>
              </div>
              <p className="text-xs text-purple-900 dark:text-purple-200 leading-relaxed">
                {result.nuanceTip}
              </p>
            </div>
          )}

          {/* Examples */}
          {result.examples && result.examples.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>대표 실용 예문</span>
              </h4>

              <div className="space-y-2">
                {result.examples.map((ex: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                    <p className="font-bold text-slate-900 dark:text-white">
                      "{ex.en}"
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      {ex.ko}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* English Definitions from FreeDictionaryAPI */}
          {result.englishDefinitions && result.englishDefinitions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">
                영영 정의 (FreeDictionaryAPI / Wiktionary)
              </h4>
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                {result.englishDefinitions.map((d: any, idx: number) => (
                  <div key={idx} className="flex gap-2">
                    <span className="font-semibold text-slate-400">{idx + 1}.</span>
                    <div>
                      <p className="text-slate-800 dark:text-slate-200 font-medium">{d.definition}</p>
                      {d.example && <p className="text-[11px] italic text-slate-400">e.g. "{d.example}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sources Badge Footer */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span>사용된 출처 데이터: {result.sourcesUsed.join(', ')}</span>
            <span className="text-emerald-500 font-semibold">상업용 앱 및 배포에 라이선스 안전</span>
          </div>

        </div>
      )}

    </div>
  );
};
