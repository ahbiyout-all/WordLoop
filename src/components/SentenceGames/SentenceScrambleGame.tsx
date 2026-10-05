import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Volume2,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Shuffle,
  Lightbulb,
  Trophy,
  Flame,
  Award,
  HelpCircle,
  Play,
  Zap,
} from 'lucide-react';
import { SentenceItem } from '../../types';
import { speechService } from '../../services/speechService';

interface SentenceScrambleGameProps {
  sentences: SentenceItem[];
  gradeName: string;
  onUpdateHighScore?: (score: number) => void;
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
  onQuit?: () => void;
}

export const SentenceScrambleGame: React.FC<SentenceScrambleGameProps> = ({
  sentences,
  gradeName,
  onUpdateHighScore,
  onChangeMastery,
  onQuit,
}) => {
  const [shuffledSentences, setShuffledSentences] = useState<SentenceItem[]>(() => {
    const list = sentences.filter((s) => s.text && s.text.trim().split(/\s+/).length >= 3);
    return [...list].sort(() => 0.5 - Math.random());
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [placedWords, setPlacedWords] = useState<{ id: string; text: string }[]>([]);
  const [availableWords, setAvailableWords] = useState<{ id: string; text: string }[]>([]);
  const [status, setStatus] = useState<'playing' | 'correct' | 'wrong'>('playing');
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const list = sentences.filter((s) => s.text && s.text.trim().split(/\s+/).length >= 3);
    setShuffledSentences([...list].sort(() => 0.5 - Math.random()));
    setCurrentIndex(0);
  }, [sentences]);

  const currentSentence = shuffledSentences[currentIndex] || shuffledSentences[0];

  // Helper to split sentence into clean word tokens
  const cleanTokens = useMemo(() => {
    if (!currentSentence) return [];
    // Split by whitespace while preserving punctuation attached or separate
    return currentSentence.text.trim().split(/\s+/);
  }, [currentSentence]);

  // Initialize word tiles when current sentence changes
  const initSentence = useCallback(() => {
    if (!currentSentence) return;
    const tokens = currentSentence.text.trim().split(/\s+/);
    const tiles = tokens.map((token, idx) => ({
      id: `${token}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      text: token,
    }));

    // Shuffle tiles ensuring it's not in exact same order
    const shuffled = [...tiles].sort(() => 0.5 - Math.random());
    setAvailableWords(shuffled);
    setPlacedWords([]);
    setStatus('playing');
    setShowHint(false);
  }, [currentSentence]);

  useEffect(() => {
    initSentence();
  }, [initSentence]);

  // Word selection handlers
  const handleSelectWord = (wordObj: { id: string; text: string }) => {
    if (status === 'correct') return;
    setAvailableWords((prev) => prev.filter((w) => w.id !== wordObj.id));
    setPlacedWords((prev) => [...prev, wordObj]);
    setStatus('playing');
  };

  const handleRemoveWord = (wordObj: { id: string; text: string }) => {
    if (status === 'correct') return;
    setPlacedWords((prev) => prev.filter((w) => w.id !== wordObj.id));
    setAvailableWords((prev) => [...prev, wordObj]);
    setStatus('playing');
  };

  // Check answer
  const handleCheckAnswer = useCallback(() => {
    if (!currentSentence) return;
    const constructed = placedWords.map((w) => w.text).join(' ');
    const target = currentSentence.text.trim();

    // Standardize comparison
    const normConstructed = constructed.toLowerCase().replace(/[.,!?;:"']/g, '');
    const normTarget = target.toLowerCase().replace(/[.,!?;:"']/g, '');

    if (normConstructed === normTarget) {
      // Correct!
      setStatus('correct');
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      const points = 20 + nextCombo * 5;
      const nextScore = score + points;
      setScore(nextScore);
      if (onUpdateHighScore) onUpdateHighScore(nextScore);
      if (onChangeMastery) onChangeMastery(currentSentence.id, 2);

      // Play native audio
      speechService.speakOnce(currentSentence.text);
    } else {
      setStatus('wrong');
      setCombo(0);
    }
  }, [placedWords, currentSentence, combo, score, onUpdateHighScore, onChangeMastery]);

  // Auto-check when all words are placed
  useEffect(() => {
    if (availableWords.length === 0 && placedWords.length > 0 && status === 'playing') {
      handleCheckAnswer();
    }
  }, [availableWords.length, placedWords.length, status, handleCheckAnswer]);

  // Give hint: automatically place the next correct word
  const handleGiveHint = () => {
    if (status === 'correct' || !currentSentence) return;
    setShowHint(true);
    const targetWords = currentSentence.text.trim().split(/\s+/);
    const nextNeededIdx = placedWords.length;
    if (nextNeededIdx < targetWords.length) {
      const neededText = targetWords[nextNeededIdx];
      // Find in available
      const found = availableWords.find(
        (w) => w.text.toLowerCase().replace(/[.,!?;:"']/g, '') === neededText.toLowerCase().replace(/[.,!?;:"']/g, '')
      );
      if (found) {
        handleSelectWord(found);
      }
    }
  };

  // Next sentence
  const handleNext = () => {
    if (currentIndex + 1 < shuffledSentences.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Re-shuffle & restart
      setShuffledSentences((prev) => [...prev].sort(() => 0.5 - Math.random()));
      setCurrentIndex(0);
    }
  };

  const handlePlayAudio = () => {
    if (currentSentence) {
      speechService.speakOnce(currentSentence.text);
    }
  };

  if (!currentSentence) {
    return (
      <div className="p-8 text-center text-slate-500">
        학습 가능한 문장 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between max-w-3xl w-full mx-auto p-3 sm:p-4 space-y-3 select-none">
      {/* Top Header Stats */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-black text-xs">
            🧩 문장 {currentIndex + 1} / {shuffledSentences.length}
          </span>
          <span className="text-xs font-bold text-slate-500">({gradeName})</span>
        </div>

        <div className="flex items-center gap-2">
          {combo > 1 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-xs font-black animate-bounce">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{combo} COMBO!</span>
            </div>
          )}
          <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black text-xs flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>{score}점</span>
          </div>
        </div>
      </div>

      {/* Main Target Card: Korean Meaning & Context */}
      <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-2 relative overflow-hidden">
        <div className="flex items-center justify-center gap-2">
          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            한국어 문맥 해석
          </span>
          <button
            onClick={handlePlayAudio}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title="원어민 발음 듣기"
          >
            <Volume2 className="w-4 h-4 text-indigo-500" />
          </button>
        </div>

        <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white leading-relaxed">
          {currentSentence.meaning}
        </h3>

        {currentSentence.context && (
          <p className="text-[11px] text-slate-400 font-medium">
            💡 {currentSentence.context}
          </p>
        )}
      </div>

      {/* Sentence Assembly Zone (Placed Words) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-500">
          <span>문장 조립 영역 (터치하여 단어 빼기)</span>
          <span className="text-[11px] text-slate-400">
            {placedWords.length} / {cleanTokens.length} 단어
          </span>
        </div>

        <div
          className={`min-h-[90px] sm:min-h-[100px] p-3 sm:p-4 rounded-2xl border-2 border-dashed flex flex-wrap items-center justify-center gap-2 transition-all ${
            status === 'correct'
              ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/30'
              : status === 'wrong'
              ? 'border-rose-400 bg-rose-500/5'
              : 'border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-900/50'
          }`}
        >
          {placedWords.length === 0 ? (
            <p className="text-xs sm:text-sm text-slate-400 font-medium text-center animate-pulse">
              아래의 단어 조각을 어순에 맞게 순서대로 터치하세요 👇
            </p>
          ) : (
            placedWords.map((wordObj) => (
              <button
                key={wordObj.id}
                onClick={() => handleRemoveWord(wordObj)}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-black text-xs sm:text-sm shadow-sm transition-all transform active:scale-95 flex items-center gap-1 ${
                  status === 'correct'
                    ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                }`}
              >
                <span>{wordObj.text}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Feedback Message */}
      {status === 'correct' && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-center font-black text-xs sm:text-sm flex items-center justify-center gap-2 animate-in fade-in zoom-in-95">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span>🎉 완벽한 어순입니다! 정확한 문장을 완성했습니다.</span>
        </div>
      )}

      {status === 'wrong' && (
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-center font-black text-xs sm:text-sm flex items-center justify-center gap-2 animate-in fade-in">
          <span>❌ 어순이 맞지 않습니다. 단어를 다시 배치해 보세요.</span>
        </div>
      )}

      {/* Available Word Pieces Bank */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-500">
          <span>선택 가능한 단어 조각</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGiveHint}
              disabled={status === 'correct'}
              className="text-[11px] font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>힌트</span>
            </button>
            <button
              onClick={initSentence}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>초기화</span>
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-center gap-2 min-h-[75px]">
          {availableWords.map((wordObj) => (
            <button
              key={wordObj.id}
              onClick={() => handleSelectWord(wordObj)}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/50 text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 font-extrabold text-xs sm:text-sm transition-all transform active:scale-95 shadow-sm"
            >
              {wordObj.text}
            </button>
          ))}
          {availableWords.length === 0 && (
            <span className="text-xs text-slate-400 font-bold">모든 단어 조각을 배치했습니다.</span>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          onClick={initSentence}
          className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all"
        >
          <Shuffle className="w-4 h-4" />
          <span>다시 섞기</span>
        </button>

        {status === 'correct' ? (
          <button
            onClick={handleNext}
            className="flex-1 py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 animate-pulse"
          >
            <span>다음 문장 도전</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex-1 flex items-center gap-2">
            <button
              onClick={handleCheckAnswer}
              disabled={placedWords.length === 0}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>정답 확인</span>
            </button>
            <button
              onClick={handleNext}
              className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-1 transition-all"
              title="다른 예문으로 넘어가기"
            >
              <span>건너뛰기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
