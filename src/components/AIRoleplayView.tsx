import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  CheckCircle2,
  Circle,
  HelpCircle,
  Award,
  ChevronDown,
  ChevronUp,
  Plus,
  ArrowLeft,
  Loader2,
  BookOpen,
  BookmarkPlus,
  Check,
  TrendingUp,
  Flame,
  MessageSquare,
  Globe,
  Sliders,
  X,
  Key,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { ROLEPLAY_SCENARIOS, RoleplayScenario, RoleplayMission } from '../data/roleplayScenariosData';
import { RoleplayMessage, RoleplayReport, VocabItem, SentenceItem } from '../types';
import { speechService } from '../services/speechService';
import { getAuthHeaders, getUserGeminiKey } from '../services/apiClient';

interface AIRoleplayViewProps {
  onAddBookmarkVocab?: (items: VocabItem[]) => void;
  onAddBookmarkSentence?: (items: SentenceItem[]) => void;
  onIncrementGoal?: () => void;
  onOpenApiKeyModal?: () => void;
}

export const AIRoleplayView: React.FC<AIRoleplayViewProps> = ({
  onAddBookmarkVocab,
  onAddBookmarkSentence,
  onIncrementGoal,
  onOpenApiKeyModal,
}) => {
  // User Gemini API Key Verification State
  const [hasUserApiKey, setHasUserApiKey] = useState<boolean>(() => Boolean(getUserGeminiKey().trim()));
  const [showApiKeyRequiredModal, setShowApiKeyRequiredModal] = useState<boolean>(
    () => !Boolean(getUserGeminiKey().trim())
  );
  const [pendingScenario, setPendingScenario] = useState<RoleplayScenario | null>(null);

  // Scenario List & Active Scenario State
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeScenario, setActiveScenario] = useState<RoleplayScenario | null>(null);

  // Custom Scenario Creator Modal State
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customPartnerName, setCustomPartnerName] = useState<string>('');
  const [customPartnerRole, setCustomPartnerRole] = useState<string>('');
  const [customContext, setCustomContext] = useState<string>('');
  const [customMission1, setCustomMission1] = useState<string>('');
  const [customMission2, setCustomMission2] = useState<string>('');
  const [customMission3, setCustomMission3] = useState<string>('');

  // Active Chat State
  const [messages, setMessages] = useState<RoleplayMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);
  const [showMissionDrawer, setShowMissionDrawer] = useState<boolean>(true);
  const [autoPlayAudio, setAutoPlayAudio] = useState<boolean>(true);
  const [showTranslations, setShowTranslations] = useState<Record<string, boolean>>({});
  const [expandedFeedbackId, setExpandedFeedbackId] = useState<string | null>(null);

  // Voice Speech Recognition State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  // Recommended Hints State
  const [currentHints, setCurrentHints] = useState<Array<{ en: string; ko: string }>>([]);

  // Report Modal State
  const [report, setReport] = useState<RoleplayReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [savedPhrases, setSavedPhrases] = useState<Set<number>>(new Set());

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiThinking, liveTranscript]);

  // Listen for User Gemini API Key changes in real time
  useEffect(() => {
    const syncApiKey = () => {
      const hasKey = Boolean(getUserGeminiKey().trim());
      setHasUserApiKey(hasKey);
      if (hasKey) {
        setShowApiKeyRequiredModal(false);
      }
    };
    window.addEventListener('wordloop_api_key_changed', syncApiKey);
    window.addEventListener('storage', syncApiKey);
    return () => {
      window.removeEventListener('wordloop_api_key_changed', syncApiKey);
      window.removeEventListener('storage', syncApiKey);
    };
  }, []);

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      speechService.stop();
    };
  }, []);

  // Launch Scenario Conversation (After API Key Verification)
  const launchScenarioConversation = useCallback((scenario: RoleplayScenario) => {
    speechService.stop();
    setActiveScenario(scenario);
    setCompletedMissions([]);
    setReport(null);
    setSavedPhrases(new Set());
    setShowTranslations({});

    const initialMsg: RoleplayMessage = {
      id: `msg-ai-${Date.now()}`,
      sender: 'ai',
      text: scenario.initialAiMessage.en,
      translationKo: scenario.initialAiMessage.ko,
      timestamp: Date.now(),
    };

    setMessages([initialMsg]);
    setCurrentHints((scenario.recommendedPhrases || []).slice(0, 2));

    if (autoPlayAudio) {
      setTimeout(() => {
        speechService.speakOnce(scenario.initialAiMessage.en);
      }, 300);
    }
  }, [autoPlayAudio]);

  // Auto-start pending scenario once user registers API Key
  useEffect(() => {
    if (hasUserApiKey && pendingScenario) {
      const target = pendingScenario;
      setPendingScenario(null);
      setShowApiKeyRequiredModal(false);
      launchScenarioConversation(target);
    }
  }, [hasUserApiKey, pendingScenario, launchScenarioConversation]);

  // Initialize Scenario Conversation (Checks User API Key First)
  const handleStartScenario = (scenario: RoleplayScenario) => {
    const currentKey = getUserGeminiKey().trim();
    if (!currentKey) {
      setHasUserApiKey(false);
      setPendingScenario(scenario);
      setShowApiKeyRequiredModal(true);
      return;
    }
    launchScenarioConversation(scenario);
  };

  // Toggle Speech Recognition
  const toggleSpeechRecognition = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('사용 중인 브라우저가 음성 인식을 지원하지 않습니다. Chrome 브라우저를 권장합니다.');
      return;
    }

    try {
      speechService.stop();
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsRecording(true);
        setLiveTranscript('');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setLiveTranscript(transcript);
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (liveTranscript.trim()) {
          handleSendMessage(liveTranscript.trim());
          setLiveTranscript('');
        }
      };

      recognition.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      setIsRecording(false);
    }
  };

  // Send User Message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !activeScenario || isAiThinking) return;

    speechService.stop();
    setInputText('');
    setLiveTranscript('');

    const userMsgId = `msg-user-${Date.now()}`;
    const userMsg: RoleplayMessage = {
      id: userMsgId,
      sender: 'user',
      text,
      translationKo: '사용자 발화',
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsAiThinking(true);

    if (onIncrementGoal) {
      onIncrementGoal();
    }

    try {
      const res = await fetch('/api/ai/roleplay/chat', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          scenario: activeScenario,
          messages: updatedMessages,
          userMessage: text,
          completedMissions,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Update user message with AI feedback
        if (data.feedback) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === userMsgId
                ? {
                    ...m,
                    feedback: data.feedback,
                  }
                : m
            )
          );
          setExpandedFeedbackId(userMsgId);
        }

        // Add completed mission IDs
        if (Array.isArray(data.newCompletedMissionIds) && data.newCompletedMissionIds.length > 0) {
          setCompletedMissions((prev) => {
            const next = new Set([...prev, ...data.newCompletedMissionIds]);
            return Array.from(next);
          });
        }

        // Add AI response
        if (data.aiResponse) {
          const aiMsg: RoleplayMessage = {
            id: `msg-ai-${Date.now()}`,
            sender: 'ai',
            text: data.aiResponse.en,
            translationKo: data.aiResponse.ko,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, aiMsg]);

          if (autoPlayAudio) {
            speechService.speakOnce(data.aiResponse.en);
          }
        }

        if (Array.isArray(data.recommendedNextHints) && data.recommendedNextHints.length > 0) {
          setCurrentHints(data.recommendedNextHints);
        }
      }
    } catch (err) {
      console.error('Roleplay chat error:', err);
    } finally {
      setIsAiThinking(false);
    }
  };

  // Generate End-of-Dialogue Report
  const handleFinishAndGenerateReport = async () => {
    if (!activeScenario || messages.length < 2) {
      alert('최소 1회 이상 대화를 주고받은 후 리포트를 생성할 수 있습니다.');
      return;
    }

    speechService.stop();
    setIsGeneratingReport(true);

    try {
      const res = await fetch('/api/ai/roleplay/report', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          scenario: activeScenario,
          messages,
          completedMissions,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.report) {
        setReport(data.report);
      }
    } catch (err) {
      console.error('Report error:', err);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Bookmark Key Phrases to user vocab / sentences
  const handleBookmarkPhrase = (phrase: { en: string; ko: string; tip?: string }, idx: number) => {
    if (onAddBookmarkSentence) {
      const sentenceItem: SentenceItem = {
        id: `roleplay-sent-${Date.now()}-${idx}`,
        text: phrase.en,
        meaning: phrase.ko,
        context: activeScenario?.title || 'AI 롤플레잉 핵심 표현',
        categoryId: 'daily',
        isCustom: true,
        isLearned: false,
        masteryLevel: 1,
        isBookmarked: true,
      };
      onAddBookmarkSentence([sentenceItem]);
      setSavedPhrases((prev) => new Set(prev).add(idx));
    }
  };

  const handleBookmarkAllPhrases = () => {
    if (!report?.highlightPhrases || !onAddBookmarkSentence) return;
    const items: SentenceItem[] = report.highlightPhrases.map((p, idx) => ({
      id: `roleplay-sent-${Date.now()}-${idx}`,
      text: p.en,
      meaning: p.ko,
      context: activeScenario?.title || 'AI 롤플레잉 핵심 표현',
      categoryId: 'daily',
      isCustom: true,
      isLearned: false,
      masteryLevel: 1,
      isBookmarked: true,
    }));
    onAddBookmarkSentence(items);
    setSavedPhrases(new Set(report.highlightPhrases.map((_, i) => i)));
  };

  // Create Custom Scenario Handler
  const handleCreateCustomScenario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    const newScenario: RoleplayScenario = {
      id: `custom-scenario-${Date.now()}`,
      title: customTitle.trim(),
      category: 'custom',
      categoryLabel: '나만의 맞춤',
      categoryIcon: '✨',
      gradeLevel: 'general',
      gradeLabel: '자율 맞춤',
      targetVocabBadge: '사용자 지정 커스텀 상황',
      level: '중급',
      levelEn: 'Intermediate',
      partnerName: customPartnerName.trim() || 'AI Partner',
      partnerAvatar: '🤖',
      partnerRole: customPartnerRole.trim() || '대화 상대방',
      userRole: '학습자',
      description: customContext.trim() || '사용자가 직접 설정한 커스텀 상황 롤플레잉입니다.',
      situationContext: customContext.trim() || 'Custom conversation scenario set by user.',
      missions: [
        {
          id: 'mission-1',
          text: customMission1.trim() || '상황에 맞는 인사 및 대화 시작하기',
          description: '자연스러운 인사와 함께 목적을 말하세요.',
          hint: 'Hello! I would like to talk about this topic.',
        },
        {
          id: 'mission-2',
          text: customMission2.trim() || '세부 사항 질문 또는 요청하기',
          description: '궁금한 점이나 원하는 조건을 구체적으로 물어보세요.',
          hint: 'Could you please explain more details about this?',
        },
        {
          id: 'mission-3',
          text: customMission3.trim() || '대화 마무리 및 감사 인사하기',
          description: '합의된 내용을 정리하고 감사를 전하세요.',
          hint: 'Thank you for your time and assistance today!',
        },
      ],
      recommendedPhrases: [
        { en: 'Could you give me some more information?', ko: '정보를 조금 더 알려주실 수 있나요?' },
        { en: 'I appreciate your helpful advice.', ko: '도움이 되는 조언 감사합니다.' },
      ],
      initialAiMessage: {
        en: `Hello! I am ${customPartnerName || 'your partner'}. How can I assist you with ${customTitle}?`,
        ko: `안녕하세요! 저는 ${customPartnerName || '파트너'}입니다. ${customTitle}에 대해 어떻게 도와드릴까요?`,
      },
      tips: ['자신감 있게 말하고, 언제든 마이크를 눌러 음성으로 대화해 보세요.'],
    };

    setShowCustomModal(false);
    handleStartScenario(newScenario);
  };

  // Filtered Scenarios
  const filteredScenarios = ROLEPLAY_SCENARIOS.filter((sc) => {
    const matchGrade = selectedGrade === 'all' || sc.gradeLevel === selectedGrade;
    const matchCat = selectedCategory === 'all' || sc.category === selectedCategory;
    const matchSearch =
      !searchQuery.trim() ||
      sc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sc.partnerRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sc.targetVocabBadge && sc.targetVocabBadge.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sc.gradeLabel && sc.gradeLabel.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchGrade && matchCat && matchSearch;
  });

  // -------------------------------------------------------------
  // RENDER: SCENARIO SELECTION HUB (If no active scenario)
  // -------------------------------------------------------------
  if (!activeScenario) {
    return (
      <div className="space-y-5 max-w-6xl mx-auto pb-12">
        {/* Banner Header */}
        <div className="rounded-3xl p-5 sm:p-8 bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-900 text-white border border-emerald-500/30 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  <span>Gemini AI 대화형 롤플레잉 (AI Roleplay)</span>
                </div>

                {/* Live API Key Verification Badge */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenApiKeyModal) {
                      onOpenApiKeyModal();
                    } else {
                      setShowApiKeyRequiredModal(true);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-extrabold transition-all active:scale-95 cursor-pointer ${
                    hasUserApiKey
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                      : 'bg-amber-500/25 text-amber-200 border-amber-400/60 hover:bg-amber-500/35 animate-pulse'
                  }`}
                  title="사용자 Gemini API 키 상태 확인 및 설정"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>
                    {hasUserApiKey
                      ? '사용자 API 키 확인됨'
                      : '⚠️ 사용자 API 키 미등록 (필수)'}
                  </span>
                </button>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                실전 상황별 원어민 AI 롤플레잉
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
                스타벅스 주문, 공항 입국 심사, 영어 면접, 호텔 체크인 등 실전 상황에서 AI 원어민과 실시간 음성 대화를 나누고, 실시간 표현 첨삭과 미션 클리어 피드백을 받아보세요!
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-auto">
              <button
                type="button"
                onClick={() => {
                  if (!getUserGeminiKey().trim()) {
                    setHasUserApiKey(false);
                    setShowApiKeyRequiredModal(true);
                    return;
                  }
                  setShowCustomModal(true);
                }}
                className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>나만의 커스텀 상황 만들기</span>
              </button>
            </div>
          </div>
        </div>

        {/* User API Key Verification Notice Banner */}
        {!hasUserApiKey ? (
          <div className="p-4 sm:p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400/70 dark:border-amber-500/50 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-200">
                    🔑 사용자 Gemini API 키가 있어야 이용할 수 있습니다 (현재 미등록)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                    API 키 필수
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                  <strong>'Gemini AI 대화형 롤플레잉 (AI Roleplay) · 실전 상황별 원어민 AI 롤플레잉'</strong>은 사용자의 개인 Gemini API 키를 확인하여 동작합니다. 원어민 AI와 실시간 대화를 시작하려면 먼저 <strong>사용자 API 키</strong>를 등록해 주세요.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (onOpenApiKeyModal) {
                    onOpenApiKeyModal();
                  } else {
                    setShowApiKeyRequiredModal(true);
                  }
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all active:scale-95"
              >
                <Key className="w-3.5 h-3.5" />
                <span>사용자 API 키 등록 / 확인하기</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                ✅ 사용자 Gemini API 키가 확인되었습니다. 아래에서 원하는 실전 상황 시나리오를 선택해 대화를 시작하세요!
              </span>
            </div>
            {onOpenApiKeyModal && (
              <button
                type="button"
                onClick={onOpenApiKeyModal}
                className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-extrabold text-[11px] flex items-center gap-1 transition-all"
              >
                <Key className="w-3 h-3" />
                <span>API 키 관리</span>
              </button>
            )}
          </div>
        )}

        {/* User API Key Requirement Popup Modal (Shown on Selection or Start without Key) */}
        {showApiKeyRequiredModal && !hasUserApiKey && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-amber-500/40 shadow-2xl space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30 shrink-0">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      사용자 API 키 확인 안내
                    </span>
                    <h3 className="font-black text-base text-slate-900 dark:text-white mt-1">
                      사용자 Gemini API 키가 필요합니다
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowApiKeyRequiredModal(false);
                    setPendingScenario(null);
                  }}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1">
                  <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-[11px]">
                    ✨ 선택하신 기능
                  </p>
                  <p className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                    Gemini AI 대화형 롤플레잉 (AI Roleplay)
                  </p>
                  <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                    실전 상황별 원어민 AI 롤플레잉
                  </p>
                  {pendingScenario && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold pt-1">
                      선택 시나리오: {pendingScenario.title}
                    </p>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-1.5">
                  <p className="font-extrabold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>API 키 확인 결과: 등록된 사용자 API 키가 없습니다</span>
                  </p>
                  <p className="text-[11px] sm:text-xs leading-relaxed">
                    실전 상황별 원어민 AI 롤플레잉(실시간 음성 대화, 표현 첨삭, 미션 진단 리포트)을 이용하시려면 <strong>사용자에게 개인 Gemini API 키(API Key)가 있어야 합니다.</strong>
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/50 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-indigo-900 dark:text-indigo-200">
                    <p className="font-bold">아직 API 키가 없으신가요?</p>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-300">
                      Google AI Studio에서 1분 만에 무료 발급 가능
                    </p>
                  </div>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <span>무료 키 발급</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowApiKeyRequiredModal(false);
                    setPendingScenario(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs transition-colors"
                >
                  시나리오 먼저 둘러보기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowApiKeyRequiredModal(false);
                    if (onOpenApiKeyModal) {
                      onOpenApiKeyModal();
                    }
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>지금 사용자 API 키 등록하기</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Grade / Curriculum Level Tabs */}
        <div className="bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: '전체 시나리오', icon: '🌟', count: ROLEPLAY_SCENARIOS.length },
            {
              id: 'elementary',
              label: '초등 (3~6학년)',
              sub: '800 필수 어휘',
              icon: '🎒',
              count: ROLEPLAY_SCENARIOS.filter((s) => s.gradeLevel === 'elementary').length,
            },
            {
              id: 'middle',
              label: '중학 (1~3학년)',
              sub: '1,200 빈출 어휘',
              icon: '🏫',
              count: ROLEPLAY_SCENARIOS.filter((s) => s.gradeLevel === 'middle').length,
            },
            {
              id: 'high_sat',
              label: '고등 / 수능 / EBS',
              sub: '2,000 학술 어휘',
              icon: '🎓',
              count: ROLEPLAY_SCENARIOS.filter((s) => s.gradeLevel === 'high_sat').length,
            },
            {
              id: 'general',
              label: '실전 일상·비즈니스',
              sub: '글로벌 실전 회화',
              icon: '💼',
              count: ROLEPLAY_SCENARIOS.filter((s) => s.gradeLevel === 'general').length,
            },
          ].map((grade) => (
            <button
              key={grade.id}
              onClick={() => {
                setSelectedGrade(grade.id);
                setSelectedCategory('all');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                selectedGrade === grade.id
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/25 font-black scale-[1.02]'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <span className="text-base">{grade.icon}</span>
              <div className="text-left">
                <div className="flex items-center gap-1.5 leading-none">
                  <span>{grade.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      selectedGrade === grade.id
                        ? 'bg-slate-950/20 text-slate-950'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {grade.count}
                  </span>
                </div>
                {grade.sub && (
                  <p
                    className={`text-[9px] mt-0.5 ${
                      selectedGrade === grade.id
                        ? 'text-slate-900 font-bold'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {grade.sub}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Category Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar py-1">
            {[
              { id: 'all', label: '전체 테마', icon: '🌟' },
              { id: 'elementary', label: '초등생활', icon: '🎒' },
              { id: 'middle', label: '중학일상', icon: '🏫' },
              { id: 'high_sat', label: '고등·학술', icon: '🎓' },
              { id: 'cafe', label: '카페·식당', icon: '☕' },
              { id: 'travel', label: '여행·공항', icon: '✈️' },
              { id: 'business', label: '비즈니스·면접', icon: '💼' },
              { id: 'daily', label: '사교·스몰토크', icon: '🎉' },
              { id: 'emergency', label: '병원·응급', icon: '🏥' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="시나리오 / 어휘 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scenarios Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="group p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between relative overflow-hidden"
            >
              <div className="space-y-3">
                {/* Card Top: Grade Badge & Category / Level Badges */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl">{scenario.categoryIcon}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {scenario.categoryLabel}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        scenario.level === '초급'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : scenario.level === '중급'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                      }`}
                    >
                      {scenario.level} ({scenario.levelEn})
                    </span>
                  </div>

                  {/* Grade & Target Vocab Connection Badge */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {scenario.gradeLabel && (
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border ${
                          scenario.gradeLevel === 'elementary'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : scenario.gradeLevel === 'middle'
                            ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                            : scenario.gradeLevel === 'high_sat'
                            ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {scenario.gradeLabel}
                      </span>
                    )}
                    {scenario.targetVocabBadge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
                        {scenario.targetVocabBadge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {scenario.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {scenario.description}
                  </p>
                </div>

                {/* Partner Persona Bar */}
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-2.5 text-xs">
                  <span className="text-2xl">{scenario.partnerAvatar}</span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white leading-none">
                      {scenario.partnerName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      상대방 역할: {scenario.partnerRole}
                    </p>
                  </div>
                </div>

                {/* Missions Preview */}
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <span>🎯 실전 달성 미션 ({scenario.missions.length}개)</span>
                  </span>
                  <ul className="space-y-1">
                    {scenario.missions.slice(0, 2).map((m, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 truncate"
                      >
                        <Circle className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{m.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Start Roleplay Button */}
              <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleStartScenario(scenario)}
                  className={`w-full py-2.5 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 ${
                    hasUserApiKey
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  }`}
                >
                  {hasUserApiKey ? (
                    <>
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>롤플레잉 대화 시작하기</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" />
                      <span>롤플레잉 대화 시작 (API 키 확인)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Custom Scenario Builder Modal */}
        {showCustomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">✨</span>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    나만의 맞춤 롤플레잉 생성
                  </h3>
                </div>
                <button
                  onClick={() => setShowCustomModal(false)}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCustomScenario} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    상황 제목 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: 미국 렌터카 반납 및 보험 청구, 프랑스 와이너리 투어 질문"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      AI 상대방 이름
                    </label>
                    <input
                      type="text"
                      placeholder="예: James, Emily"
                      value={customPartnerName}
                      onChange={(e) => setCustomPartnerName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      상대방 직업 / 역할
                    </label>
                    <input
                      type="text"
                      placeholder="예: 렌터카 직원, 가이드"
                      value={customPartnerRole}
                      onChange={(e) => setCustomPartnerRole(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    구체적 상황 설명
                  </label>
                  <textarea
                    rows={2}
                    placeholder="예: 샌프란시스코 공항 렌터카 지점에서 차량에 가벼운 스크래치가 난 상태로 반납하며 보험 처리를 문의하는 상황"
                    value={customContext}
                    onChange={(e) => setCustomContext(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white resize-none"
                  />
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    🎯 대화 중 달성할 미션 3가지
                  </label>
                  <input
                    type="text"
                    placeholder="미션 1 (예: 차량 반납 의사 밝히기)"
                    value={customMission1}
                    onChange={(e) => setCustomMission1(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                  />
                  <input
                    type="text"
                    placeholder="미션 2 (예: 보험 적용 여부 묻기)"
                    value={customMission2}
                    onChange={(e) => setCustomMission2(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                  />
                  <input
                    type="text"
                    placeholder="미션 3 (예: 최종 정산 내역서 요청하기)"
                    value={customMission3}
                    onChange={(e) => setCustomMission3(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-black text-slate-950 shadow-md"
                  >
                    커스텀 대화 시작하기
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: ACTIVE CONVERSATION CHATROOM
  // -------------------------------------------------------------
  const totalMissionsCount = activeScenario.missions.length;
  const completedCount = completedMissions.length;
  const progressPercent = Math.round((completedCount / totalMissionsCount) * 100);

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8.5rem)] md:h-[calc(100vh-9.5rem)] min-h-[500px]">
      {/* Top Header Bar */}
      <div className="p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setActiveScenario(null)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
            title="시나리오 목록으로 나가기"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl sm:text-3xl shrink-0">{activeScenario.partnerAvatar}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                  {activeScenario.title}
                </h3>
                <span className="hidden sm:inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                  {activeScenario.partnerName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {activeScenario.situationContext}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Mission Accordion Toggle */}
          <button
            onClick={() => setShowMissionDrawer(!showMissionDrawer)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
              showMissionDrawer
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <span>🎯</span>
            <span className="hidden sm:inline">미션</span>
            <span className="font-black text-emerald-500">
              {completedCount}/{totalMissionsCount}
            </span>
            {showMissionDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Auto TTS Toggle */}
          <button
            onClick={() => setAutoPlayAudio(!autoPlayAudio)}
            className={`p-2 rounded-xl border transition-all ${
              autoPlayAudio
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
            title={autoPlayAudio ? 'AI 답변 자동 음성 읽기 ON' : 'AI 답변 자동 음성 읽기 OFF'}
          >
            {autoPlayAudio ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Complete & Report Button */}
          <button
            onClick={handleFinishAndGenerateReport}
            disabled={isGeneratingReport || messages.length < 2}
            className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isGeneratingReport ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Award className="w-3.5 h-3.5" />
            )}
            <span>리포트</span>
          </button>
        </div>
      </div>

      {/* Mission Accordion Drawer */}
      {showMissionDrawer && (
        <div className="mt-2 p-3.5 rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/30 space-y-2 shrink-0 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <span>🎯 이번 시나리오 3대 실전 미션</span>
            </span>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              달성률 {progressPercent}% ({completedCount}/{totalMissionsCount} 완료)
            </span>
          </div>

          <div className="w-full h-1.5 bg-emerald-200/60 dark:bg-emerald-900/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            {activeScenario.missions.map((mission) => {
              const isCompleted = completedMissions.includes(mission.id);
              return (
                <div
                  key={mission.id}
                  className={`p-2.5 rounded-2xl border text-xs transition-all ${
                    isCompleted
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-900 dark:text-emerald-100 font-bold'
                      : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-1.5">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className={`text-xs ${isCompleted ? 'line-through text-emerald-700 dark:text-emerald-300' : ''}`}>
                        {mission.text}
                      </p>
                      <button
                        onClick={() => {
                          setInputText(mission.hint);
                        }}
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium hover:underline mt-0.5 block text-left"
                      >
                        💡 힌트 표현 입력
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chat Thread Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 my-2 rounded-3xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 no-scrollbar">
        {messages.map((msg) => {
          const isAi = msg.sender === 'ai';
          const isTransVisible = showTranslations[msg.id];
          const isFeedbackOpen = expandedFeedbackId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isAi ? 'items-start' : 'items-end'} animate-in fade-in`}
            >
              {/* Message Bubble Container */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 shadow-sm relative space-y-2 ${
                  isAi
                    ? 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-white rounded-tl-sm'
                    : 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-tr-sm shadow-emerald-600/10'
                }`}
              >
                {/* Header info in bubble */}
                <div className="flex items-center justify-between gap-2 pb-1 border-b border-black/5 dark:border-white/10 text-[11px] font-bold">
                  <span className="flex items-center gap-1.5 opacity-90">
                    <span>{isAi ? activeScenario.partnerAvatar : '👤'}</span>
                    <span>{isAi ? activeScenario.partnerName : '나 (Learner)'}</span>
                  </span>

                  <div className="flex items-center gap-1">
                    {/* Speak Text Button */}
                    <button
                      onClick={() => speechService.speakOnce(msg.text)}
                      className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                      title="발음 듣기"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Korean Translation Toggle */}
                    {msg.translationKo && (
                      <button
                        onClick={() =>
                          setShowTranslations((prev) => ({
                            ...prev,
                            [msg.id]: !prev[msg.id],
                          }))
                        }
                        className="px-1.5 py-0.5 rounded-lg text-[10px] bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
                      >
                        {isTransVisible ? '한글 숨김' : '한글 번역'}
                      </button>
                    )}
                  </div>
                </div>

                {/* English Text Content */}
                <p className="text-sm sm:text-base font-medium leading-relaxed tracking-wide">
                  {msg.text}
                </p>

                {/* Korean Translation (if toggled) */}
                {isTransVisible && (
                  <div className="pt-1.5 mt-1 border-t border-black/5 dark:border-white/10 text-xs opacity-90 font-normal leading-relaxed">
                    🇰🇷 {msg.translationKo}
                  </div>
                )}
              </div>

              {/* AI Real-time Rephrase Feedback Chip for User message */}
              {!isAi && msg.feedback && (
                <div className="mt-1.5 max-w-[85%] sm:max-w-[75%] space-y-1">
                  <button
                    onClick={() =>
                      setExpandedFeedbackId(isFeedbackOpen ? null : msg.id)
                    }
                    className="px-3 py-1 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[11px] font-bold flex items-center gap-1 transition-all ml-auto"
                  >
                    <Sparkles className="w-3 h-3 text-purple-500 animate-pulse" />
                    <span>AI 원어민 추천 표현 & 첨삭</span>
                    {isFeedbackOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {isFeedbackOpen && (
                    <div className="p-3.5 rounded-2xl bg-purple-50/90 dark:bg-purple-950/50 border border-purple-500/30 text-xs space-y-2 text-purple-950 dark:text-purple-100 animate-in slide-in-from-top-1 shadow-md">
                      <div>
                        <span className="font-extrabold text-purple-600 dark:text-purple-400 block mb-0.5">
                          ✨ 더 자연스러운 원어민 표현:
                        </span>
                        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 font-bold text-slate-900 dark:text-white">
                          <span>"{msg.feedback.rephrasedBetter}"</span>
                          <button
                            onClick={() =>
                              msg.feedback?.rephrasedBetter &&
                              speechService.speakOnce(msg.feedback.rephrasedBetter)
                            }
                            className="p-1 rounded-lg hover:bg-purple-500/20 text-purple-500"
                            title="추천 표현 발음 듣기"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {msg.feedback.grammarNotes && (
                        <div>
                          <span className="font-bold text-slate-500 dark:text-slate-400 block">
                            💡 코칭 & 뉘앙스:
                          </span>
                          <p className="text-slate-700 dark:text-slate-200 mt-0.5">
                            {msg.feedback.grammarNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* AI Typing Indicator */}
        {isAiThinking && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-fit text-xs text-slate-500 animate-pulse">
            <span className="text-base">{activeScenario.partnerAvatar}</span>
            <span>{activeScenario.partnerName}님이 답변을 생각하고 있습니다...</span>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Recommended Hints Carousel Bar */}
      {currentHints.length > 0 && (
        <div className="py-1.5 px-2 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs">
          <span className="font-bold text-slate-400 whitespace-nowrap flex items-center gap-1 text-[11px]">
            <span>💡 추천 표현:</span>
          </span>
          {currentHints.map((hint, idx) => (
            <button
              key={idx}
              onClick={() => setInputText(hint.en)}
              className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 text-xs font-medium whitespace-nowrap transition-all text-left flex items-center gap-1.5"
            >
              <span>"{hint.en}"</span>
              <span className="text-[10px] text-slate-400">({hint.ko})</span>
            </button>
          ))}
        </div>
      )}

      {/* Live Voice Transcript Banner (When Recording) */}
      {isRecording && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-between gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 animate-pulse shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span>음성을 듣고 있습니다...</span>
            <span className="font-mono text-slate-900 dark:text-white">
              "{liveTranscript || '말씀해 주세요...'}"
            </span>
          </div>
          <button
            onClick={toggleSpeechRecognition}
            className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-[11px] font-bold hover:bg-rose-600"
          >
            녹음 완료
          </button>
        </div>
      )}

      {/* Bottom Input Control Bar */}
      <div className="p-2 sm:p-3 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg shrink-0 flex items-center gap-2">
        {/* Large Mic Voice Input Button */}
        <button
          onClick={toggleSpeechRecognition}
          className={`p-3 rounded-2xl flex items-center justify-center transition-all active:scale-95 shrink-0 ${
            isRecording
              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30 animate-pulse'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
          }`}
          title={isRecording ? '음성 녹음 중지' : '마이크로 영어 말하기 (Speech-to-Text)'}
        >
          {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Text Input Field */}
        <input
          type="text"
          placeholder="영어로 메시지를 입력하거나 마이크를 눌러 말씀하세요..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={isAiThinking}
          className="flex-1 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
        />

        {/* Send Button */}
        <button
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || isAiThinking}
          className="p-3 rounded-2xl bg-slate-900 dark:bg-emerald-500 hover:bg-slate-800 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-bold transition-all active:scale-95 disabled:opacity-40 shrink-0 shadow-md"
          title="메시지 전송"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Comprehensive Report Modal */}
      {report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                  <Award className="w-3.5 h-3.5" />
                  <span>롤플레잉 최종 진단 리포트</span>
                </div>
                <h3 className="font-black text-xl text-slate-900 dark:text-white">
                  {report.scenarioTitle}
                </h3>
              </div>

              <button
                onClick={() => setReport(null)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 border border-emerald-500/30">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">종합 점수</p>
                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {report.overallScore}점
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">말하기 유창성</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {report.fluencyScore}점
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">문법 & 정확도</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {report.accuracyScore}점
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">미션 달성률</p>
                <p className="text-2xl font-black text-emerald-500 mt-1">
                  {report.missionScore}%
                </p>
              </div>
            </div>

            {/* AI Summary Feedback */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>AI 튜터 종합 총평</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {report.feedbackSummary}
              </p>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <h5 className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>잘하신 점 (Strengths)</span>
                </h5>
                <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                  {report.strengths.map((str, i) => (
                    <li key={i}>• {str}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <h5 className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  <span>개선 포인트 (Actionable Tips)</span>
                </h5>
                <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                  {report.improvements.map((imp, i) => (
                    <li key={i}>• {imp}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Highlighted Expressions to Bookmark */}
            {report.highlightPhrases && report.highlightPhrases.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <BookmarkPlus className="w-4 h-4 text-emerald-500" />
                    <span>이번 대화에서 체득한 핵심 표현 ({report.highlightPhrases.length}개)</span>
                  </h4>
                  <button
                    onClick={handleBookmarkAllPhrases}
                    className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>전체 내 문장장에 저장</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {report.highlightPhrases.map((phrase, idx) => {
                    const isSaved = savedPhrases.has(idx);
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            "{phrase.en}"
                          </p>
                          <p className="text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {phrase.ko}
                          </p>
                        </div>

                        <button
                          onClick={() => handleBookmarkPhrase(phrase, idx)}
                          disabled={isSaved}
                          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
                            isSaved
                              ? 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm'
                          }`}
                        >
                          {isSaved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          <span>{isSaved ? '저장됨' : '암기장 추가'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-4 flex flex-col sm:flex-row justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setReport(null);
                  handleStartScenario(activeScenario);
                }}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>이 시나리오 다시 연습하기</span>
              </button>
              <button
                onClick={() => {
                  setReport(null);
                  setActiveScenario(null);
                }}
                className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <span>다른 시나리오 선택하기</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
