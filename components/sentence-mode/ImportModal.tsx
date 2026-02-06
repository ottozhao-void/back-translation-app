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
import { AlignmentEditor } from './AlignmentEditor';
import { AlignmentPair } from '../../utils/alignmentHelpers';
import {
  segmentText,
  segmentAndAlign,
  getConfig,
} from '../../services/llmService';

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

// Step states for paragraph/article mode
type ImportStep = 'input' | 'loading' | 'align' | 'importing';

// Segmentation mode for LLM
type SegmentationMode = 'independent' | 'semantic';

export const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImportSuccess }) => {
  const [activeTab, setActiveTab] = useState<ImportMode>('batch');
  const [enText, setEnText] = useState('');
  const [zhText, setZhText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const fileInputEnRef = useRef<HTMLInputElement>(null);
  const fileInputZhRef = useRef<HTMLInputElement>(null);

  // Multi-step state for paragraph/article modes
  const [step, setStep] = useState<ImportStep>('input');
  const [segmentationMode, setSegmentationMode] = useState<SegmentationMode>('independent');
  const [alignmentPairs, setAlignmentPairs] = useState<AlignmentPair[]>([]);
  const [usedFallback, setUsedFallback] = useState(false);
  const [llmAvailable, setLlmAvailable] = useState<boolean | null>(null);

  // Check if LLM is configured on mount
  React.useEffect(() => {
    checkLlmAvailable();
  }, []);

  const checkLlmAvailable = async () => {
    const result = await getConfig();
    if (result.success && result.config) {
      const hasProvider = result.config.providers.some((p) => p.isEnabled);
      const hasDefault = result.config.defaultProvider && result.config.defaultModel;
      setLlmAvailable(hasProvider && !!hasDefault);
    } else {
      setLlmAvailable(false);
    }
  };

  // Parse text based on active mode (for batch mode only now)
  const parseResult = useMemo(() => {
    if (!enText.trim() && !zhText.trim()) {
      return { enItems: [], zhItems: [], isValid: false };
    }

    let enItems: string[];
    let zhItems: string[];

    if (activeTab === 'batch') {
      // Line by line - preserve alignment by NOT filtering empty lines
      const rawEn = enText.split('\n').map(l => l.trim());
      const rawZh = zhText.split('\n').map(l => l.trim());

      const maxLength = Math.max(rawEn.length, rawZh.length);
      enItems = [];
      zhItems = [];

      for (let i = 0; i < maxLength; i++) {
        const en = rawEn[i] || '';
        const zh = rawZh[i] || '';
        if (en || zh) {
          enItems.push(en);
          zhItems.push(zh);
        }
      }
    } else {
      // For paragraph/article, use simple regex for preview count
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
    e.target.value = '';
  };

  // Handle "Next" button for paragraph/article modes - triggers LLM segmentation
  const handleNext = async () => {
    if (!enText.trim() || !zhText.trim()) return;

    setStep('loading');
    setToast(null);
    setUsedFallback(false);

    try {
      let pairs: AlignmentPair[];

      if (segmentationMode === 'semantic' && llmAvailable) {
        // Use semantic alignment (single LLM call for both texts)
        const result = await segmentAndAlign(enText, zhText);
        pairs = result.pairs;
        if (result.usedFallback) {
          setUsedFallback(true);
          setToast({
            message: 'LLM unavailable, using simple segmentation',
            type: 'warning',
          });
        }
      } else {
        // Independent segmentation
        if (llmAvailable) {
          // Use LLM for each language
          const [enResult, zhResult] = await Promise.all([
            segmentText(enText, 'en'),
            segmentText(zhText, 'zh'),
          ]);

          const enSegments = enResult.segments;
          const zhSegments = zhResult.segments;

          if (enResult.usedFallback || zhResult.usedFallback) {
            setUsedFallback(true);
            setToast({
              message: 'LLM unavailable for some text, using simple segmentation',
              type: 'warning',
            });
          }

          // Build pairs (may have different lengths)
          const maxLen = Math.max(enSegments.length, zhSegments.length);
          pairs = [];
          for (let i = 0; i < maxLen; i++) {
            pairs.push({
              en: enSegments[i] || '',
              zh: zhSegments[i] || '',
            });
          }
        } else {
          // No LLM available, use regex fallback
          const enSegments = splitIntoSentences(enText);
          const zhSegments = splitIntoSentences(zhText);
          setUsedFallback(true);
          setToast({
            message: 'No LLM configured, using simple segmentation',
            type: 'warning',
          });

          const maxLen = Math.max(enSegments.length, zhSegments.length);
          pairs = [];
          for (let i = 0; i < maxLen; i++) {
            pairs.push({
              en: enSegments[i] || '',
              zh: zhSegments[i] || '',
            });
          }
        }
      }

      setAlignmentPairs(pairs);
      setStep('align');
    } catch (error) {
      console.error('Segmentation error:', error);
      // Fallback to regex
      const enSegments = splitIntoSentences(enText);
      const zhSegments = splitIntoSentences(zhText);
      setUsedFallback(true);

      const maxLen = Math.max(enSegments.length, zhSegments.length);
      const pairs: AlignmentPair[] = [];
      for (let i = 0; i < maxLen; i++) {
        pairs.push({
          en: enSegments[i] || '',
          zh: zhSegments[i] || '',
        });
      }

      setAlignmentPairs(pairs);
      setToast({
        message: 'Error occurred, using simple segmentation',
        type: 'warning',
      });
      setStep('align');
    }
  };

  // Handle alignment editor save
  const handleAlignmentSave = async (pairs: AlignmentPair[]) => {
    setStep('importing');

    try {
      const enItems = pairs.map((p) => p.en);
      const zhItems = pairs.map((p) => p.zh);

      let newSentences: SentencePair[];
      if (activeTab === 'paragraph') {
        newSentences = createParagraphSentences(enItems, zhItems);
      } else {
        newSentences = createArticleSentences(enItems, zhItems);
      }

      const result: ImportResult = await addSentencesBatch(newSentences);

      if (result.success) {
        setToast({ message: `Successfully imported ${result.count} sentences`, type: 'success' });
        onImportSuccess(newSentences);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setToast({ message: result.error || 'Import failed', type: 'error' });
        setStep('align');
      }
    } catch (error) {
      setToast({ message: 'An error occurred during import', type: 'error' });
      setStep('align');
    }
  };

  // Handle alignment editor cancel - go back to input
  const handleAlignmentCancel = () => {
    setStep('input');
    setAlignmentPairs([]);
  };

  // Batch mode direct import
  const handleImport = async () => {
    if (!parseResult.isValid) return;

    setIsImporting(true);
    setToast(null);

    try {
      const newSentences = createBatchSentences(parseResult.enItems, parseResult.zhItems);
      const result: ImportResult = await addSentencesBatch(newSentences);

      if (result.success) {
        setToast({ message: `Successfully imported ${result.count} sentences`, type: 'success' });
        onImportSuccess(newSentences);
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
    setStep('input');
    setAlignmentPairs([]);
    setToast(null);
  };

  // Reset step when changing tabs
  const handleTabChange = (tab: ImportMode) => {
    setActiveTab(tab);
    setStep('input');
    setAlignmentPairs([]);
    setToast(null);
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

    if (activeTab === 'batch') {
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
    }

    // For paragraph/article modes
    return (
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        ~{enItems.length} EN / ~{zhItems.length} ZH sentences detected
      </div>
    );
  };

  // If in alignment step, show the AlignmentEditor
  if (step === 'align' || step === 'importing') {
    return (
      <AlignmentEditor
        initialPairs={alignmentPairs}
        onSave={handleAlignmentSave}
        onCancel={handleAlignmentCancel}
        title={usedFallback ? 'Align Sentences (Simple Mode)' : 'Align Sentences'}
      />
    );
  }

  // Loading state
  if (step === 'loading') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 backdrop-blur-sm transition-opacity"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        />
        <div
          className="relative glass-panel rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4"
          style={{ backgroundColor: 'var(--bg-main)' }}
        >
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--text-main)] border-t-transparent" />
          <div className="text-lg font-medium" style={{ color: 'var(--text-main)' }}>
            {llmAvailable ? 'Segmenting with AI...' : 'Segmenting...'}
          </div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {segmentationMode === 'semantic'
              ? 'Analyzing semantic alignment'
              : 'Splitting into sentences'}
          </div>
        </div>
      </div>
    );
  }

  // Input step
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
              onClick={() => handleTabChange(tab.id)}
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

          {/* Segmentation Mode Selector (Paragraph/Article only, when LLM available) */}
          {(activeTab === 'paragraph' || activeTab === 'article') && llmAvailable && (
            <div className="mb-4 p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-hover)]/30">
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Segmentation Mode
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSegmentationMode('independent')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all ${
                    segmentationMode === 'independent'
                      ? 'bg-[var(--surface-active)] text-[var(--text-main)] border border-[var(--text-main)]'
                      : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-transparent'
                  }`}
                >
                  <div className="font-medium">Independent</div>
                  <div className="text-xs opacity-70 mt-0.5">Split each language separately</div>
                </button>
                <button
                  onClick={() => setSegmentationMode('semantic')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all ${
                    segmentationMode === 'semantic'
                      ? 'bg-[var(--surface-active)] text-[var(--text-main)] border border-[var(--text-main)]'
                      : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-transparent'
                  }`}
                >
                  <div className="font-medium">Semantic Align</div>
                  <div className="text-xs opacity-70 mt-0.5">AI aligns meaning across languages</div>
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
            {activeTab === 'paragraph' &&
              (llmAvailable
                ? 'Text will be split using AI. You can review and adjust alignment.'
                : 'Text will be automatically split into sentences.')}
            {activeTab === 'article' &&
              (llmAvailable
                ? 'Upload files or paste text. AI will segment and you can review alignment.'
                : 'Upload files or paste text. Text will be automatically split into sentences.')}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--glass-border)] flex items-center justify-between bg-[var(--surface-hover)]/10 flex-shrink-0">
          <div className="flex items-center gap-4">
            {renderValidationStatus()}
            {toast && (
              <div
                className={`text-sm ${
                  toast.type === 'success'
                    ? 'text-emerald-400'
                    : toast.type === 'warning'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
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

            {/* Different button based on mode */}
            {activeTab === 'batch' ? (
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
            ) : (
              <button
                onClick={handleNext}
                disabled={!enText.trim() || !zhText.trim()}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all shadow-lg ${
                  enText.trim() && zhText.trim()
                    ? 'hover:shadow-xl transform hover:-translate-y-0.5'
                    : 'opacity-50 cursor-not-allowed'
                }`}
                style={{
                  backgroundColor: enText.trim() && zhText.trim() ? 'var(--text-main)' : 'var(--surface-hover)',
                  color: enText.trim() && zhText.trim() ? 'var(--bg-main)' : 'var(--text-secondary)',
                }}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
