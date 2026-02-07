import React from 'react';

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightContent?: React.ReactNode;
}

/**
 * MobileHeader - Fixed top header for mobile views
 *
 * Design:
 * - Height: 56px + safe-area-inset-top
 * - Glass-panel effect
 * - Optional back button
 * - Optional right content slot
 */
export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  showBack = false,
  onBack,
  rightContent,
}) => {
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-xl"
      style={{
        backgroundColor: 'var(--glass-bg)',
        borderBottom: '1px solid var(--glass-border)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left: Back button or spacer */}
        <div className="w-16 flex items-center">
          {showBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 p-2 -ml-2 rounded-lg transition-colors duration-200"
              style={{ color: 'var(--text-main)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">返回</span>
            </button>
          )}
        </div>

        {/* Center: Title */}
        <h1
          className="text-base font-semibold truncate flex-1 text-center"
          style={{ color: 'var(--text-main)' }}
        >
          {title}
        </h1>

        {/* Right: Custom content or spacer */}
        <div className="w-16 flex items-center justify-end">
          {rightContent}
        </div>
      </div>
    </header>
  );
};
