import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Une erreur inattendue est survenue.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Studio ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    let parsedFirestore: { error?: string; operationType?: string; path?: string | null } | null = null;
    try {
      parsedFirestore = JSON.parse(this.state.message);
    } catch {
      parsedFirestore = null;
    }

    const isQuotaError =
      this.state.message.includes('Quota exceeded') ||
      parsedFirestore?.error?.includes('Quota exceeded');

    return (
      <div className="min-h-screen bg-[#080D19] text-[#F4F7FB] flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-[#0E1629] border border-[#1E3254] rounded-xl p-6 space-y-4 shadow-2xl">
          <h1 className="font-display text-lg font-semibold text-[#F4F7FB]">
            {isQuotaError
              ? 'Quota Firestore atteint / Firestore Quota Exceeded'
              : 'Interruption sécurisée du Studio / Safe Recovery'}
          </h1>
          <p className="text-xs text-[#CBD5E1] leading-relaxed">
            {isQuotaError
              ? 'Le quota journalier gratuit Firestore a été atteint et sera réinitialisé demain.'
              : 'Une erreur de synchronisation ou d’autorisation base de données a été interceptée.'}
          </p>
          <pre className="p-3 rounded-lg bg-[#080D19] border border-[#1E3254] text-[11px] font-mono text-red-200 overflow-x-auto whitespace-pre-wrap break-all">
            {parsedFirestore ? JSON.stringify(parsedFirestore, null, 2) : this.state.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-[#3978FF] hover:bg-[#2E67E5] text-white text-xs font-medium"
          >
            Recharger l’application / Reload
          </button>
        </div>
      </div>
    );
  }
}
