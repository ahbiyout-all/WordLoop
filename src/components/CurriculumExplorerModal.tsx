import React, { useState } from 'react';
import { BookOpen, GraduationCap, Trophy, Sparkles, Plus, Check, Search, X, Layers, Download, FileSpreadsheet, FileCode, Database, Volume2 } from 'lucide-react';
import { CURRICULUM_GRADES, getAllCurriculumVocabList } from '../data/curriculumVocab';
import { exportCurriculum3000ToCSV, OFFICIAL_CURRICULUM_3000_LIST } from '../data/officialCurriculum3000';
import { VocabItem } from '../types';
import { formatEduVocabMeaning, formatEduSentenceMeaning } from '../utils/meaningUtils';
import { speechService } from '../services/speechService';

interface CurriculumExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVocabItems: (items: VocabItem[]) => void;
  existingVocabList: VocabItem[];
  showEduTag?: boolean;
}

export const CurriculumExplorerModal: React.FC<CurriculumExplorerModalProps> = ({
  isOpen,
  onClose,
  onAddVocabItems,
  existingVocabList,
  showEduTag = false,
}) => {
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [addedIds, setAddedIds] = useState<Set<string>>(() => new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState<number>(60);
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);

  if (!isOpen) return null;

  const allCurriculumWords = getAllCurriculumVocabList();
  const existingWordSet = new Set(existingVocabList.map((v) => v.word.toLowerCase()));

  const currentGradeWords = allCurriculumWords.filter((item) => {
    const matchesGrade = selectedGrade === 'all' || item.categoryId === selectedGrade;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.word.toLowerCase().includes(q) ||
      item.meaning.includes(q) ||
      item.sentence.toLowerCase().includes(q) ||
      item.sentenceMeaning.includes(q);
    return matchesGrade && matchesSearch;
  });

  const displayedWords = currentGradeWords.slice(0, visibleLimit);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSpeakWord = (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSpeakingWord(word);
    speechService.speakOnce(word, 'en-US');
    setTimeout(() => setSpeakingWord(null), 1000);
  };

  const handleAddSingle = (item: VocabItem) => {
    onAddVocabItems([item]);
    setAddedIds((prev) => new Set(prev).add(item.id));
  };

  const handleAddAllCurrentGrade = () => {
    const toAdd = currentGradeWords.filter(
      (item) => !existingWordSet.has(item.word.toLowerCase()) && !addedIds.has(item.id)
    );
    if (toAdd.length > 0) {
      onAddVocabItems(toAdd);
      const newAdded = new Set(addedIds);
      toAdd.forEach((item) => newAdded.add(item.id));
      setAddedIds(newAdded);
      showToast(`${toAdd.length}개 단어가 내 단어장에 성공적으로 추가되었습니다!`);
    } else {
      showToast('현재 목록의 모든 단어가 이미 내 단어장에 추가되어 있습니다.');
    }
  };

  const handleDownloadCSV = () => {
    const csvContent = '\uFEFF' + exportCurriculum3000ToCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '2026_교육부_개정_초중고_기본어휘_3000.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('교육부 3,000어휘 CSV 데이터 파일이 다운로드되었습니다.');
  };

  const handleDownloadJSON = () => {
    const jsonContent = JSON.stringify(OFFICIAL_CURRICULUM_3000_LIST, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '2026_교육부_개정_초중고_기본어휘_3000.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('교육부 3,000어휘 JSON 데이터 파일이 다운로드되었습니다.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-5 w-full max-w-4xl shadow-2xl space-y-2 sm:space-y-3.5 animate-in fade-in zoom-in duration-150 h-[92dvh] sm:h-[88vh] max-h-[92dvh] sm:max-h-[88vh] flex flex-col relative overflow-hidden">
        
        {toastMessage && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 px-3.5 py-1.5 rounded-2xl text-[11px] sm:text-xs font-black shadow-xl border border-slate-700 dark:border-emerald-400 flex items-center gap-1.5 animate-bounce">
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 sm:pb-3 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="font-extrabold text-xs sm:text-base text-slate-900 dark:text-white">
                  2026 초·중·고 교과서 필수 어휘 보물창고
                </h3>
                <span className="text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  교육부 3,000 DB
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                2026 개정 교육과정 초등(*), 중학(**), 고등/수능 필수 기본어휘 검색 및 일괄 추가
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* DB Download & Quick Info Toolbar */}
        <div className="p-2 sm:p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 rounded-xl sm:rounded-2xl flex flex-row items-center justify-between gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 min-w-0">
            <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">공식 3,000개 (초 800·중 1,000·고 1,200)</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              onClick={handleDownloadCSV}
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>CSV</span>
            </button>
            <button
              onClick={handleDownloadJSON}
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <FileCode className="w-3 h-3 text-indigo-500 shrink-0" />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {/* Grade Selector Tabs (Compact 4-Column Row) */}
        <div className="grid grid-cols-4 gap-1 sm:gap-2 shrink-0">
          {CURRICULUM_GRADES.map((g) => {
            const isSelected = selectedGrade === g.id;
            return (
              <button
                key={g.id}
                onClick={() => {
                  setSelectedGrade(g.id);
                  setVisibleLimit(60);
                }}
                className={`p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl border text-center sm:text-left transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent shadow-md ring-1 ring-slate-400'
                    : 'bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-0.5 sm:gap-1">
                  <span className="text-[10px] sm:text-xs font-black truncate">{g.gradeLabel}</span>
                  <span className={`text-[8px] sm:text-[10px] font-extrabold px-1 sm:px-1.5 py-0.5 rounded-md self-center sm:self-auto ${
                    isSelected ? 'bg-white/20 text-white dark:bg-slate-800/40 dark:text-slate-900' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {g.targetCount}
                  </span>
                </div>
                <p className={`hidden sm:block text-[10px] sm:text-[11px] mt-0.5 line-clamp-1 ${
                  isSelected ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {g.levelTitle}
                </p>
              </button>
            );
          })}
        </div>

        {/* Filter Toolbar & Batch Import */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleLimit(60);
              }}
              placeholder="단어, 뜻, 예문 실시간 검색..."
              className="w-full pl-7 sm:pl-8 pr-6 sm:pr-7 py-1.5 sm:py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setVisibleLimit(60);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 justify-between sm:justify-end shrink-0">
            <span className="text-[10px] sm:text-xs font-extrabold text-emerald-600 dark:text-emerald-400 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 whitespace-nowrap">
              {currentGradeWords.length.toLocaleString()}개 단어
            </span>

            <button
              onClick={handleAddAllCurrentGrade}
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[10px] sm:text-xs flex items-center gap-1 shadow-xs transition-all shrink-0 cursor-pointer active:scale-98"
            >
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>전체 단어장에 추가</span>
            </button>
          </div>
        </div>

        {/* Word Cards Scrollable Area with min-h-0 and custom-scrollbar */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 pb-4 space-y-1.5 sm:space-y-2">
          {displayedWords.length === 0 ? (
            <div className="p-8 sm:p-12 text-center text-slate-400 text-xs space-y-2">
              <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="font-bold">검색 조건에 해당되는 교과서 단어가 없습니다.</p>
              <p className="text-[11px] text-slate-400">철자나 한국어 뜻을 다시 확인해 보세요.</p>
            </div>
          ) : (
            <>
              {displayedWords.map((item) => {
                const isAlreadyInVocab = existingWordSet.has(item.word.toLowerCase()) || addedIds.has(item.id);
                const isSpeaking = speakingWord === item.word;

                return (
                  <div
                    key={item.id}
                    className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50/90 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 sm:gap-3 hover:border-emerald-500/50 transition-all"
                  >
                    <div className="space-y-0.5 sm:space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white font-mono">
                          {item.word}
                        </span>
                        
                        {/* Pronunciation Audio Button */}
                        <button
                          type="button"
                          onClick={(e) => handleSpeakWord(item.word, e)}
                          className={`p-0.5 sm:p-1 rounded-lg transition-colors cursor-pointer ${
                            isSpeaking
                              ? 'bg-emerald-500 text-white animate-pulse'
                              : 'text-slate-400 hover:text-emerald-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                          title={`${item.word} 발음 듣기`}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>

                        {item.ipa && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.ipa}
                          </span>
                        )}
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {item.partOfSpeech}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                          item.categoryId === 'elementary'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : item.categoryId === 'middle'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        }`}>
                          {item.categoryId === 'elementary' ? '초등' : item.categoryId === 'middle' ? '중학' : '고등/수능'}
                        </span>
                      </div>

                      <p className="text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {formatEduVocabMeaning(item.meaning, showEduTag)}
                      </p>

                      <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {item.sentence} <span className="text-slate-400 dark:text-slate-500">({formatEduSentenceMeaning(item.sentenceMeaning, showEduTag)})</span>
                      </p>
                    </div>

                    <button
                      onClick={() => !isAlreadyInVocab && handleAddSingle(item)}
                      disabled={isAlreadyInVocab}
                      className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                        isAlreadyInVocab
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-default'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm active:scale-95'
                      }`}
                    >
                      {isAlreadyInVocab ? (
                        <>
                          <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" />
                          <span>추가됨</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span>추가</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}

              {currentGradeWords.length > visibleLimit && (
                <div className="pt-2 pb-2 text-center">
                  <button
                    onClick={() => setVisibleLimit((prev) => prev + 100)}
                    className="px-4 py-2 rounded-xl sm:rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-[11px] sm:text-xs transition-all shadow-sm cursor-pointer"
                  >
                    더 많은 단어 보기 ({visibleLimit} / {currentGradeWords.length.toLocaleString()}개 표시 중)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-2 sm:pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] sm:text-xs text-slate-400 shrink-0 bg-white dark:bg-slate-900">
          <span className="flex items-center gap-1 truncate">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">2026 초·중·고 교과서 필수 어휘 DB</span>
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold cursor-pointer shrink-0"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
};

