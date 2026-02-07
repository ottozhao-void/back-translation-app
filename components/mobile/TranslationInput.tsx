import React, { useRef, useEffect } from 'react';

interface TranslationInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * TranslationInput - Text area for entering translations
 *
 * Features:
 * - Auto-resize based on content
 * - Mobile keyboard optimized
 * - Disabled state when answer is shown
 */
export const TranslationInput: React.FC<TranslationInputProps> = ({
  value,
  onChange,
  placeholder = 'Enter your translation...',
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [value]);

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
        className={`w-full px-4 py-3 text-base bg-transparent resize-none outline-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        style={{
          color: 'var(--text-main)',
          minHeight: '80px',
          maxHeight: '150px',
        }}
      />

      {/* Character count */}
      <div
        className="absolute bottom-2 right-3 text-xs"
        style={{ color: 'var(--text-secondary)' }}
      >
        {value.length}
      </div>
    </div>
  );
};
