import React, { useEffect, useRef } from 'react';

interface TextSelectionPopoverProps {
  selectedText: string;
  position: { x: number; y: number };
  onAddWord: () => void;
  onAddCollocation: () => void;
  onSuggestPatterns: () => void;
  onClose: () => void;
}

/**
 * TextSelectionPopover - Floating popover for adding vocabulary from selected text
 *
 * Appears above the selection with options to add as word, collocation, or suggest patterns.
 */
export const TextSelectionPopover: React.FC<TextSelectionPopoverProps> = ({
  selectedText,
  position,
  onAddWord,
  onAddCollocation,
  onSuggestPatterns,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Delay adding listeners to prevent immediate close
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

  // Adjust position to stay within viewport
  const adjustedPosition = {
    x: Math.max(10, Math.min(position.x, window.innerWidth - 220)),
    y: Math.max(10, position.y - 50), // Position above selection
  };

  // Determine if this looks like a single word or a phrase
  const wordCount = selectedText.trim().split(/\s+/).length;
  const isSingleWord = wordCount === 1;

  return (
    <div
      ref={popoverRef}
      className="fixed z-[100] flex gap-1 p-1.5 rounded-lg shadow-xl border animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(8px)',
        borderColor: 'var(--glass-border)',
      }}
    >
      {/* Add Word Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAddWord();
        }}
        className="px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 hover:bg-white/10"
        style={{ color: '#60A5FA' }}
        title="Add as vocabulary word"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>Word</span>
      </button>

      {/* Add Collocation Button - Show for multi-word selections */}
      {!isSingleWord && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddCollocation();
          }}
          className="px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 hover:bg-white/10"
          style={{ color: '#A78BFA' }}
          title="Add as collocation/phrase"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>Phrase</span>
        </button>
      )}

      {/* Suggest Patterns Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSuggestPatterns();
        }}
        className="px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 hover:bg-white/10"
        style={{ color: '#FBBF24' }}
        title="AI suggests patterns from this sentence"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
        </svg>
        <span>Patterns</span>
      </button>
    </div>
  );
};
