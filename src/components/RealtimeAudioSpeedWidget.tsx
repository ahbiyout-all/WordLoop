import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  Gauge, 
  ChevronDown, 
  Sparkles, 
  SlidersHorizontal,
  Plus,
  Minus,
  Check
} from 'lucide-react';
import { speechService } from '../services/speechService';
import { AudioSettings } from '../types';

interface RealtimeAudioSpeedWidgetProps {
  onOpenFullSettings?: () => void;
}

const SPEED_PRESETS = [0.5, 0.7, 0.8, 0.9, 1.0, 1.25, 1.5];

export const RealtimeAudioSpeedWidget: React.FC<RealtimeAudioSpeedWidgetProps> = ({
  onOpenFullSettings,
}) => {
  const [settings, setSettings] = useState<AudioSettings>(speechService.getSettings());
  const [isPlaying, setIsPlaying] = useState<boolean>(speechService.getIsPlaying());
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubscribe = speechService.subscribe((state) => {
      setSettings(state.settings);
      setIsPlaying(state.isPlaying);
    });
    return () => unsubscribe();
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSpeedSelect = (speed: number) => {
    speechService.setSpeed(speed);
  };

  const handleStepSpeed = (delta: number) => {
    const next = Math.max(0.5, Math.min(1.5, Math.round((settings.speed + delta) * 100) / 100));
    speechService.setSpeed(next);
  };

  const handleTestPlay = () => {
    speechService.speakWithCallbacks('WordLoop', {
      rate: settings.speed,
      onEnd: () => {
        if (settings.readKorean) {
          speechService.speakWithCallbacks('단어 학습', {
            rate: settings.speed,
            lang: 'ko-KR',
          });
        }
      },
    });
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger Button in Navbar */}
      <button
        id="navbar-audio-speed-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-8 md:h-8.5 px-2 md:px-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-1 transition-all active:scale-95 shrink-0 cursor-pointer ${
          isOpen
            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
            : isPlaying
            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 shadow-xs'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
        title={`실시간 발음 속도: ${settings.speed}x (클릭하여 속도 즉시 조절)`}
      >
        <Volume2 className={`w-3.5 h-3.5 shrink-0 ${isPlaying ? 'animate-bounce text-emerald-500' : ''}`} />
        <span className="font-mono font-black text-[11px] md:text-xs">
          {settings.speed}x
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Speed Quick-Adjust Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-emerald-500" />
              <span className="font-black text-xs text-slate-900 dark:text-white">실시간 발음 속도 조절</span>
            </div>
            <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              {settings.speed.toFixed(2)}x
            </span>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
              <span>빠른 프리셋 선택:</span>
              <span className="text-emerald-500">{settings.speed < 0.9 ? '슬로우 모드' : settings.speed > 1.0 ? '고속 모드' : '표준 모드'}</span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {SPEED_PRESETS.map((s) => {
                const isSelected = Math.abs(settings.speed - s) < 0.03;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSpeedSelect(s)}
                    className={`py-1 rounded-lg text-[11px] font-mono font-bold transition-all border text-center cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500/50'
                    }`}
                  >
                    {s}x
                  </button>
                );
              })}
            </div>
          </div>

          {/* Micro +/- Controls & Slider */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleStepSpeed(-0.05)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors active:scale-95 cursor-pointer"
                title="0.05x 느리게"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={settings.speed}
                onChange={(e) => handleSpeedSelect(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />

              <button
                type="button"
                onClick={() => handleStepSpeed(0.05)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors active:scale-95 cursor-pointer"
                title="0.05x 빠르게"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Korean Meaning Quick Toggle & Test Play */}
          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => speechService.updateSettings({ readKorean: !settings.readKorean })}
              className={`py-1.5 px-2 rounded-xl text-[10px] font-extrabold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                settings.readKorean
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Volume2 className="w-3 h-3 shrink-0" />
              <span>한글뜻 {settings.readKorean ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              onClick={handleTestPlay}
              className="py-1.5 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
            >
              <span>🔊 소리 테스트</span>
            </button>
          </div>

          {/* Link to Full Audio Settings Modal */}
          {onOpenFullSettings && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenFullSettings();
              }}
              className="w-full py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3 h-3 text-emerald-500" />
              <span>음성 톤·반복 간격·상세 설정</span>
            </button>
          )}

        </div>
      )}
    </div>
  );
};
