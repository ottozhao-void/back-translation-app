import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from '../Icons';

interface TextEditModalProps {
  title: string;
  label: string;
  initialValue: string;
  onSave: (newValue: string) => void;
  onCancel: () => void;
}

export const TextEditModal: React.FC<TextEditModalProps> = ({
  title,
  label,
  initialValue,
  onSave,
  onCancel,
}) => {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus and select text when modal opens
    textareaRef.current?.focus();
    textareaRef.current?.select();

    // Handle escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== initialValue.trim()) {
      onSave(trimmed);
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  const hasChanges = value.trim() !== initialValue.trim();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        className="relative glass-panel rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl"
        style={{ borderColor: 'var(--border-high-contrast)' }}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-full transition-colors hover:bg-[var(--surface-hover)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <XMarkIcon />
        </button>

        {/* Header */}
        <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--text-main)' }}>
          {title}
        </h3>

        {/* Label */}
        <label className="block text-xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          className="w-full px-4 py-3 rounded-lg text-base leading-relaxed font-serif-sc resize-none input-glow transition-all custom-scrollbar"
          style={{
            backgroundColor: 'var(--surface-hover)',
            color: 'var(--text-main)',
            border: '1px solid var(--glass-border)',
            outline: 'none',
          }}
        />

        {/* Hint */}
        <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
          Press <kbd className="px-1 py-0.5 rounded bg-[var(--surface-hover)]">⌘</kbd> + <kbd className="px-1 py-0.5 rounded bg-[var(--surface-hover)]">Enter</kbd> to save
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--surface-hover)',
              color: 'var(--text-main)',
              border: '1px solid var(--glass-border)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!value.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: hasChanges ? 'var(--text-main)' : 'var(--surface-hover)',
              color: hasChanges ? 'var(--bg-main)' : 'var(--text-secondary)',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
