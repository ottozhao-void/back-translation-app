import React, { useEffect, useRef, useCallback, useState } from 'react';

// SVG Icons for pagination (replacing emojis per UI/UX guidelines)
const SentenceIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16M4 12h16M4 17h10" />
  </svg>
);

const StatsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10M12 20V4M6 20v-6" />
  </svg>
);

const VocabIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

// Map card IDs to icons (supports multiple aliases)
const cardIcons: Record<string, React.ReactNode> = {
  'info': <SentenceIcon />,
  'sentence-info': <SentenceIcon />,
  'stats': <StatsIcon />,
  'statistics': <StatsIcon />,
  'vocabulary': <VocabIcon />,
  'vocab': <VocabIcon />,
};

export interface CardConfig {
  id: string;
  label: string;
  component: React.ReactNode;
}

interface CardCarouselProps {
  cards: CardConfig[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  className?: string;
}

/**
 * CardCarousel - 卡片轮播容器
 *
 * 处理水平滑动切换动画、键盘导航（左右方向键）、滚轮事件和触摸滑动。
 *
 * Features:
 * - Horizontal slide animation with scale/opacity effects
 * - Left/Right arrow key navigation
 * - Mouse wheel navigation with threshold debounce
 * - Touch swipe support for mobile devices
 * - Icon-based pagination with tooltips
 * - Full accessibility support (ARIA roles, live regions)
 *
 * @param cards - 卡片配置数组，每个卡片包含 id、label 和 component
 * @param activeIndex - 当前激活的卡片索引
 * @param onIndexChange - 索引变化回调
 */
export const CardCarousel: React.FC<CardCarouselProps> = ({
  cards,
  activeIndex,
  onIndexChange,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isTransitioning = useRef(false);

  // Touch swipe state
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Swing animation state - triggered on card change
  const [isSwinging, setIsSwinging] = useState(false);
  const prevIndexRef = useRef(activeIndex);

  // Minimum swipe distance to trigger navigation (in px)
  const MIN_SWIPE_DISTANCE = 50;

  // Screen reader announcement
  const [announcement, setAnnouncement] = useState('');

  // Trigger swing animation when activeIndex changes
  useEffect(() => {
    if (prevIndexRef.current !== activeIndex) {
      setIsSwinging(true);
      prevIndexRef.current = activeIndex;

      // Reset swing state after animation completes
      const timer = setTimeout(() => {
        setIsSwinging(false);
      }, 600); // Match animation duration

      return () => clearTimeout(timer);
    }
  }, [activeIndex]);

  // Clamp index to valid range
  const clampIndex = useCallback((index: number) => {
    return Math.max(0, Math.min(cards.length - 1, index));
  }, [cards.length]);

  // Navigate to previous/next card with announcement
  const goToPrev = useCallback(() => {
    if (isTransitioning.current) return;
    const newIndex = clampIndex(activeIndex - 1);
    if (newIndex !== activeIndex) {
      onIndexChange(newIndex);
      setAnnouncement(`Showing ${cards[newIndex]?.label || 'card'}, ${newIndex + 1} of ${cards.length}`);
    }
  }, [activeIndex, clampIndex, onIndexChange, cards]);

  const goToNext = useCallback(() => {
    if (isTransitioning.current) return;
    const newIndex = clampIndex(activeIndex + 1);
    if (newIndex !== activeIndex) {
      onIndexChange(newIndex);
      setAnnouncement(`Showing ${cards[newIndex]?.label || 'card'}, ${newIndex + 1} of ${cards.length}`);
    }
  }, [activeIndex, clampIndex, onIndexChange, cards]);

  const goToIndex = useCallback((index: number) => {
    if (isTransitioning.current) return;
    const newIndex = clampIndex(index);
    if (newIndex !== activeIndex) {
      onIndexChange(newIndex);
      setAnnouncement(`Showing ${cards[newIndex]?.label || 'card'}, ${newIndex + 1} of ${cards.length}`);
    }
  }, [activeIndex, clampIndex, onIndexChange, cards]);

  // Keyboard navigation (Arrow Left/Right)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext]);

  // Wheel navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let wheelTimeout: NodeJS.Timeout | null = null;
    let accumulatedDelta = 0;
    const WHEEL_THRESHOLD = 50;

    const handleWheel = (e: WheelEvent) => {
      const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      accumulatedDelta += delta;

      if (wheelTimeout) clearTimeout(wheelTimeout);

      wheelTimeout = setTimeout(() => {
        accumulatedDelta = 0;
      }, 150);

      if (Math.abs(accumulatedDelta) >= WHEEL_THRESHOLD) {
        e.preventDefault();
        if (accumulatedDelta > 0) {
          goToNext();
        } else {
          goToPrev();
        }
        accumulatedDelta = 0;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (wheelTimeout) clearTimeout(wheelTimeout);
    };
  }, [goToPrev, goToNext]);

  // Touch swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
    setSwipeOffset(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;

    const currentX = e.touches[0].clientX;
    touchEndX.current = currentX;

    // Calculate swipe offset for visual feedback (limited range)
    const diff = currentX - touchStartX.current;
    const maxOffset = 100;
    const limitedOffset = Math.max(-maxOffset, Math.min(maxOffset, diff * 0.3));
    setSwipeOffset(limitedOffset);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current === null || touchEndX.current === null) {
      setSwipeOffset(0);
      touchStartX.current = null;
      touchEndX.current = null;
      return;
    }

    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > MIN_SWIPE_DISTANCE) {
      if (diff > 0) {
        // Swipe left -> next card
        goToNext();
      } else {
        // Swipe right -> prev card
        goToPrev();
      }
    }

    // Reset
    setSwipeOffset(0);
    touchStartX.current = null;
    touchEndX.current = null;
  }, [goToNext, goToPrev]);

  // Handle transition end
  const handleTransitionEnd = () => {
    isTransitioning.current = false;
  };

  // Mark transition start when index changes
  useEffect(() => {
    isTransitioning.current = true;
  }, [activeIndex]);

  // Get card position relative to active for styling
  const getCardStyle = (index: number): React.CSSProperties => {
    const diff = index - activeIndex;
    const isActive = diff === 0;
    const isAdjacent = Math.abs(diff) === 1;

    return {
      transform: isActive ? 'scale(1)' : isAdjacent ? 'scale(0.95)' : 'scale(0.9)',
      opacity: isActive ? 1 : isAdjacent ? 0.7 : 0.5,
      transition: 'transform 300ms ease-out, opacity 300ms ease-out',
    };
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col w-full h-full overflow-hidden ${className}`}
      role="region"
      aria-label="Card carousel"
      aria-roledescription="carousel"
      style={{ touchAction: 'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
      >
        {announcement}
      </div>

      {/* Top Navigation Bar - Hanging from top edge with swing animation */}
      {cards.length > 1 && (
        <div
          className="flex flex-col items-center flex-shrink-0"
          role="tablist"
          aria-label="Carousel navigation"
          style={{
            transformOrigin: 'top center',
            animation: isSwinging ? 'pendulum-swing 600ms ease-out' : 'none',
          }}
        >
          {/* Thin connecting stem from top edge - "顶灯连接线" */}
          <div
            className="w-0.5 h-5"
            style={{
              background: 'linear-gradient(to bottom, var(--text-secondary), var(--glass-border))',
              opacity: 0.6,
              borderRadius: '1px',
            }}
          />
          {/* Tab buttons container */}
          <div
            className="flex gap-1 p-1.5 rounded-full"
            style={{
              backgroundColor: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
          >
            {cards.map((card, index) => {
              const isActive = index === activeIndex;
              const icon = cardIcons[card.id];

              return (
                <button
                  key={card.id}
                  id={`carousel-tab-${card.id}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`carousel-panel-${card.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => goToIndex(index)}
                  className={`
                    flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full
                    transition-all duration-200 cursor-pointer
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-main)]
                    ${isActive
                      ? 'bg-[var(--text-main)] text-[var(--bg-main)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)]'
                    }
                  `}
                  title={card.label}
                  aria-label={`${card.label}${isActive ? ' (current)' : ''}`}
                >
                  {icon}
                  {isActive && (
                    <span className="text-xs font-medium">{card.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Cards Container - Horizontal sliding with swipe offset */}
      <div className="flex-1 relative overflow-hidden">
        <div
          className="flex h-full"
          style={{
            transform: `translateX(calc(-${activeIndex * 100}% + ${swipeOffset}px))`,
            transition: swipeOffset === 0 ? 'transform 300ms ease-out' : 'none',
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {cards.map((card, index) => (
            <div
              key={card.id}
              className="w-full h-full flex-shrink-0"
              role="tabpanel"
              id={`carousel-panel-${card.id}`}
              aria-labelledby={`carousel-tab-${card.id}`}
              aria-hidden={index !== activeIndex}
              style={getCardStyle(index)}
            >
              {card.component}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
