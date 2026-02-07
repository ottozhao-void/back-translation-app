import React, { useState, useMemo } from 'react';
import { XMarkIcon } from '../Icons';
import { splitIntoSentences } from '../../utils/textUtils';
import {
  ImportMode,
  ImportResult,
  createSentenceModePairs,
  createParagraphModePairs,
  createArticleModePairs,
  ParagraphData,
  addSentencesBatch,
} from '../../utils/sentenceLoader';
import { SentencePair } from '../../types';
import { AlignmentEditor } from './AlignmentEditor';
import { AlignmentPair } from '../../utils/alignmentHelpers';
import {
  segmentText,
  segmentAndAlign,
  translateText,
  getConfig,
} from '../../services/llmService';

interface ImportModalProps {
  onClose: () => void;
  onImportSuccess: (sentences: SentencePair[]) => void;
}

type ModeConfig = {
  id: ImportMode;
  label: string;
  icon: string;
  description: string;
  hint: string;
};

const IMPORT_MODES: ModeConfig[] = [
  {
    id: 'article',
    label: 'Article',
    icon: '📄',
    description: 'Multi-paragraph text',
    hint: 'Paragraphs separated by blank lines. Each paragraph can have multiple sentences.',
  },
  {
    id: 'paragraph',
    label: 'Paragraph',
    icon: '📝',
    description: 'Single paragraph',
    hint: 'Continuous text (no blank lines). Will be split into sentences.',
  },
  {
    id: 'sentence',
    label: 'Sentence',
    icon: '💬',
    description: 'Line by line',
    hint: 'One sentence per line. Lines are matched by position.',
  },
];

// Step states for the import flow
type ImportStep = 'mode-select' | 'input' | 'loading' | 'align' | 'importing';

// Segmentation mode for LLM
type SegmentationMode = 'independent' | 'semantic';

export const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImportSuccess }) => {
  const [activeMode, setActiveMode] = useState<ImportMode | null>(null);
  const [enText, setEnText] = useState('');
  const [zhText, setZhText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Multi-step state
  const [step, setStep] = useState<ImportStep>('mode-select');
  const [segmentationMode, setSegmentationMode] = useState<SegmentationMode>('semantic');
  const [alignmentPairs, setAlignmentPairs] = useState<AlignmentPair[]>([]);
  const [usedFallback, setUsedFallback] = useState(false);
  const [llmAvailable, setLlmAvailable] = useState<boolean | null>(null);
  const [translatingEn, setTranslatingEn] = useState(false);
  const [translatingZh, setTranslatingZh] = useState(false);

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

  // Parse text based on active mode
  const parseResult = useMemo(() => {
    if (!enText.trim() && !zhText.trim()) {
      return { enItems: [], zhItems: [], isValid: false, validationError: null };
    }

    let enItems: string[];
    let zhItems: string[];
    let validationError: string | null = null;

    if (activeMode === 'sentence') {
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

      // Validation: line counts must match
      if (enItems.length !== zhItems.length) {
        validationError = `Line count mismatch: EN (${enItems.length}) vs ZH (${zhItems.length})`;
      }
    } else if (activeMode === 'paragraph') {
      // Paragraph mode: no blank line separators allowed
      const hasEnBlankLine = /\n\s*\n/.test(enText);
      const hasZhBlankLine = /\n\s*\n/.test(zhText);

      if (hasEnBlankLine || hasZhBlankLine) {
        validationError = 'Paragraph mode: remove blank lines (use Article mode for multi-paragraph)';
      }

      enItems = splitIntoSentences(enText);
      zhItems = splitIntoSentences(zhText);
    } else {
      // Article mode: detect paragraphs by blank lines
      const enParagraphs = enText.split(/\n\s*\n/).filter(p => p.trim());
      const zhParagraphs = zhText.split(/\n\s*\n/).filter(p => p.trim());

      if (enParagraphs.length !== zhParagraphs.length) {
        validationError = `Paragraph count mismatch: EN (${enParagraphs.length}) vs ZH (${zhParagraphs.length})`;
      }

      // For preview, use simple regex
      enItems = splitIntoSentences(enText);
      zhItems = splitIntoSentences(zhText);
    }

    const isValid = enItems.length > 0 && !validationError;

    return { enItems, zhItems, isValid, validationError };
  }, [enText, zhText, activeMode]);

  // Handle "Next" button for paragraph/article modes - triggers LLM segmentation
  const handleNext = async () => {
    if (!enText.trim() || !zhText.trim()) return;

    setStep('loading');
    setToast(null);
    setUsedFallback(false);

    try {
      let pairs: AlignmentPair[];

      if (activeMode === 'article') {
        // Article mode: split by paragraphs first, then align each paragraph
        const enParagraphs = enText.split(/\n\s*\n/).filter(p => p.trim());
        const zhParagraphs = zhText.split(/\n\s*\n/).filter(p => p.trim());

        pairs = [];
        for (let i = 0; i < Math.max(enParagraphs.length, zhParagraphs.length); i++) {
          const enPara = enParagraphs[i] || '';
          const zhPara = zhParagraphs[i] || '';

          if (segmentationMode === 'semantic' && llmAvailable) {
            const result = await segmentAndAlign(enPara, zhPara);
            pairs.push(...result.pairs);
            if (result.usedFallback) setUsedFallback(true);
          } else if (llmAvailable) {
            const [enResult, zhResult] = await Promise.all([
              segmentText(enPara, 'en'),
              segmentText(zhPara, 'zh'),
            ]);
            const maxLen = Math.max(enResult.segments.length, zhResult.segments.length);
            for (let j = 0; j < maxLen; j++) {
              pairs.push({ en: enResult.segments[j] || '', zh: zhResult.segments[j] || '' });
            }
          } else {
            const enSegs = splitIntoSentences(enPara);
            const zhSegs = splitIntoSentences(zhPara);
            const maxLen = Math.max(enSegs.length, zhSegs.length);
            for (let j = 0; j < maxLen; j++) {
              pairs.push({ en: enSegs[j] || '', zh: zhSegs[j] || '' });
            }
            setUsedFallback(true);
          }
          // Add paragraph separator marker
          if (i < Math.max(enParagraphs.length, zhParagraphs.length) - 1) {
            pairs.push({ en: '---PARAGRAPH---', zh: '---PARAGRAPH---' });
          }
        }
      } else {
        // Paragraph mode: single paragraph alignment
        if (segmentationMode === 'semantic' && llmAvailable) {
          const result = await segmentAndAlign(enText, zhText);
          pairs = result.pairs;
          if (result.usedFallback) {
            setUsedFallback(true);
            setToast({ message: 'LLM unavailable, using simple segmentation', type: 'warning' });
          }
        } else if (llmAvailable) {
          const [enResult, zhResult] = await Promise.all([
            segmentText(enText, 'en'),
            segmentText(zhText, 'zh'),
          ]);
          const maxLen = Math.max(enResult.segments.length, zhResult.segments.length);
          pairs = [];
          for (let i = 0; i < maxLen; i++) {
            pairs.push({ en: enResult.segments[i] || '', zh: zhResult.segments[i] || '' });
          }
        } else {
          const enSegs = splitIntoSentences(enText);
          const zhSegs = splitIntoSentences(zhText);
          setUsedFallback(true);
          setToast({ message: 'No LLM configured, using simple segmentation', type: 'warning' });
          const maxLen = Math.max(enSegs.length, zhSegs.length);
          pairs = [];
          for (let i = 0; i < maxLen; i++) {
            pairs.push({ en: enSegs[i] || '', zh: zhSegs[i] || '' });
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
        pairs.push({ en: enSegments[i] || '', zh: zhSegments[i] || '' });
      }

      setAlignmentPairs(pairs);
      setToast({ message: 'Error occurred, using simple segmentation', type: 'warning' });
      setStep('align');
    }
  };

  // Handle alignment editor save
  const handleAlignmentSave = async (pairs: AlignmentPair[]) => {
    setStep('importing');

    try {
      // Filter out paragraph separator markers
      const cleanPairs = pairs.filter(p => p.en !== '---PARAGRAPH---');

      let newSentences: SentencePair[];

      if (activeMode === 'article') {
        // Split pairs back into paragraphs based on markers
        const paragraphs: ParagraphData[] = [];
        let currentPara: ParagraphData = { enSentences: [], zhSentences: [] };

        for (const pair of pairs) {
          if (pair.en === '---PARAGRAPH---') {
            if (currentPara.enSentences.length > 0) {
              paragraphs.push(currentPara);
              currentPara = { enSentences: [], zhSentences: [] };
            }
          } else {
            currentPara.enSentences.push(pair.en);
            currentPara.zhSentences.push(pair.zh);
          }
        }
        if (currentPara.enSentences.length > 0) {
          paragraphs.push(currentPara);
        }

        newSentences = createArticleModePairs(paragraphs);
      } else {
        // Paragraph mode
        newSentences = createParagraphModePairs(
          cleanPairs.map(p => p.en),
          cleanPairs.map(p => p.zh)
        );
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

  // Sentence mode direct import (no alignment step needed)
  const handleSentenceImport = async () => {
    if (!parseResult.isValid) return;

    setIsImporting(true);
    setToast(null);

    try {
      const newSentences = createSentenceModePairs(parseResult.enItems, parseResult.zhItems);
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

  // Handle mode selection
  const handleModeSelect = (mode: ImportMode) => {
    setActiveMode(mode);
    setStep('input');
    setEnText('');
    setZhText('');
    setToast(null);
  };

  // Go back to mode selection
  const handleBackToModeSelect = () => {
    setStep('mode-select');
    setActiveMode(null);
    setEnText('');
    setZhText('');
    setToast(null);
  };

  // Handle translation: EN -> ZH
  const handleTranslateEnToZh = async () => {
    if (!enText.trim() || !llmAvailable || translatingEn) return;

    setTranslatingEn(true);
    setToast(null);

    try {
      const result = await translateText(enText, 'en', 'zh');
      if (result.success && result.translation) {
        setZhText(result.translation);
        setToast({ message: 'Translation completed', type: 'success' });
      } else {
        setToast({ message: result.error || 'Translation failed', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Translation error', type: 'error' });
    } finally {
      setTranslatingEn(false);
    }
  };

  // Handle translation: ZH -> EN
  const handleTranslateZhToEn = async () => {
    if (!zhText.trim() || !llmAvailable || translatingZh) return;

    setTranslatingZh(true);
    setToast(null);

    try {
      const result = await translateText(zhText, 'zh', 'en');
      if (result.success && result.translation) {
        setEnText(result.translation);
        setToast({ message: 'Translation completed', type: 'success' });
      } else {
        setToast({ message: result.error || 'Translation failed', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Translation error', type: 'error' });
    } finally {
      setTranslatingZh(false);
    }
  };

  // Validation status display
  const renderValidationStatus = () => {
    const { enItems, zhItems, isValid, validationError } = parseResult;

    if (!enText.trim() && !zhText.trim()) {
      return (
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Enter text to see preview
        </div>
      );
    }

    if (validationError) {
      return (
        <div className="text-sm text-red-400">
          {validationError}
        </div>
      );
    }

    if (activeMode === 'sentence') {
      if (isValid) {
        return (
          <div className="text-sm text-emerald-400">
            Ready to import {enItems.length} sentence pairs
          </div>
        );
      }
    }

    // For paragraph/article modes
    return (
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        ~{enItems.length} EN / ~{zhItems.length} ZH sentences detected
      </div>
    );
  };

  // Mode selection screen
  if (step === 'mode-select') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 backdrop-blur-sm transition-opacity"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={onClose}
        />
        <div
          className="relative w-full max-w-xl glass-panel rounded-2xl shadow-2xl animate-[float_0.3s_ease-out] overflow-hidden"
          style={{ backgroundColor: 'var(--bg-main)' }}
        >
          {/* Header */}
          <div className="h-16 border-b border-[var(--glass-border)] flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <span className="text-lg">+</span>
              <h3 className="text-lg font-medium" style={{ color: 'var(--text-main)' }}>
                Import Sentences
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

          {/* Mode Selection */}
          <div className="p-6">
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Choose how your text is structured:
            </p>
            <div className="space-y-3">
              {IMPORT_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleModeSelect(mode.id)}
                  className="w-full p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--surface-hover)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg text-left group"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-2xl">{mode.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium" style={{ color: 'var(--text-main)' }}>
                        {mode.label}
                      </div>
                      <div className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {mode.description}
                      </div>
                      <div className="text-xs mt-2 opacity-70" style={{ color: 'var(--text-secondary)' }}>
                        {mode.hint}
                      </div>
                    </div>
                    <span className="text-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-main)' }}>
                      →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
  const currentMode = IMPORT_MODES.find(m => m.id === activeMode);

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
            <button
              onClick={handleBackToModeSelect}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              title="Back to mode selection"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xl">{currentMode?.icon}</span>
            <h3 className="text-lg font-medium" style={{ color: 'var(--text-main)' }}>
              Import: {currentMode?.label}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {/* Segmentation Mode Selector (Paragraph/Article only, when LLM available) */}
          {(activeMode === 'paragraph' || activeMode === 'article') && llmAvailable && (
            <div className="mb-4 flex items-center gap-3">
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Segmentation
              </span>
              <div className="flex items-center gap-1 p-0.5 rounded-md bg-[var(--surface-hover)] border border-[var(--glass-border)]">
                <button
                  onClick={() => setSegmentationMode('independent')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    segmentationMode === 'independent'
                      ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                  }`}
                  title="Split each language separately"
                >
                  Independent
                </button>
                <button
                  onClick={() => setSegmentationMode('semantic')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                    segmentationMode === 'semantic'
                      ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                  }`}
                  title="AI aligns meaning across languages"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z" />
                  </svg>
                  Semantic
                </button>
              </div>
            </div>
          )}

          {/* Dual Input Area */}
          <div className="flex gap-4 h-80">
            {/* English Input */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                    English
                  </label>
                  {llmAvailable && (
                    <button
                      onClick={handleTranslateZhToEn}
                      disabled={!zhText.trim() || translatingZh}
                      className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all border ${
                        zhText.trim() && !translatingZh
                          ? 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--surface-hover)] hover:border-[var(--text-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                          : 'border-transparent bg-transparent opacity-30 cursor-not-allowed'
                      }`}
                      title="AI translate from Chinese"
                    >
                      {translatingZh ? (
                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z" />
                        </svg>
                      )}
                      <span>Translate</span>
                    </button>
                  )}
                </div>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {parseResult.enItems.length} {activeMode === 'sentence' ? 'lines' : 'sentences'}
                </span>
              </div>
              <textarea
                value={enText}
                onChange={(e) => setEnText(e.target.value)}
                className="flex-1 bg-[var(--surface-hover)] border border-[var(--glass-border)] rounded-lg px-4 py-3 outline-none focus:border-[var(--text-main)] transition-colors resize-none font-mono text-sm"
                style={{ color: 'var(--text-main)' }}
                placeholder={
                  activeMode === 'sentence'
                    ? 'Enter one sentence per line...'
                    : activeMode === 'paragraph'
                    ? 'Paste a single paragraph (no blank lines)...'
                    : 'Paste text with paragraphs separated by blank lines...'
                }
              />
            </div>

            {/* Chinese Input */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                    中文
                  </label>
                  {llmAvailable && (
                    <button
                      onClick={handleTranslateEnToZh}
                      disabled={!enText.trim() || translatingEn}
                      className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all border ${
                        enText.trim() && !translatingEn
                          ? 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--surface-hover)] hover:border-[var(--text-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                          : 'border-transparent bg-transparent opacity-30 cursor-not-allowed'
                      }`}
                      title="AI translate from English"
                    >
                      {translatingEn ? (
                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z" />
                        </svg>
                      )}
                      <span>Translate</span>
                    </button>
                  )}
                </div>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {parseResult.zhItems.length} {activeMode === 'sentence' ? 'lines' : 'sentences'}
                </span>
              </div>
              <textarea
                value={zhText}
                onChange={(e) => setZhText(e.target.value)}
                className="flex-1 bg-[var(--surface-hover)] border border-[var(--glass-border)] rounded-lg px-4 py-3 outline-none focus:border-[var(--text-main)] transition-colors resize-none font-mono text-sm"
                style={{ color: 'var(--text-main)' }}
                placeholder={
                  activeMode === 'sentence'
                    ? '每行输入一个句子...'
                    : activeMode === 'paragraph'
                    ? '粘贴单个段落（不含空行）...'
                    : '粘贴多段落文本，段落间用空行分隔...'
                }
              />
            </div>
          </div>

          {/* Mode hint */}
          <div className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {currentMode?.hint}
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
              onClick={handleBackToModeSelect}
              className="px-6 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--text-main)' }}
            >
              ← Back
            </button>

            {/* Different button based on mode */}
            {activeMode === 'sentence' ? (
              <button
                onClick={handleSentenceImport}
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
                disabled={!enText.trim() || !zhText.trim() || !!parseResult.validationError}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all shadow-lg ${
                  enText.trim() && zhText.trim() && !parseResult.validationError
                    ? 'hover:shadow-xl transform hover:-translate-y-0.5'
                    : 'opacity-50 cursor-not-allowed'
                }`}
                style={{
                  backgroundColor: enText.trim() && zhText.trim() && !parseResult.validationError ? 'var(--text-main)' : 'var(--surface-hover)',
                  color: enText.trim() && zhText.trim() && !parseResult.validationError ? 'var(--bg-main)' : 'var(--text-secondary)',
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
