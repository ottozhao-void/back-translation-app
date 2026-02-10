import React from 'react';
import { VocabularyItem } from '../../types';
import { VOCABULARY_TYPE_COLORS } from './constants';

interface VocabularyListItemProps {
  item: VocabularyItem;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * VocabularyListItem - Single item in the vocabulary sidebar list
 */
export const VocabularyListItem: React.FC<VocabularyListItemProps> = ({
  item,
  isSelected,
  onClick,
}) => {
  const typeColor = VOCABULARY_TYPE_COLORS[item.type];
  const isPending = item.status === 'pending';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 transition-all duration-150 cursor-pointer ${
        isSelected
          ? 'bg-[var(--surface-active)] border-l-[var(--text-main)]'
          : 'hover:bg-[var(--surface-hover)] border-l-transparent'
      }`}
      style={{ borderLeftWidth: '3px', borderLeftStyle: 'solid' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Vocabulary text */}
          <p
            className="text-sm font-medium truncate"
            style={{ color: 'var(--text-main)' }}
          >
            {item.text}
          </p>
          {/* Definition preview (if enriched) */}
          {item.definition && (
            <p
              className="text-xs mt-1 line-clamp-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              {item.definition}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Type badge */}
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: typeColor.bg,
              color: typeColor.text,
            }}
          >
            {item.type === 'collocation' ? 'phrase' : item.type}
          </span>

          {/* Status indicator */}
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
