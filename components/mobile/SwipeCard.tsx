import React, { useRef, useState } from 'react';

interface SwipeCardProps {
  frontText: string;
  backText: string;
  isFlipped: boolean;
  onFlip: () => void;
  onSwipe: (direction: 'left' | 'right') => void;
  canSwipeLeft: boolean;
  canSwipeRight: boolean;
  lang: 'en' | 'zh';
}

/**
 * SwipeCard - Flippable card with swipe gestures
 *
 * Gestures:
 * - Tap: Flip card to show answer
 * - Swipe left: Next sentence
 * - Swipe right: Previous sentence
 *
 * Animation:
 * - 3D flip on Y-axis (400ms)
 * - Horizontal slide with rubber-band effect
 */
export const SwipeCard: React.FC<SwipeCardProps> = ({
  frontText,
  backText,
  isFlipped,
  onFlip,
  onSwipe,
  canSwipeLeft,
  canSwipeRight,
  lang,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Touch handling
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = false;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    // Determine if this is a horizontal swipe (first significant movement)
    if (!isHorizontalSwipe.current && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
    }

    // Only handle horizontal swipes
    if (isHorizontalSwipe.current) {
      e.preventDefault();

      // Apply rubber-band effect at edges
      let offset = deltaX;
      if ((deltaX > 0 && !canSwipeRight) || (deltaX < 0 && !canSwipeLeft)) {
        offset = deltaX * 0.3; // Reduced movement at edges
      }

      setDragOffset(offset);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;

    const threshold = 80; // Minimum distance to trigger swipe

    if (dragOffset > threshold && canSwipeRight) {
      onSwipe('right');
    } else if (dragOffset < -threshold && canSwipeLeft) {
      onSwipe('left');
    }

    // Reset
    setDragOffset(0);
    setIsDragging(false);
  };

  // Card styles
  const cardStyle: React.CSSProperties = {
    transform: `translateX(${dragOffset}px) ${isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'}`,
    transition: isDragging ? 'none' : 'transform 0.4s ease-out',
    transformStyle: 'preserve-3d',
    perspective: '1000px',
  };

  const faceStyle: React.CSSProperties = {
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  };

  return (
    <div
      ref={cardRef}
      className="relative w-full max-w-sm h-full cursor-pointer select-none"
      style={cardStyle}
      onClick={() => !isDragging && onFlip()}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Front face (original text) */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center p-6 rounded-2xl"
        style={{
          ...faceStyle,
          backgroundColor: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <p
          className={`text-center leading-relaxed ${lang === 'en' ? 'text-lg' : 'text-xl'}`}
          style={{ color: 'var(--text-main)' }}
        >
          {frontText}
        </p>

        {/* Tap hint */}
        <div
          className="absolute bottom-4 flex items-center gap-1 text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          Tap to flip
        </div>
      </div>

      {/* Back face (reference/answer) */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center p-6 rounded-2xl"
        style={{
          ...faceStyle,
          backgroundColor: 'var(--surface-active)',
          border: '1px solid var(--glass-border)',
          transform: 'rotateY(180deg)',
        }}
      >
        <div
          className="absolute top-4 px-3 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: 'var(--success-color, #22c55e)',
            color: 'white',
          }}
        >
          Reference
        </div>

        <p
          className={`text-center leading-relaxed ${lang === 'zh' ? 'text-lg' : 'text-xl'}`}
          style={{ color: 'var(--text-main)' }}
        >
          {backText}
        </p>

        {/* Tap hint */}
        <div
          className="absolute bottom-4 flex items-center gap-1 text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          Tap to flip back
        </div>
      </div>

      {/* Swipe indicators */}
      {isDragging && (
        <>
          {dragOffset > 30 && canSwipeRight && (
            <div
              className="absolute left-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: 'var(--text-main)',
                color: 'var(--bg-main)',
                opacity: Math.min(dragOffset / 80, 1),
              }}
            >
              ← Prev
            </div>
          )}
          {dragOffset < -30 && canSwipeLeft && (
            <div
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: 'var(--text-main)',
                color: 'var(--bg-main)',
                opacity: Math.min(-dragOffset / 80, 1),
              }}
            >
              Next →
            </div>
          )}
        </>
      )}
    </div>
  );
};
