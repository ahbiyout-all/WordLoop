import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  Play, 
  RotateCcw, 
  Sparkles, 
  Check, 
  X, 
  SlidersHorizontal,
  VolumeX,
  Gauge,
  Music,
  Clock,
  Globe,
  Smartphone,
  AlertTriangle,
  Bell
} from 'lucide-react';
import { speechService } from '../services/speechService';
import { AudioSettings } from '../types';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SPEED_PRESETS = [
  { value: 0.5, label: '0.5x', desc: '아주 느리게 (초심자)' },
  { value: 0.7, label: '0.7x', desc: '슬로우 (파닉스)' },
  { value: 0.8, label: '0.8x', desc: '리스닝 집중' },
  { value: 0.9, label: '0.9x', desc: '기본 권장 속도' },
  { value: 1.0, label: '1.0x', desc: '원어민 표준' },
  { value: 1.25, label: '1.25x', desc: '빠른 청취' },
  { value: 1.5, label: '1.5x', desc: '고속 리스닝' },
];

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AudioSettings>(speechService.getSettings());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isTestingSpeech, setIsTestingSpeech] = useState<boolean>(false);
  const [mobileTestStatus, setMobileTestStatus] = useState<string | null>(null);

  const handleMobileAudioTest = async () => {
    setIsTestingSpeech(true);
    setMobileTestStatus('사운드 엔진 및 오디오 잠금 해제 중...');
    const res = await speechService.testMobileAudio();
    setIsTestingSpeech(false);
    setMobileTestStatus(res.message);
    setTimeout(() => setMobileTestStatus(null), 4500);
  };

  useEffect(() => {
    const unsubscribe = speechService.subscribe((state) => {
      setSettings(state.settings);
    });
    setVoices(speechService.getVoices());
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleSpeedChange = (speed: number) => {
    speechService.setSpeed(speed);
  };

  const handlePitchChange = (pitch: number) => {
    speechService.updateSettings({ pitch });
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

  const handleBreakChimeVolumeChange = (breakChimeVolume: number) => {
    speechService.updateSettings({ breakChimeVolume });
  };

  const handleVoiceChange = (voiceURI: string) => {
    speechService.updateSettings({ voiceURI });
  };

  const handleTestPlay = () => {
    setIsTestingSpeech(true);
    speechService.speakWithCallbacks(
      'WordLoop. Continuous learning makes absolute mastery.',
      {
        rate: settings.speed,
        onEnd: () => {
          if (settings.readKorean) {
            speechService.speakWithCallbacks('연속 학습이 완벽한 숙달을 만듭니다.', {
              rate: settings.speed,
              lang: 'ko-KR',
              onEnd: () => setIsTestingSpeech(false),
              onError: () => setIsTestingSpeech(false),
            });
          } else {
            setIsTestingSpeech(false);
          }
        },
        onError: () => setIsTestingSpeech(false),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 w-full max-w-lg shadow-2xl space-y-4 max-h-[90dvh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>기본 발음 속도 & 음성 옵션</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  {settings.speed}x
                </span>
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                단어·문장 학습 시 적용되는 기본 발음 속도와 음성 환경을 맞춤 설정합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 space-y-4">
          
          {/* SECTION 1: 기본 발음 속도 설정 (Core Feature) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-emerald-500" />
                <span>기본 발음 속도 (Speed)</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSpeedChange(Math.max(0.5, Math.round((settings.speed - 0.05) * 100) / 100))}
                  className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-black text-xs flex items-center justify-center active:scale-95 transition-all"
                  title="0.05x 감속"
                >
                  -
                </button>
                <span className="text-xs font-black font-mono px-2 py-0.5 rounded-lg bg-emerald-500 text-slate-950 shadow-xs">
                  {settings.speed.toFixed(2)}x
                </span>
                <button
                  type="button"
                  onClick={() => handleSpeedChange(Math.min(1.5, Math.round((settings.speed + 0.05) * 100) / 100))}
                  className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-black text-xs flex items-center justify-center active:scale-95 transition-all"
                  title="0.05x 가속"
                >
                  +
                </button>
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-1">
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={settings.speed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold px-0.5">
                <span>0.5x (매우 느림)</span>
                <span>0.9x (추천)</span>
                <span>1.0x (표준)</span>
                <span>1.5x (고속)</span>
              </div>
            </div>

            {/* Preset Speed Buttons */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
              {SPEED_PRESETS.map((preset) => {
                const isActive = Math.abs(settings.speed - preset.value) < 0.03;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleSpeedChange(preset.value)}
                    className={`py-1.5 px-1 rounded-xl text-[11px] font-black transition-all border text-center flex flex-col items-center justify-center cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm scale-102'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500/50'
                    }`}
                    title={preset.desc}
                  >
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Test Sound Button */}
          <button
            type="button"
            onClick={handleTestPlay}
            disabled={isTestingSpeech}
            className={`w-full py-2.5 px-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-sm cursor-pointer ${
              isTestingSpeech
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 animate-pulse'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
            }`}
          >
            <Volume2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              {isTestingSpeech ? '🔊 현재 속도로 발음 테스트 중...' : '▶ 변경된 속도로 예시 발음 즉시 들어보기'}
            </span>
          </button>

          {/* SECTION 2: 한글 뜻 읽기 & 음성 톤 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Read Korean Meaning */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>한글 뜻 자동 읽기</span>
                </span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                  settings.readKorean ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {settings.readKorean ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => handleReadKoreanToggle(true)}
                  className={`py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                    settings.readKorean
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  한글 함께 읽기
                </button>
                <button
                  type="button"
                  onClick={() => handleReadKoreanToggle(false)}
                  className={`py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                    !settings.readKorean
                      ? 'bg-slate-700 text-white border-slate-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  영어만 읽기
                </button>
              </div>
            </div>

            {/* Pitch (음성 톤) */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-indigo-500" />
                  <span>음성 높낮이 (Pitch)</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {settings.pitch}x
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { value: 0.85, label: '차분하게' },
                  { value: 1.0, label: '기본' },
                  { value: 1.15, label: '경쾌하게' },
                ].map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => handlePitchChange(p.value)}
                    className={`py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                      Math.abs(settings.pitch - p.value) < 0.05
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 3: 반복 간격 & 반복 횟수 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Repeat Delay */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span>반복 재생 간격: {settings.repeatDelay}초</span>
              </span>
              <div className="grid grid-cols-4 gap-1">
                {[0.5, 1.0, 1.5, 2.0].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleDelayChange(d)}
                    className={`py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                      settings.repeatDelay === d
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {d}초
                  </button>
                ))}
              </div>
            </div>

            {/* Max Repeat Count */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                <span>반복 횟수: {settings.maxRepeatCount === 0 ? '무한 반복 (∞)' : `${settings.maxRepeatCount}회`}</span>
              </span>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { value: 1, label: '1회' },
                  { value: 3, label: '3회' },
                  { value: 5, label: '5회' },
                  { value: 0, label: '무한' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleMaxRepeatChange(item.value)}
                    className={`py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                      settings.maxRepeatCount === item.value
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 3.5: 5분 힐링 휴식 알림음 볼륨 설정 & 미리듣기 */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>☕ 5분 힐링 휴식 알림음 볼륨</span>
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black font-mono px-2 py-0.5 rounded-lg bg-emerald-500 text-slate-950 shadow-xs">
                  {Math.round((settings.breakChimeVolume ?? 0.7) * 100)}%
                </span>
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-1">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.breakChimeVolume ?? 0.7}
                onChange={(e) => handleBreakChimeVolumeChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold px-0.5">
                <span>0% (무음)</span>
                <span>30% (소프트)</span>
                <span>70% (추천)</span>
                <span>100% (최대)</span>
              </div>
            </div>

            {/* Test Chime Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => speechService.playBreakStartChime(settings.breakChimeVolume ?? 0.7)}
                className="py-2 px-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-black text-[11px] flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>▶ 시작 알림음 들어보기</span>
              </button>
              <button
                type="button"
                onClick={() => speechService.playBreakEndChime(settings.breakChimeVolume ?? 0.7)}
                className="py-2 px-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-slate-800 border border-teal-500/40 text-teal-600 dark:text-teal-400 font-black text-[11px] flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                <span>▶ 종료 알림음 들어보기</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              💡 연속 30분 집중 후 5분 휴식이 시작될 때(오름차순 상쾌한 톤)와 휴식이 끝나 재개될 때(경쾌한 4음 청량 톤) 각각 다른 알림음이 재생됩니다.
            </p>
          </div>

          {/* SECTION 4: Voice Engine Selection */}
          {voices.length > 0 && (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                <span>영어 발음 음성 엔진 (Voice Engine / Accent)</span>
              </label>
              <select
                value={settings.voiceURI || ''}
                onChange={(e) => handleVoiceChange(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* SECTION 5: Samsung Galaxy & Mobile Sound Diagnostic & Unlock */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>삼성 갤럭시 및 모바일 사운드 자가 진단</span>
              </span>
              <button
                type="button"
                onClick={handleMobileAudioTest}
                disabled={isTestingSpeech}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-[11px] font-black shadow-xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{isTestingSpeech ? '소리 확인 중...' : '🔊 모바일 소리 강제 테스트'}</span>
              </button>
            </div>

            {mobileTestStatus && (
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-[11px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{mobileTestStatus}</span>
              </div>
            )}

            <div className="text-[10px] sm:text-[11px] text-amber-800 dark:text-amber-300 space-y-1 leading-relaxed">
              <p className="font-semibold flex items-start gap-1">
                <span>⚠️</span>
                <span><strong>삼성 갤럭시 폰에서 소리가 안 들릴 때:</strong></span>
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300 pl-1">
                <li>스마트폰 측면 <strong>볼륨 버튼</strong>을 누른 후 상단 <strong>점 3개(···)</strong>를 눌러 <strong>'미디어 음량'</strong>이 0이 아닌지 꼭 확인해 주세요. (벨소리가 커도 미디어 볼륨이 꺼져 있으면 소리가 안 납니다)</li>
                <li>삼성 인터넷 / Chrome 브라우저의 소리 차단 제한은 화면을 처음 터치할 때 자동으로 잠금 해제됩니다.</li>
                <li>TTS 엔진이 멈춰있을 경우 백업 오디오 파이프라인(HTML5 스트림)이 0.8초 내 자동 대체 작동합니다.</li>
              </ul>
            </div>
          </div>

          {/* Storage Auto-Sync Note */}
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-[10px] sm:text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
              💡 설정하신 발음 속도와 옵션은 기기 로컬 저장소에 상시 자동 저장되며, 앱 내 모든 단어장, 퀴즈, 플래시카드, 리스닝 게임에 실시간으로 일괄 적용됩니다.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 sm:py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-98 cursor-pointer"
          >
            설정 완료 및 닫기
          </button>
        </div>

      </div>
    </div>
  );
};
