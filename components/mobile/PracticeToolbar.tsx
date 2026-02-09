import React from 'react';

interface PracticeToolbarProps {
  onSubmit: () => void;
  onReset: () => void;
  onFeedback: () => void;
  isSubmitDisabled: boolean;
  isSubmitted: boolean;
}

/**
 * PracticeToolbar - Bottom action bar for practice view
 *
 * Actions (before submit):
 * - Submit: Submit translation
 * - Reset: Clear current input
 *
 * Actions (after submit):
 * - AI Feedback: Get LLM feedback on translation
 * - Reset: Start over
 */
export const PracticeToolbar: React.FC<PracticeToolbarProps> = ({
  onSubmit,
  onReset,
  onFeedback,
  isSubmitDisabled,
  isSubmitted,
}) => {
  // Different button configurations based on submission state
  const buttons = isSubmitted
    ? [
        {
          id: 'feedback',
          label: 'AI 反馈',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
          ),
          onClick: onFeedback,
          isPrimary: true,
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
      ]
    : [
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
