import React from 'react';

interface PracticeToolbarProps {
  onSubmit: () => void;
  onSkip: () => void;
  onReset: () => void;
  isSubmitDisabled: boolean;
}

/**
 * PracticeToolbar - Bottom action bar for practice view
 *
 * Actions:
 * - Submit: Submit translation
 * - Skip: Move to next sentence
 * - Reset: Clear current input
 */
export const PracticeToolbar: React.FC<PracticeToolbarProps> = ({
  onSubmit,
  onSkip,
  onReset,
  isSubmitDisabled,
}) => {
  const buttons = [
    {
      id: 'submit',
      label: '提交',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M5 13l4 4L19 7" />
        </svg>
      ),
      onClick: onSubmit,
      isPrimary: true,
      disabled: isSubmitDisabled,
    },
    {
      id: 'skip',
      label: '跳过',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      ),
      onClick: onSkip,
    },
    {
      id: 'reset',
      label: '重置',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      onClick: onReset,
    },
  ];

  return (
    <div
      className="flex justify-around items-center py-3 px-2 rounded-xl"
      style={{
        backgroundColor: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
      }}
    >
      {buttons.map(button => (
        <button
          key={button.id}
          onClick={button.onClick}
          disabled={button.disabled}
          className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-all duration-200 ${
            button.disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'
          }`}
          style={{
            backgroundColor: button.isPrimary
              ? 'var(--text-main)'
              : 'transparent',
            color: button.isPrimary
              ? 'var(--bg-main)'
              : 'var(--text-main)',
          }}
        >
          {button.icon}
          <span className="text-xs">{button.label}</span>
        </button>
      ))}
    </div>
  );
};
