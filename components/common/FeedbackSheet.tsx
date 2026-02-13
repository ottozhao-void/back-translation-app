import React, { useEffect, useRef } from 'react';

export interface FeedbackData {
  score: number;
  feedback: string;
  suggestions: string[];
}

interface FeedbackSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  data?: FeedbackData;
  error?: string;
  onRetry: () => void;
  isCached?: boolean;
  onRegenerate?: () => void;
}

/**
 * FeedbackSheet - Slide-up bottom sheet for LLM translation feedback
 *
 * Displays score, feedback, and suggestions in a glassmorphism-styled sheet
 * that animates up from the bottom of the screen.
 */
export const FeedbackSheet: React.FC<FeedbackSheetProps> = ({
  isOpen,
  onClose,
  isLoading,
  data,
  error,
  onRetry,
  isCached,
  onRegenerate,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', label: 'Excellent' };
    if (score >= 60) return { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', label: 'Good' };
    return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', label: 'Needs Work' };
  };

  if (!isOpen) return null;

  const scoreStyle = data ? getScoreColor(data.score) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 motion-safe-transition"
        style={{ backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-t-2xl motion-safe-transition"
        style={{
          backgroundColor: 'var(--glass-bg)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--glass-border)',
          borderBottom: 'none',
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--glass-border)' }}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-medium" style={{ color: 'var(--text-main)' }}>
              AI Analysis
            </h2>
            {isCached && onRegenerate && !isLoading && !error && (
              <button
                onClick={onRegenerate}
                className="text-xs px-2 py-1 rounded border transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                style={{ 
                  color: 'var(--text-secondary)', 
                  borderColor: 'var(--glass-border)' 
                }}
                title="Regenerate feedback"
              >
                Regenerate
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(80vh - 60px)' }}>
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--text-secondary)', borderTopColor: 'transparent' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Analyzing your translation...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}>
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                {error}
              </p>
              <button
                onClick={onRetry}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-main)' }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Success State */}
          {data && !isLoading && !error && (
            <div className="space-y-6">
              {/* Score */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: scoreStyle?.bg }}
                >
                  <span className="text-3xl font-bold" style={{ color: scoreStyle?.text }}>
                    {data.score}
                  </span>
                </div>
                <span className="text-sm font-medium" style={{ color: scoreStyle?.text }}>
                  {scoreStyle?.label}
                </span>
              </div>

              {/* Feedback */}
              <div>
                <h3 className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Feedback
                </h3>
                <p className="text-sm leading-relaxed font-serif-sc" style={{ color: 'var(--text-main)' }}>
                  {data.feedback}
                </p>
              </div>

              {/* Suggestions */}
              {data.suggestions.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Suggestions
                  </h3>
                  <ul className="space-y-2">
                    {data.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex gap-2 text-sm" style={{ color: 'var(--text-main)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>•</span>
                        <span className="font-serif-sc">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer removed per user request - actions moved to header */}
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
