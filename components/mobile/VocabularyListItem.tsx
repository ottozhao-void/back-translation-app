import React from 'react';
import { VocabularyItem } from '../../types';
import { VOCABULARY_TYPE_COLORS } from '../vocabulary/constants';

interface VocabularyListItemProps {
  item: VocabularyItem;
  onClick: () => void;
}

/**
 * VocabularyListItem - Mobile-optimized list item for vocabulary
 *
 * Design:
 * - Minimum 56px height for touch targets
 * - Type badge with color matching desktop
 * - Status indicator (pending = pulse animation)
 * - Definition preview for enriched items
 */
export const VocabularyListItem: React.FC<VocabularyListItemProps> = ({
  item,
  onClick,
}) => {
  const typeColor = VOCABULARY_TYPE_COLORS[item.type];
  const isPending = item.status === 'pending';

  // Type label for display
  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'word': return 'word';
      case 'collocation': return 'phrase';
      case 'pattern': return 'pattern';
      default: return type;
    }
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl transition-all duration-150 cursor-pointer active:scale-[0.98]"
      style={{
        backgroundColor: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        minHeight: '56px',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Text and definition */}
        <div className="flex-1 min-w-0">
          {/* Vocabulary text */}
          <p
            className="text-base font-medium truncate"
            style={{ color: 'var(--text-main)' }}
          >
            {item.text}
          </p>

          {/* Definition preview (if enriched) */}
          {item.definition && (
            <p
              className="text-sm mt-1 line-clamp-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              {item.definition}
            </p>
          )}

          {/* Pending indicator text */}
          {isPending && !item.definition && (
            <p
              className="text-sm mt-1 italic"
              style={{ color: 'var(--text-secondary)' }}
            >
              Waiting for AI...
            </p>
          )}
        </div>

        {/* Right: Type badge and status */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* Type badge */}
          <span
            className="text-xs px-2 py-1 rounded-md font-medium uppercase"
            style={{
              backgroundColor: typeColor.bg,
              color: typeColor.text,
            }}
          >
            {getTypeLabel(item.type)}
          </span>

          {/* Status indicator dot */}
          <span
            className={`w-2 h-2 rounded-full ${isPending ? 'animate-pulse' : ''}`}
            style={{
              backgroundColor: isPending ? '#94A3B8' : '#10B981',
            }}
            title={isPending ? 'Pending enrichment' : 'Enriched'}
          />
        </div>
      </div>
    </button>
  );
};
