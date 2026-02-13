/**
 * SentenceNavBar - Minimal bottom navigation bar for sentence traversal.
 *
 * Displays current position (e.g., "3 / 47") and prev/next controls.
 * Floating design with no background or border - truly minimal.
 *
 * Design:
 * - Height ~36-40px
 * - No background, no border - just floating controls
 * - Centered row: left chevron → position text → right chevron
 * - Chevrons: opacity-30 when disabled, cursor-pointer hover:opacity-100 when active
 * - Position text: text-secondary text-sm tracking-wider font-mono
 * - Hidden when total ≤ 1
 */

import React from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from '../Icons';

interface SentenceNavBarProps {
  /** Current index in the filtered list (0-based) */
  currentIndex: number;
  /** Total number of sentences in the filtered list */
  total: number;
  /** Callback for navigating to previous sentence */
  onPrev: () => void;
  /** Callback for navigating to next sentence */
  onNext: () => void;
  /** Optional additional class name */
  className?: string;
}

export const SentenceNavBar: React.FC<SentenceNavBarProps> = ({
  currentIndex,
  total,
  onPrev,
  onNext,
  className = '',
}) => {
  // Hide when total ≤ 1 (nothing to navigate)
  if (total <= 1) {
    return null;
  }

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < total - 1;

  return (
    <div
      className={`flex items-center justify-center gap-4 py-2 min-h-[36px] ${className}`}
    >
      {/* Previous button */}
      <button
        onClick={onPrev}
        disabled={!canGoPrev}
        className={`transition-opacity cursor-pointer ${canGoPrev ? 'opacity-100' : 'opacity-30'}`}
        style={{ color: 'var(--text-secondary)' }}
        title={canGoPrev ? 'Previous sentence' : undefined}
      >
        <ArrowLeftIcon />
      </button>

      {/* Position indicator */}
      <span
        className="text-sm tracking-wider font-mono"
        style={{ color: 'var(--text-secondary)' }}
      >
        {currentIndex + 1} / {total}
      </span>

      {/* Next button */}
      <button
        onClick={onNext}
        disabled={!canGoNext}
        className={`transition-opacity cursor-pointer ${canGoNext ? 'opacity-100' : 'opacity-30'}`}
        style={{ color: 'var(--text-secondary)' }}
        title={canGoNext ? 'Next sentence' : undefined}
      >
        <ArrowRightIcon />
      </button>
    </div>
  );
};
