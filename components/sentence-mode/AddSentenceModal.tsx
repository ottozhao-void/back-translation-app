import React, { useState } from 'react';
import { XMarkIcon } from '../Icons';

interface AddSentenceModalProps {
  onClose: () => void;
  onAdd: (en: string, zh: string) => void;
}

export const AddSentenceModal: React.FC<AddSentenceModalProps> = ({ onClose, onAdd }) => {
  const [enText, setEnText] = useState('');
  const [zhText, setZhText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!enText.trim() || !zhText.trim()) return;

    setIsSubmitting(true);
    await onAdd(enText.trim(), zhText.trim());
    setIsSubmitting(false);
    onClose();
  };

  const isValid = enText.trim() && zhText.trim();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-2xl glass-panel rounded-2xl shadow-2xl animate-[float_0.3s_ease-out] overflow-hidden"
        style={{ backgroundColor: 'var(--bg-main)' }}
      >
        {/* Header */}
        <div className="h-16 border-b border-[var(--glass-border)] flex items-center justify-between px-6">
          <h3 className="text-lg font-medium" style={{ color: 'var(--text-main)' }}>
            Add Sentence Pair
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--surface-hover)] transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <XMarkIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* English Input */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-main)' }}>
              English
            </label>
            <textarea
              value={enText}
              onChange={(e) => setEnText(e.target.value)}
              className="w-full h-32 bg-[var(--surface-hover)] border border-[var(--glass-border)] rounded-lg px-4 py-3 outline-none focus:border-[var(--text-main)] transition-colors resize-none"
              style={{ color: 'var(--text-main)' }}
              placeholder="Enter English text..."
            />
          </div>

          {/* Chinese Input */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-main)' }}>
              中文
            </label>
            <textarea
              value={zhText}
              onChange={(e) => setZhText(e.target.value)}
              className="w-full h-32 bg-[var(--surface-hover)] border border-[var(--glass-border)] rounded-lg px-4 py-3 outline-none focus:border-[var(--text-main)] transition-colors resize-none"
              style={{ color: 'var(--text-main)' }}
              placeholder="输入中文文本..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--glass-border)] flex justify-end gap-4 bg-[var(--surface-hover)]/10">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--text-main)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all shadow-lg ${
              isValid && !isSubmitting
                ? 'hover:shadow-xl transform hover:-translate-y-0.5'
                : 'opacity-50 cursor-not-allowed'
            }`}
            style={{
              backgroundColor: isValid ? 'var(--text-main)' : 'var(--surface-hover)',
              color: isValid ? 'var(--bg-main)' : 'var(--text-secondary)'
            }}
          >
            {isSubmitting ? 'Adding...' : 'Add Sentence'}
          </button>
        </div>
      </div>
    </div>
  );
};
