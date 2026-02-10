import React, { useEffect, useRef } from 'react';
import { SemanticUnit, VocabularyType } from '../../types';

interface SemanticUnitPopoverProps {
  unit: SemanticUnit;
  position: { x: number; y: number };
  onAddToVocabulary: (text: string, type: VocabularyType) => void;
  onClose: () => void;
}

const COLOR_MAP = {
  word: '#60A5FA',
  collocation: '#A78BFA',
  pattern: '#FBBF24'
};

export const SemanticUnitPopover: React.FC<SemanticUnitPopoverProps> = ({
  unit,
  position,
  onAddToVocabulary,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const adjustedPosition = {
    x: Math.max(10, Math.min(position.x, window.innerWidth - 250)),
    y: Math.max(10, position.y - 70),
  };

  const getVocabularyType = (): VocabularyType => {
    if (unit.type === 'pattern') return 'pattern';
    if (unit.text.includes(' ')) return 'collocation';
    return 'word';
  };

  const typeLabel = getVocabularyType();
  const typeColor = COLOR_MAP[typeLabel];

  return (
    <div
      ref={popoverRef}
      className="fixed z-[100] glass-panel rounded-lg p-3 shadow-xl border animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        transform: 'translateX(-50%)',
        minWidth: '200px',
      }}
    >
      <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
        Add to vocabulary:
      </div>
      <div
        className="font-medium mb-3 truncate"
        style={{ color: typeColor }}
      >
        "{unit.text}"
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToVocabulary(unit.text, typeLabel);
          }}
          className="flex-1 py-2 rounded-md text-sm font-medium transition-colors text-white"
          style={{ backgroundColor: typeColor }}
        >
          Add as {typeLabel}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
