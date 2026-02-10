import React, { useEffect, useRef } from 'react';
import { SemanticUnit, VocabularyType } from '../../types';

interface SemanticUnitPopoverProps {
  unit: SemanticUnit;
  onAddToVocabulary: (text: string, type: VocabularyType) => void;
  onClose: () => void;
}

const COLOR_MAP = {
  word: '#60A5FA',
  collocation: '#A78BFA',
  pattern: '#FBBF24'
};

const TYPE_LABEL_MAP: Record<string, string> = {
  word: 'Word',
  collocation: 'Collocation',
  pattern: 'Pattern',
};

export const SemanticUnitPopover: React.FC<SemanticUnitPopoverProps> = ({
  unit,
  onAddToVocabulary,
  onClose,
}) => {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const getVocabularyType = (): VocabularyType => {
    if (unit.type === 'pattern') return 'pattern';
    if (unit.text.includes(' ')) return 'collocation';
    return 'word';
  };

  const typeLabel = getVocabularyType();
  const typeColor = COLOR_MAP[typeLabel];

  return (
    <div
      ref={barRef}
      className="overflow-hidden motion-safe-animation"
      style={{
        animation: 'expand-in 200ms ease-out forwards',
      }}
    >
      <div
        className="flex items-center gap-3 mt-3 px-4 py-2.5 rounded-xl"
        style={{
          backgroundColor: `${typeColor}10`,
          border: `1px solid ${typeColor}30`,
        }}
      >
        {/* Selected text with type badge */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${typeColor}20`,
              color: typeColor,
            }}
          >
            {TYPE_LABEL_MAP[typeLabel]}
          </span>
          <span
            className="font-medium truncate text-sm"
            style={{ color: typeColor }}
          >
            {unit.text}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToVocabulary(unit.text, typeLabel);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-white hover:opacity-90"
            style={{ backgroundColor: typeColor }}
          >
            + Add
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--text-secondary)' }}
            title="Dismiss"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
