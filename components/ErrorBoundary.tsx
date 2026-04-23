import React from 'react';

interface ErrorBoundaryState {
        hasError: boolean;
        error?: Error;
}

interface ErrorBoundaryProps {
        children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
        constructor(props: ErrorBoundaryProps) {
                super(props);
                this.state = { hasError: false };
        }

        static getDerivedStateFromError(error: Error): ErrorBoundaryState {
                return { hasError: true, error };
        }

        componentDidCatch(error: Error, info: React.ErrorInfo) {
                console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
        }

        handleReload = () => {
                sessionStorage.removeItem('chunkReloadAt');
                window.location.reload();
        };

        handleReset = () => {
                this.setState({ hasError: false, error: undefined });
        };

        render() {
                if (!this.state.hasError) return this.props.children;

                return (
                        <div dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                                <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-lg p-8 text-center">
                                        <div className="text-5xl mb-4">😵</div>
                                        <h1 className="text-xl font-bold text-slate-900 mb-2">משהו השתבש</h1>
                                        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                                                קרתה שגיאה לא צפויה. הנתונים שלך בטוחים — פשוט רענן את הדף כדי להמשיך.
                                        </p>
                                        {this.state.error?.message && (
                                                <details className="text-right text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
                                                        <summary className="cursor-pointer font-semibold">פרטים טכניים</summary>
                                                        <code className="mt-2 block whitespace-pre-wrap break-words font-mono">
                                                                {this.state.error.message}
                                                        </code>
                                                </details>
                                        )}
                                        <div className="flex gap-2 justify-center">
                                                <button
                                                        onClick={this.handleReload}
                                                        className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
                                                >
                                                        רענון הדף
                                                </button>
                                                <button
                                                        onClick={this.handleReset}
                                                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                                                >
                                                        נסה שוב
                                                </button>
                                        </div>
                                </div>
                        </div>
                );
        }
}
