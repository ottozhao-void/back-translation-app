import React, { useState } from 'react';

interface MobileModeSelectorProps {
  onSelectRandomMode: () => void;
  totalSentenceCount: number;
  isLoading: boolean;
}

/**
 * MobileModeSelector - Practice mode selection screen for mobile
 *
 * Currently implements:
 * - Random mode: shuffles all sentences for practice
 *
 * Future modes (placeholders):
 * - Sequential mode: practice in order
 * - By source: practice by article/paragraph
 * - Review mode: only practiced sentences
 */
export const MobileModeSelector: React.FC<MobileModeSelectorProps> = ({
  onSelectRandomMode,
  totalSentenceCount,
  isLoading,
}) => {
  const [isAnimatingIn] = useState(true);

  const isDisabled = isLoading || totalSentenceCount === 0;

  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col items-center justify-center px-6 ${
        isAnimatingIn ? 'mobile-fade-in' : ''
      }`}
      style={{ backgroundColor: 'var(--bg-main)' }}
    >
      {/* Title */}
      <h2
        className="text-2xl font-serif font-light mb-12"
        style={{ color: 'var(--text-main)' }}
      >
        选择练习模式
      </h2>

      {/* Mode buttons */}
      <div className="w-full max-w-xs space-y-4">
        {/* Random Mode Button */}
        <button
          onClick={onSelectRandomMode}
          disabled={isDisabled}
          className={`w-full py-4 px-6 rounded-2xl flex items-center justify-between transition-all duration-200 ${
            isDisabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:scale-[1.02] active:scale-[0.98]'
          }`}
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-3">
            {/* Shuffle icon */}
            <span className="text-2xl">🎲</span>
            <div className="text-left">
              <div
                className="font-medium"
                style={{ color: 'var(--text-main)' }}
              >
                随机模式
              </div>
              <div
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {isLoading
                  ? '加载中...'
                  : totalSentenceCount === 0
                  ? '暂无句子'
                  : `共 ${totalSentenceCount} 个句子`}
              </div>
            </div>
          </div>

          {/* Arrow icon */}
          <svg
            className="w-5 h-5"
            style={{ color: 'var(--text-secondary)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        {/* Future mode placeholders - commented out for now */}
        {/*
        <button disabled className="w-full py-4 px-6 rounded-2xl opacity-40" style={{ backgroundColor: 'var(--surface-elevated)' }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📖</span>
            <div className="text-left">
              <div style={{ color: 'var(--text-main)' }}>顺序模式</div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>即将推出</div>
            </div>
          </div>
        </button>
        */}
      </div>

      {/* Empty state hint */}
      {totalSentenceCount === 0 && !isLoading && (
        <p
          className="mt-8 text-sm text-center"
          style={{ color: 'var(--text-secondary)' }}
        >
          请先在桌面端添加句子
        </p>
      )}
    </div>
  );
};
