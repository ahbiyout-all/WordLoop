import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Volume2,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  Trophy,
  Flame,
  Volume1,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react';
import { SentenceItem } from '../../types';
import { speechService } from '../../services/speechService';

interface SentenceListeningFillGameProps {
  sentences: SentenceItem[];
  gradeName: string;
  onUpdateHighScore?: (score: number) => void;
  onChangeMastery?: (id: string, level: 0 | 1 | 2) => void;
  onQuit?: () => void;
}

export const SentenceListeningFillGame: React.FC<SentenceListeningFillGameProps> = ({
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
  const [selectedSpeed, setSelectedSpeed] = useState<number>(1.0);
  const [showMeaningHint, setShowMeaningHint] = useState<boolean>(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [status, setStatus] = useState<'playing' | 'correct' | 'wrong'>('playing');

  useEffect(() => {
    const list = sentences.filter((s) => s.text && s.text.trim().split(/\s+/).length >= 3);
    setShuffledSentences([...list].sort(() => 0.5 - Math.random()));
    setCurrentIndex(0);
  }, [sentences]);

  const currentSentence = shuffledSentences[currentIndex] || shuffledSentences[0];

  // Pick a target keyword to blank out (prefer longer words > 3 chars)
  const questionData = useMemo(() => {
    if (!currentSentence) {
      return { blankedText: '', targetWord: '', cleanTarget: '', options: [] };
    }

    const tokens = currentSentence.text.trim().split(/\s+/);
    // Find candidate words with length >= 3
    const candidates = tokens
      .map((t, idx) => ({ token: t, clean: t.replace(/[.,!?;:"']/g, ''), idx }))
      .filter((c) => c.clean.length >= 3);

    const chosen = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : { token: tokens[0], clean: tokens[0].replace(/[.,!?;:"']/g, ''), idx: 0 };

    const targetWord = chosen.token;
    const cleanTarget = chosen.clean;

    // Blank out in sentence
    const blankedTokens = tokens.map((t, i) => (i === chosen.idx ? '______' : t));
    const blankedText = blankedTokens.join(' ');

    // Generate 3 distractor words from other sentences in pool
    const otherWords = new Set<string>();
    for (const s of shuffledSentences) {
      if (s.id === currentSentence.id) continue;
      const sTokens = s.text.trim().split(/\s+/);
      for (const st of sTokens) {
        const clean = st.replace(/[.,!?;:"']/g, '');
        if (clean.length >= 3 && clean.toLowerCase() !== cleanTarget.toLowerCase()) {
          otherWords.add(clean);
          if (otherWords.size >= 10) break;
        }
      }
      if (otherWords.size >= 10) break;
    }

    const distractors = Array.from(otherWords)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    // If not enough, fallback
    const fallbackDistractors = ['always', 'before', 'through', 'between', 'together', 'little'];
    while (distractors.length < 3) {
      const fb = fallbackDistractors[distractors.length];
      if (!distractors.includes(fb) && fb !== cleanTarget.toLowerCase()) {
        distractors.push(fb);
      }
    }

    const options = [cleanTarget, ...distractors].sort(() => 0.5 - Math.random());

    return {
      blankedText,
      targetWord,
      cleanTarget,
      options,
    };
  }, [currentSentence, shuffledSentences]);

  // Play audio with selected speed
  const playAudio = useCallback(
    (customSpeed?: number) => {
      if (!currentSentence) return;
      const speed = customSpeed ?? selectedSpeed;
      speechService.updateSettings({ speed });
      speechService.speakOnce(currentSentence.text);
    },
    [currentSentence, selectedSpeed]
  );

  // Auto-play audio when sentence changes
  useEffect(() => {
    setSelectedChoice(null);
    setStatus('playing');
    setShowMeaningHint(false);
    playAudio(selectedSpeed);
  }, [currentIndex, playAudio, selectedSpeed]);

  const handleSelectChoice = (choice: string) => {
    if (status === 'correct') return;
    setSelectedChoice(choice);

    if (choice.toLowerCase() === questionData.cleanTarget.toLowerCase()) {
      setStatus('correct');
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      const points = 15 + nextCombo * 5;
      const nextScore = score + points;
      setScore(nextScore);
      if (onUpdateHighScore) onUpdateHighScore(nextScore);
      if (onChangeMastery) onChangeMastery(currentSentence.id, 2);

      // Play audio again on success
      playAudio(selectedSpeed);
    } else {
      setStatus('wrong');
      setCombo(0);
    }
  };

  const handleNext = () => {
    setSelectedChoice(null);
    setStatus('playing');
    setShowMeaningHint(false);
    if (currentIndex + 1 < shuffledSentences.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShuffledSentences((prev) => [...prev].sort(() => 0.5 - Math.random()));
      setCurrentIndex(0);
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
          <span className="px-2.5 py-1 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400 font-black text-xs">
            🎧 청취 빈칸 {currentIndex + 1} / {shuffledSentences.length}
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

      {/* Audio Controller Bar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-teal-900/40 via-slate-900/60 to-indigo-900/40 border border-teal-500/30 flex items-center justify-between gap-3 shadow-md">
        <button
          onClick={() => playAudio(selectedSpeed)}
          className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
        >
          <Volume2 className="w-4 h-4" />
          <span>다시 듣기</span>
        </button>

        {/* Speed Controls (0.8x, 1.0x, 1.2x) */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          {[0.8, 1.0, 1.2].map((spd) => (
            <button
              key={spd}
              onClick={() => {
                setSelectedSpeed(spd);
                playAudio(spd);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                selectedSpeed === spd
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* Sentence Blank Card */}
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-3 relative">
        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 inline-block">
          소리를 듣고 빈칸에 들어갈 단어를 맞추세요
        </span>

        {/* Blanked Sentence Display */}
        <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-relaxed max-w-xl mx-auto">
          {status === 'correct' ? (
            <span>
              {questionData.blankedText.split('______')[0]}
              <span className="text-emerald-500 underline decoration-2 decoration-emerald-500 px-1 font-black animate-in zoom-in-95">
                {questionData.cleanTarget}
              </span>
              {questionData.blankedText.split('______')[1]}
            </span>
          ) : (
            <span>
              {questionData.blankedText.split('______')[0]}
              <span className="inline-block px-3 py-0.5 rounded-lg bg-teal-500/10 border-2 border-dashed border-teal-500 text-teal-600 dark:text-teal-400 font-black animate-pulse">
                [ ? ]
              </span>
              {questionData.blankedText.split('______')[1]}
            </span>
          )}
        </h2>

        {/* Korean Meaning Hint Toggle */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-col items-center gap-1.5">
          <button
            onClick={() => setShowMeaningHint(!showMeaningHint)}
            className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 transition-colors"
          >
            {showMeaningHint ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showMeaningHint ? '한글 힌트 가리기' : '한글 힌트 보기'}</span>
          </button>
          {showMeaningHint && (
            <p className="text-xs sm:text-sm font-extrabold text-indigo-600 dark:text-indigo-400 animate-in fade-in">
              {currentSentence.meaning}
            </p>
          )}
        </div>
      </div>

      {/* 4 Candidate Options */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {questionData.options.map((opt, idx) => {
          const isSelected = selectedChoice === opt;
          const isCorrect = opt.toLowerCase() === questionData.cleanTarget.toLowerCase();

          let btnStyle =
            'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-950/30';

          if (status === 'correct' && isCorrect) {
            btnStyle = 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20';
          } else if (status === 'wrong' && isSelected) {
            btnStyle = 'bg-rose-500 text-white border-rose-400 animate-shake';
          }

          return (
            <button
              key={`${opt}-${idx}`}
              onClick={() => handleSelectChoice(opt)}
              disabled={status === 'correct'}
              className={`p-3.5 sm:p-4 rounded-2xl border font-black text-sm sm:text-base transition-all transform active:scale-95 shadow-sm flex items-center justify-center gap-2 ${btnStyle}`}
            >
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Feedback & Bottom Action */}
      <div className="pt-1 flex items-center gap-2">
        {status === 'correct' ? (
          <button
            onClick={handleNext}
            className="w-full py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 animate-pulse"
          >
            <span>다음 문장 청취 도전</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <>
            <div className="flex-1 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-center font-bold text-xs">
              {status === 'wrong' ? '❌ 다시 귀를 기울여 들어보세요!' : '🔊 소리를 듣고 맞는 단어를 골라보세요.'}
            </div>
            <button
              onClick={handleNext}
              className="py-2.5 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1 transition-all"
              title="다른 예문으로 넘어가기"
            >
              <span>건너뛰기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
