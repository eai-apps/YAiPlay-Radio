import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('YAi Radio Uncaught Error Boundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-extrabold text-white">YAi Radio: Сбой интерфейса</h1>
            <p className="text-xs text-zinc-400">
              Произошла непредвиденная ошибка при отрисовке компонента. Ваши настройки и избранные станции сохранены в безопасности.
            </p>
            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-black/60 border border-zinc-800 text-[11px] font-mono text-zinc-400 text-left overflow-x-auto">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-violet-500/20"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Перезапустить приложение</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
