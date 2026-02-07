import React from 'react';
import { SentenceSummary } from '../../utils/sentenceLoader';

interface SentenceListItemProps {
  sentence: SentenceSummary;
  index: number;
  onClick: () => void;
}

/**
 * SentenceListItem - Individual sentence row in mobile list
 *
 * Design:
 * - Touch-friendly height (min 48px)
 * - Preview of EN text (truncated)
 * - Practice status indicator
 * - Tap to select for practice
 */
export const SentenceListItem: React.FC<SentenceListItemProps> = ({
  sentence,
  index,
  onClick,
}) => {
  // Status indicator: practiced (green), not practiced (gray)
  const statusColor = sentence.hasUserTranslation
    ? 'var(--success-color, #22c55e)'
    : 'var(--text-secondary)';

  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 flex items-start gap-3 text-left transition-colors duration-150 active:bg-[var(--surface-active)]"
      style={{
        borderBottom: '1px solid var(--glass-border)',
      }}
    >
      {/* Index number */}
      <span
        className="text-sm font-medium w-6 shrink-0 pt-0.5"
        style={{ color: 'var(--text-secondary)' }}
      >
        {index}.
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* English text */}
        <p
          className="text-sm leading-relaxed line-clamp-2"
          style={{ color: 'var(--text-main)' }}
        >
          {sentence.en}
        </p>

        {/* Chinese preview */}
        <p
          className="text-xs mt-1 truncate"
          style={{ color: 'var(--text-secondary)' }}
        >
          {sentence.zh}
        </p>
      </div>

      {/* Right side: status + arrow */}
      <div className="flex items-center gap-2 shrink-0 pt-0.5">
        {/* Status dot */}
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: statusColor }}
          title={sentence.hasUserTranslation ? 'Practiced' : 'Not practiced'}
        />

        {/* Arrow */}
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: 'var(--text-secondary)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
};
