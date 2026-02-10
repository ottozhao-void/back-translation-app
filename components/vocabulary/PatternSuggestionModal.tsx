import React, { useState } from 'react';

interface PatternSuggestion {
  text: string;
  template: string;
  explanation: string;
}

interface PatternSuggestionModalProps {
  patterns: PatternSuggestion[];
  isLoading: boolean;
  error?: string;
  onAddPatterns: (patterns: PatternSuggestion[]) => void;
  onClose: () => void;
}

/**
 * PatternSuggestionModal - Modal for selecting LLM-suggested patterns
 */
export const PatternSuggestionModal: React.FC<PatternSuggestionModalProps> = ({
  patterns,
  isLoading,
  error,
  onAddPatterns,
  onClose,
}) => {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const togglePattern = (index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleAddSelected = () => {
    const selected = patterns.filter((_, idx) => selectedIndices.has(idx));
    if (selected.length > 0) {
      onAddPatterns(selected);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-main)',
          borderColor: 'var(--glass-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--glass-border)] flex items-center justify-between">
          <div>
            <h2
              className="text-lg font-medium"
              style={{ color: 'var(--text-main)' }}
            >
              Pattern Suggestions
            </h2>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              Select patterns to add to your vocabulary
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: 'var(--text-secondary)', borderTopColor: 'transparent' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Analyzing sentence for patterns...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-400 mb-2">{error}</p>
              <button
                onClick={onClose}
                className="text-sm underline"
                style={{ color: 'var(--text-secondary)' }}
              >
                Close
              </button>
            </div>
          ) : patterns.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                No patterns found in this sentence.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {patterns.map((pattern, idx) => {
                const isSelected = selectedIndices.has(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => togglePattern(idx)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-amber-500/50 bg-amber-500/10'
                        : 'border-[var(--glass-border)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500'
                            : 'border-gray-400'
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      {/* Pattern Content */}
                      <div className="flex-1 min-w-0">
                        {/* Template */}
                        <p
                          className="font-mono text-sm font-medium mb-1"
                          style={{ color: '#FBBF24' }}
                        >
                          {pattern.template}
                        </p>
                        {/* Original text */}
                        <p
                          className="text-sm mb-2"
                          style={{ color: 'var(--text-main)' }}
                        >
                          "{pattern.text}"
                        </p>
                        {/* Explanation */}
                        <p
                          className="text-xs"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {pattern.explanation}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !error && patterns.length > 0 && (
          <div className="px-6 py-4 border-t border-[var(--glass-border)] flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {selectedIndices.size} of {patterns.length} selected
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--glass-border)] hover:bg-[var(--surface-hover)] transition-colors"
                style={{ color: 'var(--text-main)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddSelected}
                disabled={selectedIndices.size === 0}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedIndices.size === 0
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:opacity-90'
                }`}
                style={{
                  backgroundColor: '#FBBF24',
                  color: '#000',
                }}
              >
                Add Selected
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
