import React, { useEffect, useState } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Square, 
  Settings2, 
  RotateCcw, 
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  Mic
} from 'lucide-react';
import { speechService } from '../services/speechService';
import { AudioSettings } from '../types';

interface AudioPlayerBarProps {
  onOpenPronunciationModal?: (text: string) => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({ onOpenPronunciationModal }) => {
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeText, setActiveText] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [repeatCount, setRepeatCount] = useState<number>(0);
  const [settings, setSettings] = useState<AudioSettings>(speechService.getSettings());
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const unsubscribe = speechService.subscribe((state) => {
      setActiveItemId(state.activeItemId);
      setActiveText(state.activeText);
      setIsPlaying(state.isPlaying);
      setRepeatCount(state.repeatCount);
      setSettings(state.settings);
    });

    setVoices(speechService.getVoices());

    return () => unsubscribe();
  }, []);

  if (!activeItemId || !activeText) {
    return null;
  }

  const handleTogglePlay = () => {
    if (isPlaying) {
      speechService.pause();
    } else {
      speechService.resume();
    }
  };

  const handleStop = () => {
    speechService.stop();
  };

  const handleSpeedChange = (speed: number) => {
    speechService.updateSettings({ speed });
  };

  const handleDelayChange = (repeatDelay: number) => {
    speechService.updateSettings({ repeatDelay });
  };

  const handleMaxRepeatChange = (maxRepeatCount: number) => {
    speechService.updateSettings({ maxRepeatCount });
  };

  const handleReadKoreanToggle = (readKorean: boolean) => {
    speechService.updateSettings({ readKorean });
  };

  const handleVoiceChange = (voiceURI: string) => {
    speechService.updateSettings({ voiceURI });
  };

  // Minimized Floating Pill Mode
  if (isMinimized) {
    return (
      <div 
        id="audio-player-bar-minimized" 
        className="fixed bottom-3 left-4 right-4 sm:left-auto sm:right-6 z-40 max-w-sm sm:w-auto mx-auto bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-700/80 text-slate-100 shadow-2xl rounded-2xl px-3.5 py-2 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
            {isPlaying ? (
              <div className="flex items-end gap-[1.5px] h-3">
                <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_100ms] h-full"></span>
                <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_300ms] h-2"></span>
                <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_200ms] h-full"></span>
              </div>
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </div>
          <p className="text-xs font-medium text-slate-200 truncate max-w-[150px] sm:max-w-[200px]">
            "{activeText}"
          </p>
          <span className="text-[10px] text-slate-400 font-mono shrink-0">
            {repeatCount}/{settings.maxRepeatCount === 0 ? '∞' : settings.maxRepeatCount}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleTogglePlay}
            className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all active:scale-95"
            title={isPlaying ? "일시정지" : "재생"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
          </button>
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="플레이어 컨트롤 펼치기"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleStop}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="정지 및 닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      id="audio-player-bar" 
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-800/90 text-slate-100 shadow-2xl px-3 sm:px-4 py-2.5 sm:py-3 transition-all pb-[calc(0.6rem+env(safe-area-inset-bottom,0px))]"
    >
      {/* 1. Track Info & Header Status Bar */}
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800/60">
        {/* Left: Mini Sound Wave & Active Quote */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            {isPlaying ? (
              <div className="flex items-end gap-[1.5px] h-3">
                <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_100ms] h-full"></span>
                <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_300ms] h-2"></span>
                <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_200ms] h-full"></span>
              </div>
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </div>
          <p className="text-xs font-semibold text-slate-100 truncate max-w-[190px] xs:max-w-[260px] sm:max-w-md md:max-w-xl">
            "{activeText}"
          </p>
        </div>

        {/* Right: Loop Badge, Progress, Minimize & Close Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 whitespace-nowrap">
            <RotateCcw className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: isPlaying ? '3s' : '0s' }} />
            <span>{settings.maxRepeatCount === 0 ? '무한' : `${settings.maxRepeatCount}회`}</span>
          </span>
          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap hidden xs:inline">
            진행: {repeatCount} / {settings.maxRepeatCount === 0 ? '∞' : `${settings.maxRepeatCount}회`}
          </span>
          
          {/* Minimize Button */}
          <button
            onClick={() => {
              setIsMinimized(true);
              setShowSettings(false);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="하단 플레이어 최소화"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Close & Stop Button */}
          <button
            onClick={handleStop}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="플레이어 닫기 및 중단"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Organized Control Row (Never-wrapping, Balanced Touch Targets) */}
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Playback Controls (Play/Pause & Stop) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            id="audio-bar-play-pause-btn"
            onClick={handleTogglePlay}
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 transition-all active:scale-95 whitespace-nowrap"
            title={isPlaying ? "일시정지" : "재생"}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span className="whitespace-nowrap">일시정지</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                <span className="whitespace-nowrap">재생</span>
              </>
            )}
          </button>

          <button
            id="audio-bar-stop-btn"
            onClick={handleStop}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-all active:scale-95 shrink-0"
            title="정지 및 닫기"
          >
            <Square className="w-3.5 h-3.5" />
          </button>

          {/* Quick Speed Chip (1-Tap Cycle) */}
          <button
            id="audio-bar-quick-speed-btn"
            type="button"
            onClick={() => speechService.cycleSpeed()}
            className="px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-mono font-black text-xs border border-slate-700 transition-all active:scale-95 shrink-0"
            title={`현재 발음 속도: ${settings.speed}x (클릭 시 다음 속도로 즉시 순환)`}
          >
            {settings.speed}x
          </button>
        </div>

        {/* Action Toggles: Korean Audio Toggle, Pronunciation Shadowing, Settings */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            id="audio-bar-read-korean-btn"
            onClick={() => handleReadKoreanToggle(!settings.readKorean)}
            className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 shrink-0 whitespace-nowrap active:scale-95 ${
              settings.readKorean
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 shadow-xs'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
            }`}
            title="영어 발음 후 한글 뜻/해석을 함께 읽습니다"
          >
            <Volume2 className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">한글 {settings.readKorean ? 'ON' : 'OFF'}</span>
          </button>

          {onOpenPronunciationModal && (
            <button
              id="audio-bar-shadowing-btn"
              onClick={() => onOpenPronunciationModal(activeText)}
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 shrink-0 whitespace-nowrap shadow-sm active:scale-95 transition-all"
              title="원어민 발음 비교 및 쉐도잉 녹음 테스트"
            >
              <Mic className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap hidden xs:inline">발음 쉐도잉</span>
              <span className="whitespace-nowrap xs:hidden">발음</span>
            </button>
          )}

          <button
            id="audio-bar-settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 sm:p-2.5 rounded-xl transition-all border shrink-0 active:scale-95 ${
              showSettings
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="재생 속도 및 간격 설정"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Expanded Quick Settings Drawer */}
      {showSettings && (
        <div className="max-w-6xl mx-auto mt-2.5 pt-2.5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs text-slate-300 animate-in fade-in duration-150">
          
          {/* Read Korean Option */}
          <div>
            <label className="block mb-1 font-medium text-slate-400 flex justify-between">
              <span>한글 뜻/해석 음성</span>
              <span className={settings.readKorean ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                {settings.readKorean ? '켜짐' : '꺼짐'}
              </span>
            </label>
            <div className="flex gap-1">
              <button
                onClick={() => handleReadKoreanToggle(true)}
                className={`flex-1 py-1 rounded-lg font-bold transition-all text-[11px] whitespace-nowrap ${
                  settings.readKorean
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                한글 함께
              </button>
              <button
                onClick={() => handleReadKoreanToggle(false)}
                className={`flex-1 py-1 rounded-lg font-bold transition-all text-[11px] whitespace-nowrap ${
                  !settings.readKorean
                    ? 'bg-slate-700 text-white font-bold'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                영어만
              </button>
            </div>
          </div>
          
          {/* Max Repeat Count Selector */}
          <div>
            <label className="block mb-1 font-medium text-slate-400 flex justify-between">
              <span>반복 횟수 지정</span>
              <span className="text-emerald-400 font-bold">
                {settings.maxRepeatCount === 0 ? '무한' : `${settings.maxRepeatCount}회`}
              </span>
            </label>
            <div className="flex gap-1">
              {[
                { label: '1회', value: 1 },
                { label: '2회', value: 2 },
                { label: '3회', value: 3 },
                { label: '5회', value: 5 },
                { label: '10회', value: 10 },
                { label: '무한', value: 0 },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleMaxRepeatChange(item.value)}
                  className={`flex-1 py-1 rounded-lg font-bold transition-all text-[11px] whitespace-nowrap ${
                    settings.maxRepeatCount === item.value
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Speed Selector */}
          <div>
            <label className="block mb-1 font-medium text-slate-400 flex justify-between">
              <span>재생 속도: {settings.speed}x</span>
              <span className="text-emerald-400">{settings.speed <= 0.7 ? '슬로우' : settings.speed <= 0.9 ? '추천' : settings.speed === 1.0 ? '표준' : '빠름'}</span>
            </label>
            <div className="flex gap-1">
              {[0.5, 0.7, 0.8, 0.9, 1.0, 1.25, 1.5].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`flex-1 py-1 rounded-lg font-mono font-bold transition-all text-[11px] whitespace-nowrap ${
                    Math.abs(settings.speed - s) < 0.03
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Repeat Delay Selector */}
          <div>
            <label className="block mb-1 font-medium text-slate-400">
              반복 간격: {settings.repeatDelay}초
            </label>
            <div className="flex gap-1.5">
              {[1.0, 1.5, 2.0, 3.0].map((d) => (
                <button
                  key={d}
                  onClick={() => handleDelayChange(d)}
                  className={`flex-1 py-1 rounded-lg font-medium transition-all text-[11px] whitespace-nowrap ${
                    settings.repeatDelay === d
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {d}초
                </button>
              ))}
            </div>
          </div>

          {/* Voice Accent Selector */}
          <div>
            <label className="block mb-1 font-medium text-slate-400">
              음성 억양 (Voice)
            </label>
            <select
              value={settings.voiceURI || ''}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

        </div>
      )}
    </div>
  );
};
