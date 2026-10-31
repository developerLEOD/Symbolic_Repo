import React, { ErrorInfo, ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[40vh] flex items-center justify-center p-6 bg-brand-bg font-mono">
          <div className="max-w-md w-full bg-brand-surface border-2 border-brand-text p-6 shadow-[6px_6px_0px_#050505] space-y-4 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 border-2 border-brand-text mx-auto flex items-center justify-center shadow-[2px_2px_0px_#050505]">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-sm font-black uppercase text-brand-text tracking-wider">
              DISPLAY ANOMALY CAUGHT
            </h2>
            <p className="text-[11px] text-brand-text/70 uppercase">
              The studio interface recovered gracefully. Your account and active sessions remain preserved.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false });
                  if (this.props.onReset) this.props.onReset();
                }}
                className="px-4 py-2 bg-brand-surface text-brand-text border-2 border-brand-text text-xs font-black uppercase tracking-wider hover:bg-brand-text hover:text-brand-bg transition-colors cursor-pointer shadow-[2px_2px_0px_#050505]"
              >
                RECOVER VIEW
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.reload();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-text text-brand-bg border-2 border-brand-text text-xs font-black uppercase tracking-wider hover:bg-brand-accent hover:text-white transition-colors cursor-pointer shadow-[2px_2px_0px_#050505]"
              >
                <RotateCcw size={13} />
                <span>RELOAD APP</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
