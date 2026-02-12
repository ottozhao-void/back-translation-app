import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface WordDefinitionTooltipProps {
  word: string;
  anchorRect: DOMRect;
  isLoading: boolean;
  data?: { general: string; contextual: string };
  error?: string;
  onClose: () => void;
}

/**
 * WordDefinitionTooltip - Minimalist floating tooltip for word definitions.
 * Uses a portal to avoid z-index/overflow clipping issues.
 * Positions below the word by default; flips above if near viewport bottom.
 */
export const WordDefinitionTooltip: React.FC<WordDefinitionTooltipProps> = ({
  word,
  anchorRect,
  isLoading,
  data,
  error,
  onClose,
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; above: boolean }>({
    top: 0,
    left: 0,
    above: false,
  });
  const [visible, setVisible] = useState(false);

  // Calculate position
  useEffect(() => {
    const gap = 8;
    const tooltipWidth = Math.min(280, window.innerWidth - 32);
    const viewportH = window.innerHeight;

    // Center horizontally on the word
    let left = anchorRect.left + anchorRect.width / 2 - tooltipWidth / 2;
    // Clamp to viewport
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));

    // Below by default
    let top = anchorRect.bottom + gap;
    let above = false;

    // Flip above if too close to bottom (estimate tooltip height ~120px)
    if (top + 120 > viewportH) {
      top = anchorRect.top - gap - 120;
      above = true;
    }

    setPosition({ top, left, above });
    // Trigger entry animation
    requestAnimationFrame(() => setVisible(true));
  }, [anchorRect]);

  // Dismiss on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Dismiss on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid the same click that opened the tooltip
    const timer = setTimeout(() => {
      window.addEventListener('click', handleClick, true);
    }, 50);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleClick, true);
    };
  }, [onClose]);

  // Dismiss on scroll
  useEffect(() => {
    const handleScroll = () => onClose();
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [onClose]);

  const content = (
    <div
      ref={tooltipRef}
      className="fixed z-[300] motion-safe-animation"
      style={{
        top: position.top,
        left: position.left,
        maxWidth: 280,
        opacity: visible ? 1 : 0,
        transform: visible
          ? 'translateY(0)'
          : position.above
            ? 'translateY(4px)'
            : 'translateY(-4px)',
        transition: 'opacity 150ms ease-out, transform 150ms ease-out',
      }}
    >
      <div
        className="rounded-xl p-3 shadow-lg"
        style={{
          backgroundColor: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--glass-border)',
        }}
      >
        {/* Word header */}
        <div className="font-semibold text-sm mb-2" style={{ color: 'var(--text-main)' }}>
          {word}
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 py-1">
            <div
              className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--text-secondary)', borderTopColor: 'transparent' }}
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>...</span>
          </div>
        )}

        {data && (
          <div className="space-y-1.5">
            <div>
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                General
              </span>
              <p className="text-[13px] leading-snug" style={{ color: 'var(--text-main)' }}>
                {data.general}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                In context
              </span>
              <p className="text-[13px] leading-snug" style={{ color: 'var(--text-main)' }}>
                {data.contextual}
              </p>
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs" style={{ color: 'var(--error-color, #ef4444)' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
