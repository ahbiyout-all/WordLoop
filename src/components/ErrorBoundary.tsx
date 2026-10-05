import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('WordLoop Uncaught Render Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCacheAndReload = () => {
    try {
      // Clear app state that might be corrupted while keeping api keys
      const apiKey = localStorage.getItem('wordloop_gemini_api_key');
      localStorage.removeItem('wordloop_vocab');
      localStorage.removeItem('wordloop_sentences');
      localStorage.removeItem('wordloop_goals');
      localStorage.removeItem('wordloop_history');
      localStorage.removeItem('wordloop_user_profile');
      localStorage.removeItem('wordloop_home_view');
      localStorage.removeItem('wordloop_emergency_snapshot');
      if (apiKey) {
        localStorage.setItem('wordloop_gemini_api_key', apiKey);
      }
    } catch (e) {
      console.error('Cache clear error:', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="max-w-lg w-full bg-slate-800/90 border border-rose-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-6 text-rose-400">
              <AlertCircle className="w-8 h-8" />
            </div>

            <h1 className="text-2xl font-black text-white mb-2 tracking-tight">
              화면을 표시하는 중 문제가 발생했습니다
            </h1>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              예기치 못한 렌더링 오류가 감지되었습니다. 아래 버튼을 눌러 앱을 다시 로드하거나 로컬 캐시를 초기화해 보세요.
            </p>

            {this.state.error && (
              <div className="bg-slate-950/60 rounded-xl p-4 mb-6 text-left border border-slate-700/50 overflow-auto max-h-32 text-xs font-mono text-rose-300">
                <p className="font-bold text-rose-400 mb-1">{this.state.error.name}: {this.state.error.message}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-slate-500 whitespace-pre-wrap text-[11px]">
                    {this.state.errorInfo.componentStack.slice(0, 300)}...
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition active:scale-95 shadow-lg shadow-indigo-600/30 text-sm cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                앱 다시 로드하기
              </button>

              <button
                onClick={this.handleClearCacheAndReload}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-700/80 hover:bg-rose-900/40 hover:text-rose-300 text-slate-300 font-medium transition active:scale-95 border border-slate-600/50 text-sm cursor-pointer"
                title="손상된 로컬 저장소 캐시를 초기화하고 기본 상태로 복원합니다"
              >
                <Trash2 className="w-4 h-4" />
                캐시 초기화 후 재실행
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
