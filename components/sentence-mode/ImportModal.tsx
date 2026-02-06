import React, { useState, useMemo, useRef } from 'react';
import { XMarkIcon, UploadIconSmall } from '../Icons';
import { splitIntoSentences } from '../../utils/textUtils';
import {
  ImportMode,
  ImportResult,
  createBatchSentences,
  createParagraphSentences,
  createArticleSentences,
  addSentencesBatch,
} from '../../utils/sentenceLoader';
import { SentencePair } from '../../types';

interface ImportModalProps {
  onClose: () => void;
  onImportSuccess: (sentences: SentencePair[]) => void;
}

type TabConfig = {
  id: ImportMode;
  label: string;
  description: string;
};

const TABS: TabConfig[] = [
  { id: 'batch', label: 'Batch', description: 'Import line by line' },
  { id: 'paragraph', label: 'Paragraph', description: 'Auto-split sentences' },
  { id: 'article', label: 'Article', description: 'Import from file or text' },
];

export const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImportSuccess }) => {
  const [activeTab, setActiveTab] = useState<ImportMode>('batch');
  const [enText, setEnText] = useState('');
  const [zhText, setZhText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const fileInputEnRef = useRef<HTMLInputElement>(null);
  const fileInputZhRef = useRef<HTMLInputElement>(null);

  // Parse text based on active mode
  const parseResult = useMemo(() => {
    if (!enText.trim() && !zhText.trim()) {
      return { enItems: [], zhItems: [], isValid: false };
    }

    let enItems: string[];
    let zhItems: string[];

    if (activeTab === 'batch') {
      // Line by line - preserve alignment by NOT filtering empty lines
      // This ensures line N in English matches line N in Chinese
      const rawEn = enText.split('\n').map(l => l.trim());
      const rawZh = zhText.split('\n').map(l => l.trim());

      // Take max length to prevent data loss
      const maxLength = Math.max(rawEn.length, rawZh.length);
      enItems = [];
      zhItems = [];

      for (let i = 0; i < maxLength; i++) {
        const en = rawEn[i] || '';
        const zh = rawZh[i] || '';
        // Only include pairs where at least one side has content
        if (en || zh) {
          enItems.push(en);
          zhItems.push(zh);
        }
      }
    } else {
      // Paragraph/Article - use sentence splitter
      enItems = splitIntoSentences(enText);
      zhItems = splitIntoSentences(zhText);
    }

    const isValid = enItems.length > 0 && enItems.length === zhItems.length;

    return { enItems, zhItems, isValid };
  }, [enText, zhText, activeTab]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, lang: 'en' | 'zh') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (lang === 'en') {
        setEnText(text);
      } else {
        setZhText(text);
      }
    };
    reader.readAsText(file);

    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!parseResult.isValid) return;

    setIsImporting(true);
    setToast(null);

    try {
      let newSentences: SentencePair[];

      switch (activeTab) {
        case 'batch':
          newSentences = createBatchSentences(parseResult.enItems, parseResult.zhItems);
          break;
        case 'paragraph':
          newSentences = createParagraphSentences(parseResult.enItems, parseResult.zhItems);
          break;
        case 'article':
          newSentences = createArticleSentences(parseResult.enItems, parseResult.zhItems);
          break;
      }

      const result: ImportResult = await addSentencesBatch(newSentences);

      if (result.success) {
        setToast({ message: `Successfully imported ${result.count} sentences`, type: 'success' });
        onImportSuccess(newSentences);
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setToast({ message: result.error || 'Import failed', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'An error occurred during import', type: 'error' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClear = () => {
    setEnText('');
    setZhText('');
  };

  // Validation status display
  const renderValidationStatus = () => {
    const { enItems, zhItems, isValid } = parseResult;

    if (!enText.trim() && !zhText.trim()) {
      return (
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Enter text to see preview
        </div>
      );
    }

    if (isValid) {
      return (
        <div className="text-sm text-emerald-400">
          Ready to import {enItems.length} sentence pairs
        </div>
      );
    }

    return (
      <div className="text-sm text-red-400">
        Mismatch: English ({enItems.length}) vs Chinese ({zhItems.length})
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-4xl max-h-[85vh] glass-panel rounded-2xl shadow-2xl animate-[float_0.3s_ease-out] overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-main)' }}
      >
        {/* Header */}
        <div className="h-16 border-b border-[var(--glass-border)] flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-lg">+</span>
            <h3 className="text-lg font-medium" style={{ color: 'var(--text-main)' }}>
              Import
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--surface-hover)] transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <XMarkIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--glass-border)] flex-shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all relative ${
                activeTab === tab.id
                  ? 'text-[var(--text-main)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
              }`}
            >
              <div>{tab.label}</div>
              <div className="text-xs opacity-60 mt-0.5">{tab.description}</div>
              {activeTab === tab.id && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: 'var(--text-main)' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {/* File Upload (Article tab only) */}
          {activeTab === 'article' && (
            <div className="mb-4 flex gap-4">
              <div className="flex-1">
                <input
                  ref={fileInputEnRef}
                  type="file"
                  accept=".txt,.md"
                  onChange={(e) => handleFileUpload(e, 'en')}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputEnRef.current?.click()}
                  className="w-full py-2 px-4 rounded-lg text-sm border border-dashed border-[var(--glass-border)] hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center gap-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <UploadIconSmall />
                  <span>Upload English file</span>
                </button>
              </div>
              <div className="flex-1">
                <input
                  ref={fileInputZhRef}
                  type="file"
                  accept=".txt,.md"
                  onChange={(e) => handleFileUpload(e, 'zh')}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputZhRef.current?.click()}
                  className="w-full py-2 px-4 rounded-lg text-sm border border-dashed border-[var(--glass-border)] hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center gap-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <UploadIconSmall />
                  <span>Upload Chinese file</span>
                </button>
              </div>
            </div>
          )}

          {/* Dual Input Area */}
          <div className="flex gap-4 h-80">
            {/* English Input */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                  English
                </label>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {parseResult.enItems.length} {activeTab === 'batch' ? 'lines' : 'sentences'}
                </span>
              </div>
              <textarea
                value={enText}
                onChange={(e) => setEnText(e.target.value)}
                className="flex-1 bg-[var(--surface-hover)] border border-[var(--glass-border)] rounded-lg px-4 py-3 outline-none focus:border-[var(--text-main)] transition-colors resize-none font-mono text-sm"
                style={{ color: 'var(--text-main)' }}
                placeholder={
                  activeTab === 'batch'
                    ? 'Enter one sentence per line...'
                    : 'Paste English text here...'
                }
              />
            </div>

            {/* Chinese Input */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                  中文
                </label>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {parseResult.zhItems.length} {activeTab === 'batch' ? 'lines' : 'sentences'}
                </span>
              </div>
              <textarea
                value={zhText}
                onChange={(e) => setZhText(e.target.value)}
                className="flex-1 bg-[var(--surface-hover)] border border-[var(--glass-border)] rounded-lg px-4 py-3 outline-none focus:border-[var(--text-main)] transition-colors resize-none font-mono text-sm"
                style={{ color: 'var(--text-main)' }}
                placeholder={
                  activeTab === 'batch'
                    ? '每行输入一个句子...'
                    : '在此粘贴中文文本...'
                }
              />
            </div>
          </div>

          {/* Mode hint */}
          <div className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {activeTab === 'batch' && 'Each line will be treated as a separate sentence pair.'}
            {activeTab === 'paragraph' && 'Text will be automatically split into sentences.'}
            {activeTab === 'article' && 'Upload files or paste text. Text will be automatically split into sentences.'}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--glass-border)] flex items-center justify-between bg-[var(--surface-hover)]/10 flex-shrink-0">
          <div className="flex items-center gap-4">
            {renderValidationStatus()}
            {toast && (
              <div
                className={`text-sm ${toast.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}
              >
                {toast.message}
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleClear}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              Clear
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--text-main)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!parseResult.isValid || isImporting}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all shadow-lg ${
                parseResult.isValid && !isImporting
                  ? 'hover:shadow-xl transform hover:-translate-y-0.5'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              style={{
                backgroundColor: parseResult.isValid ? 'var(--text-main)' : 'var(--surface-hover)',
                color: parseResult.isValid ? 'var(--bg-main)' : 'var(--text-secondary)',
              }}
            >
              {isImporting ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
