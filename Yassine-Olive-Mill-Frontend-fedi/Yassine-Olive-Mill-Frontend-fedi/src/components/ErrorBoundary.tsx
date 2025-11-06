import React, { Component, ErrorInfo, ReactNode } from 'react';
import { OliveCard, OliveCardContent, OliveCardHeader, OliveCardTitle } from '@/components/ui/olive-card';
import { OliveButton } from '@/components/ui/olive-button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // Log to error reporting service if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <OliveCard className="max-w-2xl w-full">
            <OliveCardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <OliveCardTitle className="text-2xl">حدث خطأ غير متوقع</OliveCardTitle>
              </div>
            </OliveCardHeader>
            <OliveCardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  عذراً، حدث خطأ غير متوقع في التطبيق. يرجى المحاولة مرة أخرى.
                </p>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4 p-4 bg-muted rounded-lg overflow-auto max-h-64">
                    <summary className="cursor-pointer font-semibold mb-2">
                      تفاصيل الخطأ (وضع التطوير)
                    </summary>
                    <pre className="text-xs text-destructive whitespace-pre-wrap">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <OliveButton
                  onClick={this.handleReset}
                  className="flex-1 gap-2"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4" />
                  إعادة المحاولة
                </OliveButton>
                <OliveButton
                  onClick={this.handleReload}
                  className="flex-1 gap-2"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4" />
                  إعادة تحميل الصفحة
                </OliveButton>
                <OliveButton
                  onClick={this.handleGoHome}
                  className="flex-1 gap-2"
                >
                  <Home className="h-4 w-4" />
                  العودة للصفحة الرئيسية
                </OliveButton>
              </div>
            </OliveCardContent>
          </OliveCard>
        </div>
      );
    }

    return this.props.children;
  }
}

