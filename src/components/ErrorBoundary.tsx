import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5 text-amber-700" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-slate-900">
                Something went wrong
              </h1>
              <p className="text-xs text-slate-500 mt-1 break-words">
                Please reload the application to reconnect cleanly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Reload App</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
