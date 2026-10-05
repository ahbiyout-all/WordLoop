import React from 'react';
import { X, Sparkles, History, Tag, CheckCircle2, Download } from 'lucide-react';
import { PATCH_NOTES_DATA, APP_VERSION } from '../data/patchNotesData';

interface PatchNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGitHubUpdateModal?: () => void;
}

export const PatchNotesModal: React.FC<PatchNotesModalProps> = ({
  isOpen,
  onClose,
  onOpenGitHubUpdateModal,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="patch-notes-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="patch-notes-modal-dialog"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85dvh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  WordLoop 패치 노트 & 버전 기록
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-black">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                주요 업데이트 및 버전별 변경 내역
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-patch-notes-modal-btn"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top GitHub Releases Banner */}
        {onOpenGitHubUpdateModal && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold min-w-0">
              <Download className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="truncate">GitHub Releases 실시간 업데이트 & 기기별 설치파일(PC, APK, iOS)</span>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenGitHubUpdateModal();
              }}
              className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] shadow-sm shrink-0"
            >
              업데이트 센터
            </button>
          </div>
        )}

        {/* Patch Notes List Body */}
        <div className="p-4 sm:p-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-6 divide-y divide-slate-100 dark:divide-slate-800">
          {PATCH_NOTES_DATA.map((note, idx) => (
            <div key={note.version} className={idx > 0 ? 'pt-6' : ''}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 ${
                      note.isLatest
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Tag className="w-3 h-3" />
                    v{note.version}
                  </span>
                  {note.isLatest && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-[11px] font-extrabold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      최신 버전
                    </span>
                  )}
                </div>
                {note.date && (
                  <span className="text-xs text-slate-400 font-mono">{note.date}</span>
                )}
              </div>

              <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
                {note.tagline}
              </h4>

              <div className="space-y-3">
                {note.highlights.map((highlight, hIdx) => (
                  <div
                    key={`h-${hIdx}`}
                    className="bg-slate-50 dark:bg-slate-800/60 p-3 sm:p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-2"
                  >
                    <div className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200">
                      {highlight.category}
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pl-1">
                      {highlight.items.map((item, iIdx) => (
                        <li key={`item-${iIdx}`} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-xs text-slate-500">
          <span>문서 파일: <code>/docs/PATCH_NOTES.md</code></span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold hover:opacity-90 transition-opacity"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
