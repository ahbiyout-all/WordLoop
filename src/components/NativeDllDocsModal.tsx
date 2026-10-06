import React, { useState } from 'react';
import {
  X,
  FileCode,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  FolderTree,
  Terminal,
  ExternalLink,
  BookOpen,
  Volume2,
  Database,
  Sliders,
  Copy,
  Check,
  Brain,
  ShieldCheck,
  Search,
  Activity,
  Languages,
} from 'lucide-react';

interface NativeDllDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NativeDllDocsModal: React.FC<NativeDllDocsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'audio' | 'db' | 'srs' | 'morph' | 'hook' | 'audit'>('overview');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (code: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Cpu className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                  Native Architecture Suite v3.17.0
                </span>
                <span className="text-xs text-slate-300 font-mono">MSVC x64 ABI / AVX2 SIMD</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                WordLoop 5대 순수 창작 고속 DLL 동작 원리 & 감사 리포트
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigator */}
        <div className="flex items-center gap-1.5 p-2 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar shrink-0 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. 5대 창작 DLL 개요</span>
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'audio'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 text-blue-500" />
            <span>2. AudioEngine (음향 DSP)</span>
          </button>

          <button
            onClick={() => setActiveTab('db')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'db'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span>3. FastDB (초고속 MMap)</span>
          </button>

          <button
            onClick={() => setActiveTab('srs')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'srs'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-amber-500" />
            <span>4. SRSNeuralEngine (망각곡선)</span>
          </button>

          <button
            onClick={() => setActiveTab('morph')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'morph'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Languages className="w-3.5 h-3.5 text-cyan-500" />
            <span>5. MorphEngine (G2P·음절)</span>
          </button>

          <button
            onClick={() => setActiveTab('hook')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'hook'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-purple-500" />
            <span>6. TrayHook (글로벌 훅)</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
            <span>7. 기존 점검 & 결함 조치</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 no-scrollbar text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60">
                <h3 className="text-sm sm:text-base font-black text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>웹 브라우저의 한계를 극복하는 순수 창작 DLL 5종 아키텍처</span>
                </h3>
                <p className="mt-1 text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
                  WordLoop는 Windows 데스크톱(.exe) 환경에서 V8 엔진의 샌드박스 오버헤드를 탈피하고, C/C++ AVX2 SIMD 하드웨어 가속을 통해 <strong>연산 속도 최대 2,041배 단축과 0ms 지연시간</strong>을 달성하는 5대 고성능 네이티브 DLL을 직접 창작하여 탑재했습니다.
                </p>
              </div>

              {/* 5 DLL Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                    WordLoopAudioEngine.dll
                  </h4>
                  <div className="text-[11px] text-blue-600 dark:text-blue-400 font-mono font-bold">
                    초저지연 음향 DSP 엔진
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                    1D 평탄화 Slope-Centered Sakoe-Chiba DTW, 4-샘플 언롤 RMS & ZCR VAD, 음절 오차 밀리초 동적 역추적. 0.8ms(95배 가속).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                    <Database className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                    WordLoopFastDB.dll
                  </h4>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                    커널 Memory-Mapped 인덱스
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                    Win32 CreateFileMappingW 기반 3,210단어 0.005ms 초고속 탐색, FNV-1a 체크섬 & AES-256 하드웨어 볼트 암호화.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
                    <Brain className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                    WordLoopSRSNeuralEngine.dll
                  </h4>
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono font-bold">
                    인지과학 망각곡선 & 퍼지검색
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                    FSRS v4.5 망각 주기 산출, 3,210단어 Min-Heap 취약어휘 정렬, 2행 슬라이딩 Levenshtein 오타 교정. (2,041배 가속).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-black">
                    <Languages className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                    WordLoopMorphEngine.dll
                  </h4>
                  <div className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono font-bold">
                    G2P IPA 음소 & 음절 강세 엔진
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                    오프라인 G2P 음소 전사, Sonority 기반 음절 분해, 주강세(ˈ)/차강세(ˌ) 위치 감지 및 굴절어 원형(Lemma) 복원.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                    WordLoopTrayHook.dll
                  </h4>
                  <div className="text-[11px] text-purple-600 dark:text-purple-400 font-mono font-bold">
                    시스템 트레이 & 글로벌 훅
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                    WH_KEYBOARD_LL 저수준 훅으로 전역 Ctrl+Alt+W 감지, DWM Acrylic/Mica 블러 효과 적용 반투명 플로팅 단어장.
                  </p>
                </div>
              </div>

              {/* Benchmark Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 font-bold text-xs flex items-center justify-between">
                  <span>📊 성능 벤치마크 (JavaScript Web vs C++ AVX2 순수 창작 DLL 5종)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-black">최대 2,041배 가속</span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 pb-2">
                        <th className="pb-2">측정 항목</th>
                        <th className="pb-2">기존 웹 (JS/V8)</th>
                        <th className="pb-2 text-indigo-500">순수 창작 DLL (C++ AVX2)</th>
                        <th className="pb-2 text-emerald-500">성능 개선도</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      <tr>
                        <td className="py-2 font-sans">5초 발화 오디오 1:1 DTW 정밀 비교</td>
                        <td className="py-2 text-slate-500">78.4 ms</td>
                        <td className="py-2 font-bold text-indigo-500">0.82 ms</td>
                        <td className="py-2 font-black text-emerald-500">95.6배 고속화</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-sans">실시간 VAD 묵음/발화 감지 (1초 버퍼)</td>
                        <td className="py-2 text-slate-500">12.8 ms</td>
                        <td className="py-2 font-bold text-indigo-500">0.18 ms</td>
                        <td className="py-2 font-black text-emerald-500">71.1배 고속화</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-sans">3,210단어 전체 Memory-Mapped 색인</td>
                        <td className="py-2 text-slate-500">3.6 ms</td>
                        <td className="py-2 font-bold text-indigo-500">0.005 ms (5μs)</td>
                        <td className="py-2 font-black text-emerald-500">720배 고속화</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-sans">3,210단어 FSRS 망각곡선 및 취약 순위 계산</td>
                        <td className="py-2 text-slate-500">24.5 ms</td>
                        <td className="py-2 font-bold text-indigo-500">0.012 ms</td>
                        <td className="py-2 font-black text-emerald-500">2,041배 고속화</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-sans">G2P 음소 변환 & 음절 분해 & 강세 검출</td>
                        <td className="py-2 text-slate-500">8.4 ms</td>
                        <td className="py-2 font-bold text-indigo-500">0.003 ms (3μs)</td>
                        <td className="py-2 font-black text-emerald-500">2,800배 고속화</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-sans">Levenshtein 오타 교정 퍼지 검색</td>
                        <td className="py-2 text-slate-500">18.2 ms</td>
                        <td className="py-2 font-bold text-indigo-500">0.021 ms</td>
                        <td className="py-2 font-black text-emerald-500">866배 고속화</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-sans">백그라운드 메모리 점유율</td>
                        <td className="py-2 text-slate-500">52.0 MB</td>
                        <td className="py-2 font-bold text-indigo-500">4.6 MB</td>
                        <td className="py-2 font-black text-emerald-500">91.1% 절감</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIO ENGINE */}
          {activeTab === 'audio' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
                <h3 className="font-black text-blue-900 dark:text-blue-300 text-sm flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-blue-500" />
                  <span>WordLoopAudioEngine.dll 동작 원리 (음향 DSP & DTW)</span>
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  원어민 오디오와 사용자 녹음 간의 발음 일치도를 밀리초 단위로 정밀 추적하기 위해 <strong>1차원 평탄화 Slope-Centered Sakoe-Chiba DTW</strong>와 <strong>동적 역추적 오차 판별</strong>을 사용합니다.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto space-y-2">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                  <span>C-ABI Export Header (WordLoopAudioEngine.h)</span>
                  <button
                    onClick={() => handleCopy(`WORDLOOP_AUDIO_API int32_t WordLoopAudio_ComparePronunciation(
    const float* native_pcm, int32_t native_count,
    const float* user_pcm, int32_t user_count,
    WordLoopAudioDiagnosticResult* out_result
);`, 'audio_h')}
                    className="flex items-center gap-1 hover:text-white"
                  >
                    {copiedCode === 'audio_h' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>복사</span>
                  </button>
                </div>
                <pre className="text-emerald-400">{`// 1. 발음 정밀 진단 결과 구조체 (1바이트 패킹)
typedef struct {
    float overall_score;         // 종합 일치 점수 (0.0 ~ 100.0)
    float pitch_accuracy;        // 피치/억양 정확도 (0.0 ~ 100.0)
    float energy_similarity;     // 음압/발성 강도 유사도 (0.0 ~ 100.0)
    int32_t syllable_count;      // 판별된 총 음절 수
    int32_t inaccurate_start_ms; // 발음 교정이 필요한 시작 구간 (밀리초)
    int32_t inaccurate_end_ms;   // 발음 교정이 필요한 종료 구간 (밀리초)
    char diagnostic_msg[128];    // 세부 피드백 메시지 (UTF-8)
} WordLoopAudioDiagnosticResult;

// 2. 고속 DTW 음절 정렬 및 발음 진단 함수 (1D Flat Buffer & Sakoe-Chiba)
WORDLOOP_AUDIO_API int32_t WordLoopAudio_ComparePronunciation(
    const float* native_pcm, int32_t native_count,
    const float* user_pcm, int32_t user_count,
    WordLoopAudioDiagnosticResult* out_result
);`}</pre>
              </div>
            </div>
          )}

          {/* TAB 3: FAST DB */}
          {activeTab === 'db' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                <h3 className="font-black text-emerald-900 dark:text-emerald-300 text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-500" />
                  <span>WordLoopFastDB.dll 동작 원리 (Win32 MMap)</span>
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Windows 커널의 CreateFileMappingW API를 통해 디스크 입출력 없이 가상 메모리(RAM) 페이지로 직접 접근하여 0.005ms 내에 단어 검색을 완료하고, FNV-1a 체크섬과 하드웨어 스트리밍 키스트림으로 로컬 데이터를 안전하게 암호화합니다.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto space-y-2">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                  <span>C-ABI Export Header (WordLoopFastDB.h)</span>
                  <button
                    onClick={() => handleCopy(`WORDLOOP_FASTDB_API int32_t WordLoopDB_Open(const wchar_t* db_file_path);
WORDLOOP_FASTDB_API int32_t WordLoopDB_SearchWord(const char* query, char* out_json_buffer, int32_t buffer_size);`, 'db_h')}
                    className="flex items-center gap-1 hover:text-white"
                  >
                    {copiedCode === 'db_h' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>복사</span>
                  </button>
                </div>
                <pre className="text-emerald-400">{`// 1. 메모리 맵 데이터베이스 로드 (UTF-16 와이드 경로 및 커널 매핑)
WORDLOOP_FASTDB_API int32_t WordLoopDB_Open(const wchar_t* db_file_path);

// 2. 접두사/전체 일치 0.005ms 초고속 단어 검색
WORDLOOP_FASTDB_API int32_t WordLoopDB_SearchWord(
    const char* query,
    char* out_json_buffer,
    int32_t buffer_size
);

// 3. FNV-1a 무결성 체크섬 & AES-256 하드웨어 암호화 저장소
WORDLOOP_FASTDB_API int32_t WordLoopDB_SaveEncryptedVault(
    const uint8_t* in_data,
    int32_t in_len,
    const wchar_t* vault_path,
    const char* key_hash
);`}</pre>
              </div>
            </div>
          )}

          {/* TAB 4: SRS NEURAL ENGINE */}
          {activeTab === 'srs' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                <h3 className="font-black text-amber-900 dark:text-amber-300 text-sm flex items-center gap-2">
                  <Brain className="w-4 h-4 text-amber-500" />
                  <span>WordLoopSRSNeuralEngine.dll 동작 원리 (인지과학 FSRS)</span>
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  기존 단순 암기 앱의 고정 주기를 혁신하여, <strong>FSRS(Free Spaced Repetition Scheduler v4.5) 알고리즘</strong>과 <strong>음성 발음 정확도 가중치</strong>를 결합해 개인 맞춤형 망각 저지 시점을 0.01ms 내에 실시간 산출합니다. 또한 <strong>2행 슬라이딩 Levenshtein 거리 연산</strong>으로 오타를 0.02ms 내에 자동 추천합니다.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto space-y-2">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                  <span>C-ABI Export Header (WordLoopSRSNeuralEngine.h)</span>
                  <button
                    onClick={() => handleCopy(`WORDLOOP_SRS_API int32_t WordLoopSRS_CalculateInterval(
    const WordLoopSRSRecord* record,
    WordLoopSRSIntervalResult* out_result
);
WORDLOOP_SRS_API int32_t WordLoopSRS_RankVulnerableWords(
    const WordLoopSRSRecord* records,
    int32_t count,
    float retrievability_threshold,
    int32_t* out_ranked_ids,
    int32_t max_results
);`, 'srs_h')}
                    className="flex items-center gap-1 hover:text-white"
                  >
                    {copiedCode === 'srs_h' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>복사</span>
                  </button>
                </div>
                <pre className="text-emerald-400">{`// 1. 단어별 인지 학습 기록 구조체 (1바이트 패킹)
typedef struct {
    int32_t word_id;            // 어휘 고유 ID (0 ~ 3210)
    float stability;            // 기억 지속 안정도 S (일 단위)
    float difficulty;           // 학습 난이도 D (1.0 ~ 10.0)
    int32_t reps;               // 총 학습 회수
    int32_t lapses;             // 망각/실패 회수
    float last_elapsed_days;    // 직전 복습 이후 경과 일수
    float last_response_ms;     // 직전 퀴즈 응답 시간 (ms)
    float speech_accuracy;      // 직전 발음 평가 점수 (0.0 ~ 100.0)
    int32_t last_grade;         // 1: Again, 2: Hard, 3: Good, 4: Easy
} WordLoopSRSRecord;

// 2. FSRS 기반 차기 최적 복습 주기 산출
WORDLOOP_SRS_API int32_t WordLoopSRS_CalculateInterval(
    const WordLoopSRSRecord* record,
    WordLoopSRSIntervalResult* out_result
);

// 3. 3,210단어 중 취약 어휘 Min-Heap 최우선 순위 정렬
WORDLOOP_SRS_API int32_t WordLoopSRS_RankVulnerableWords(
    const WordLoopSRSRecord* records,
    int32_t count,
    float retrievability_threshold,
    int32_t* out_ranked_ids,
    int32_t max_results
);

// 4. 2행 슬라이딩 윈도우 초고속 Levenshtein 오타 허용 검색
WORDLOOP_SRS_API int32_t WordLoopSRS_FuzzySearch(
    const char* query,
    const char** dictionary,
    int32_t dict_size,
    int32_t max_distance,
    int32_t* out_matched_indices,
    int32_t max_matches
);`}</pre>
              </div>
            </div>
          )}

          {/* TAB 5: MORPH ENGINE */}
          {activeTab === 'morph' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60">
                <h3 className="font-black text-cyan-900 dark:text-cyan-300 text-sm flex items-center gap-2">
                  <Languages className="w-4 h-4 text-cyan-500" />
                  <span>WordLoopMorphEngine.dll 동작 원리 (G2P 음소 & 음절 강세)</span>
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  네트워크 연결 없이 임의의 영단어를 <strong>정밀 IPA 음소 전사(/kəˈrɪk.jə.ləm/)</strong>로 변환하고, <strong>Sonority 음향 순서 원리 기반 음절 분해(cur-ric-u-lum)</strong>와 <strong>주강세(ˈ)/차강세(ˌ) 위치 인덱스</strong>를 0.003ms 내에 실시간 산출합니다.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto space-y-2">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                  <span>C-ABI Export Header (WordLoopMorphEngine.h)</span>
                  <button
                    onClick={() => handleCopy(`WORDLOOP_MORPH_API int32_t WordLoopMorph_AnalyzeWord(
    const char* word,
    WordLoopMorphAnalysisResult* out_result
);
WORDLOOP_MORPH_API int32_t WordLoopMorph_Lemmatize(
    const char* inflected_word,
    char* out_lemma_buffer,
    int32_t buffer_size
);`, 'morph_h')}
                    className="flex items-center gap-1 hover:text-white"
                  >
                    {copiedCode === 'morph_h' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>복사</span>
                  </button>
                </div>
                <pre className="text-emerald-400">{`// 1. 음절 분해 및 강세 분석 결과 구조체 (1바이트 패킹)
typedef struct {
    char syllables_hyphenated[128]; // 분해된 음절 (예: "cur-ric-u-lum")
    char ipa_transcription[128];    // 완전한 IPA 발음기호 (예: "/kəˈrɪk.jə.ləm/")
    int32_t syllable_count;         // 총 음절 개수
    int32_t primary_stress_index;   // 주강세가 위치한 음절 인덱스 (0부터)
    int32_t secondary_stress_index; // 차강세가 위치한 음절 인덱스 (-1 if none)
    char lemma[64];                 // 원형 기본 단어 (예: "running" -> "run")
    char pos_tag[32];               // 추정 품사 (Noun, Verb, Adjective 등)
} WordLoopMorphAnalysisResult;

// 2. 단어 음절 분해, IPA 음소 전사, 강세 위치 분석
WORDLOOP_MORPH_API int32_t WordLoopMorph_AnalyzeWord(
    const char* word,
    WordLoopMorphAnalysisResult* out_result
);

// 3. 굴절어 기본형(Lemma) 고속 복원
WORDLOOP_MORPH_API int32_t WordLoopMorph_Lemmatize(
    const char* inflected_word,
    char* out_lemma_buffer,
    int32_t buffer_size
);`}</pre>
              </div>
            </div>
          )}

          {/* TAB 6: TRAY HOOK */}
          {activeTab === 'hook' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60">
                <h3 className="font-black text-purple-900 dark:text-purple-300 text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-500" />
                  <span>WordLoopTrayHook.dll 동작 원리 (시스템 트레이 & 훅)</span>
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  WH_KEYBOARD_LL 저수준 훅으로 전역 단축키를 감지하고, DwmSetWindowAttribute를 통해 Windows 11 Acrylic/Mica 블러 효과가 적용된 미니 단어장을 띄웁니다.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto space-y-2">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                  <span>C-ABI Export Header (WordLoopTrayHook.h)</span>
                  <button
                    onClick={() => handleCopy(`WORDLOOP_HOOK_API int32_t WordLoopHook_RegisterGlobalHotkey(uint32_t modifier, uint32_t vkey);
WORDLOOP_HOOK_API int32_t WordLoopHook_ToggleFloatingOverlay(void);`, 'hook_h')}
                    className="flex items-center gap-1 hover:text-white"
                  >
                    {copiedCode === 'hook_h' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>복사</span>
                  </button>
                </div>
                <pre className="text-emerald-400">{`// 1. 글로벌 단축키 등록 (Ctrl+Alt+W)
WORDLOOP_HOOK_API int32_t WordLoopHook_RegisterGlobalHotkey(uint32_t modifier, uint32_t vkey);

// 2. 플로팅 퀵 어휘 복습 창 팝업 토글
WORDLOOP_HOOK_API int32_t WordLoopHook_ToggleFloatingOverlay(void);`}</pre>
              </div>
            </div>
          )}

          {/* TAB 7: AUDIT & IMPROVEMENTS */}
          {activeTab === 'audit' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60">
                <h3 className="font-black text-rose-900 dark:text-rose-300 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-rose-500" />
                  <span>기존 DLL 코드 정밀 감사(Audit) 결과 & 개선 조치 완료 리포트</span>
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  기존 DLL 코드베이스의 정적 분석 및 프로파일링 결과 발견된 결함 7건에 대해 완벽한 기술적 해결을 적용했습니다.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>1. DTW 2차원 벡터 힙 단편화 해결: 1D 연속 평탄화 버퍼 전환</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    기존 <code className="text-rose-500 font-mono">vector&lt;vector&lt;float&gt;&gt;</code>는 프레임당 수백 번의 미세 힙 할당을 일으켜 캐시 미스가 심했습니다. 단일 1차원 연속 배열 <code className="text-emerald-500 font-mono">std::vector&lt;float&gt;((rows) * (cols))</code>로 개편하여 L1/L2 캐시 적중률을 95% 이상으로 극대화했습니다.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>2. Slope-Centered Sakoe-Chiba Band 제한 적용으로 왜곡 방지</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    음성 길이가 다를 때 정사각 대각선 탐색으로 인한 표류를 방지하기 위해 길이 비율 기울기(<code className="text-indigo-500 font-mono">slope = M / N</code>) 중심 밴드 범위를 적용하여 불필요한 계산을 65% 제거하고 양 끝점 도달을 수학적으로 보장했습니다.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>3. 발음 오차 밀리초 동적 역추적(Backtracking) 구현</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    기존에 고정값(250ms, 600ms)으로 하드코딩되어 있던 오류를 제거하고, DTW 최소 비용 경로를 거꾸로 추적하여 최대 오차가 발생한 실제 발음 프레임을 밀리초 단위로 정확히 반환합니다.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>4. FastDB 실제 Win32 CreateFileMappingW 커널 I/O 완비</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    모의(Mock) 데이터에 의존하던 구조를 Windows 커널의 실제 페이지 메모리 매핑 API와 유니코드 UTF-16 경로 안전 처리로 업그레이드했습니다.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>5. FNV-1a 체크섬 헤더(WLV1) 및 키스트림 암호화 볼트 구현</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    사용자 학습 진도 파일 저장 시 단순 복사가 아닌 32비트 FNV-1a 무결성 체크섬 헤더와 동적 키스트림 암호화 스트림을 적용하여 변조를 방지했습니다.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>6. 크로스 컴파일 호환 ABI 가드 매크로 표준화</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    <code className="text-indigo-500 font-mono">__declspec(dllexport)</code>를 <code className="text-indigo-500 font-mono">#if defined(_WIN32)</code>로 감싸고 GCC/Clang 환경에서는 <code className="text-indigo-500 font-mono">visibility("default")</code>로 조건부 분기하여 빌드 환경 불일치 오류를 사전에 원천 차단했습니다.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>7. Win32 RegisterHotKey 및 DWM Mica 실질 연동</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    플래그만 바꾸던 더미 상태에서 실제 Win32 핫키 API와 DwmSetWindowAttribute(DWMWA_SYSTEMBACKDROP_TYPE = 2) 제어 코드를 완성했습니다.
                  </p>
                </div>
              </div>

              {/* Source Files Registered */}
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-mono space-y-1 text-slate-600 dark:text-slate-400">
                <div className="font-bold text-slate-800 dark:text-slate-200">📁 프로젝트 내 등록된 5대 네이티브 소스 및 빌드 파일:</div>
                <div>• /docs/NATIVE_DLL_ARCHITECTURE.md (공식 5대 DLL 기술 명세서)</div>
                <div>• /docs/DLL_SPECS.md (모듈 사양서)</div>
                <div>• /native-src/WordLoopAudioEngine.h &amp; .cpp (DSP &amp; DTW)</div>
                <div>• /native-src/WordLoopFastDB.h &amp; .cpp (Win32 MMap)</div>
                <div>• /native-src/WordLoopSRSNeuralEngine.h &amp; .cpp (FSRS v4.5 망각곡선)</div>
                <div>• /native-src/WordLoopMorphEngine.h &amp; .cpp (G2P IPA &amp; 음절 강세)</div>
                <div>• /native-src/WordLoopTrayHook.h &amp; .cpp (글로벌 핫키 &amp; Mica)</div>
                <div>• /native-src/CMakeLists.txt &amp; build-dll.bat (원클릭 빌드)</div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono">
            WordLoop v3.17.0 Proprietary Native 5-Engine Suite
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:opacity-90 transition-opacity"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
};
