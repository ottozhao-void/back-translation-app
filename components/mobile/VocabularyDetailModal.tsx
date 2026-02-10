import React, { useState } from 'react';
import { VocabularyItem } from '../../types';
import { VOCABULARY_TYPE_COLORS } from '../vocabulary/constants';

interface VocabularyDetailModalProps {
  item: VocabularyItem;
  onClose: () => void;
  onDelete: (id: string) => void;
  onNavigateToSentence?: (sentenceId: string) => void;
}

/**
 * VocabularyDetailModal - Full-screen modal for vocabulary details
 *
 * Design:
 * - Full-screen coverage with safe-area insets
 * - Fixed header with close button
 * - Scrollable content area
 * - Fixed bottom action bar
 */
export const VocabularyDetailModal: React.FC<VocabularyDetailModalProps> = ({
  item,
  onClose,
  onDelete,
  onNavigateToSentence,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const typeColor = VOCABULARY_TYPE_COLORS[item.type];
  const isPending = item.status === 'pending';

  const handleDelete = () => {
    onDelete(item.id);
    onClose();
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'word': return 'Word';
      case 'collocation': return 'Phrase';
      case 'pattern': return 'Pattern';
      default: return type;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        backgroundColor: 'var(--bg-main)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4 border-b"
        style={{ borderColor: 'var(--glass-border)' }}
      >
        <h1
          className="text-lg font-semibold truncate flex-1 pr-4"
          style={{ color: 'var(--text-main)' }}
        >
          {item.text}
        </h1>
        <button
          onClick={onClose}
          className="p-2 rounded-lg"
          style={{ backgroundColor: 'var(--surface-hover)' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {/* Type and Status */}
        <div className="flex items-center gap-2 mb-6">
          <span
            className="text-xs px-2.5 py-1 rounded-md font-medium uppercase tracking-wide"
            style={{
              backgroundColor: typeColor.bg,
              color: typeColor.text,
            }}
          >
            {getTypeLabel(item.type)}
          </span>
          {isPending ? (
            <span className="text-xs px-2 py-1 rounded-full bg-slate-500/20 text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
              Pending
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Enriched
            </span>
          )}
        </div>

        {/* Pattern template */}
        {item.patternTemplate && (
          <div className="mb-6 p-3 rounded-lg" style={{ backgroundColor: 'var(--surface-hover)' }}>
            <p
              className="text-sm font-mono text-center"
              style={{ color: 'var(--text-secondary)' }}
            >
              {item.patternTemplate}
            </p>
          </div>
        )}

        {/* Definition Section */}
        <div className="mb-6">
          <h2
            className="text-xs font-mono uppercase tracking-wider mb-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            Definition
          </h2>
          {item.definition ? (
            <>
              <p
                className="text-base leading-relaxed mb-2"
                style={{ color: 'var(--text-main)' }}
              >
                {item.definition}
              </p>
              {item.definitionZh && (
                <p
                  className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {item.definitionZh}
                </p>
              )}
            </>
          ) : (
            <p
              className="text-sm italic"
              style={{ color: 'var(--text-secondary)' }}
            >
              {isPending
                ? 'Waiting for AI to generate definition...'
                : 'No definition yet.'}
            </p>
          )}
        </div>

        {/* Examples Section */}
        {item.examples.length > 0 && (
          <div className="mb-6">
            <h2
              className="text-xs font-mono uppercase tracking-wider mb-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              Examples
            </h2>
            <div className="space-y-3">
              {item.examples.map((example, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--surface-hover)' }}
                >
                  <p
                    className="text-sm italic mb-2"
                    style={{ color: 'var(--text-main)' }}
                  >
                    "{example.en}"
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {example.zh}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pattern Explanation */}
        {item.patternExplanation && (
          <div className="mb-6">
            <h2
              className="text-xs font-mono uppercase tracking-wider mb-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              Usage
            </h2>
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--surface-hover)' }}>
              <p
                className="text-sm"
                style={{ color: 'var(--text-main)' }}
              >
                {item.patternExplanation}
              </p>
            </div>
          </div>
        )}

        {/* Personal Note */}
        {item.note && (
          <div className="mb-6">
            <h2
              className="text-xs font-mono uppercase tracking-wider mb-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              Notes
            </h2>
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--surface-hover)' }}>
              <p
                className="text-sm"
                style={{ color: 'var(--text-main)' }}
              >
                {item.note}
              </p>
            </div>
          </div>
        )}

        {/* Source Sentences */}
        {item.sources.length > 0 && (
          <div className="mb-6">
            <h2
              className="text-xs font-mono uppercase tracking-wider mb-3 flex items-center gap-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              Source Sentences
              <span
                className="px-1.5 py-0.5 rounded-full text-xs"
                style={{ backgroundColor: 'var(--surface-active)' }}
              >
                {item.sources.length}
              </span>
            </h2>
            <div className="space-y-2">
              {item.sources.map((source) => (
                <button
                  key={source.sentenceId}
                  onClick={() => {
                    onNavigateToSentence?.(source.sentenceId);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-lg border transition-colors duration-200"
                  style={{
                    borderColor: 'var(--glass-border)',
                    backgroundColor: 'var(--glass-bg)',
                  }}
                >
                  <p
                    className="text-sm line-clamp-2"
                    style={{ color: 'var(--text-main)' }}
                  >
                    {source.en}
                  </p>
                  <p
                    className="text-xs mt-1 line-clamp-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {source.zh}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="text-center pt-4">
          <p
            className="text-xs"
            style={{ color: 'var(--text-secondary)' }}
          >
            Added {new Date(item.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div
        className="px-4 py-4 border-t"
        style={{ borderColor: 'var(--glass-border)' }}
      >
        {showDeleteConfirm ? (
          <div className="flex items-center gap-3">
            <span className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>
              Delete this vocabulary item?
            </span>
            <button
              onClick={handleDelete}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-red-500/20 text-red-400"
            >
              Delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium border"
              style={{
                borderColor: 'var(--glass-border)',
                color: 'var(--text-main)',
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full px-4 py-3 rounded-lg text-sm font-medium text-red-400 flex items-center justify-center gap-2"
            style={{ backgroundColor: 'red-500/10' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            Delete Vocabulary
          </button>
        )}
      </div>
    </div>
  );
};
