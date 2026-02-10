import React, { useState, useCallback, useEffect } from 'react';
import { SentencePair, PracticeMode, TagInfo, VocabularyType, SentenceAnalysis, SemanticUnit } from '../../../types';
import { SpeakerIcon, PencilIcon, MagicWandIcon } from '../../Icons';
import { playTextToSpeech } from '../../../services/geminiService';
import { TextEditModal } from '../TextEditModal';
import { TagChip } from '../TagChip';
import { TextSelectionPopover, PatternSuggestionModal } from '../../vocabulary';
import { suggestPatterns, analyzeSentence } from '../../../services/llmService';
import { InteractiveSentenceRenderer } from '../InteractiveSentenceRenderer';
import { PatternChips } from '../PatternChips';
import { SemanticUnitPopover } from '../SemanticUnitPopover';

interface PatternSuggestion {
  text: string;
  template: string;
  explanation: string;
}

interface SentenceInfoCardProps {
  sentence: SentencePair;
  practiceMode: PracticeMode;
  allSentences: SentencePair[];
  onStartPractice: () => void;
  onShowParagraphContext: () => void;
  onShowArticleContext: () => void;
  onModeToggle: () => void;
  onUpdateSentence?: (id: string, updates: Partial<SentencePair>) => void;
  hideReferenceInDetailView?: boolean;
  // Tag system props
  allTags?: TagInfo[];
  onToggleTag?: (tagId: string) => void;
  onOpenTagPicker?: () => void;
  // Vocabulary props
  onAddVocabulary?: (text: string, type: VocabularyType) => void;
  onAddPattern?: (text: string, template: string, explanation: string) => void;
}

/**
 * SentenceInfoCard - 句子详情卡片
 *
 * 显示句子的源文本和参考译文，支持编辑和 TTS 朗读。
 * 从原 SentenceDetailView 抽取的核心内容卡片。
 */
export const SentenceInfoCard: React.FC<SentenceInfoCardProps> = ({
  sentence,
  practiceMode,
  allSentences,
  onStartPractice,
  onShowParagraphContext,
  onShowArticleContext,
  onModeToggle,
  onUpdateSentence,
  hideReferenceInDetailView = true,
  allTags = [],
  onToggleTag,
  onOpenTagPicker,
  onAddVocabulary,
  onAddPattern,
}) => {
  // State to temporarily reveal the hidden reference
  const [isReferenceRevealed, setIsReferenceRevealed] = useState(false);

  // State for edit modal
  const [editingField, setEditingField] = useState<'en' | 'zh' | null>(null);

  // Text selection state
  const [selection, setSelection] = useState<{
    text: string;
    position: { x: number; y: number };
  } | null>(null);

  // Pattern suggestion modal state
  const [patternModal, setPatternModal] = useState<{
    isOpen: boolean;
    isLoading: boolean;
    patterns: PatternSuggestion[];
    error?: string;
  }>({ isOpen: false, isLoading: false, patterns: [] });

  // Semantic analysis state
  const [analysisState, setAnalysisState] = useState<{
    status: 'none' | 'loading' | 'completed' | 'error';
    data?: SentenceAnalysis;
    error?: string;
  }>({ status: 'none' });

  const [hoveredPatternId, setHoveredPatternId] = useState<string | null>(null);

  const [selectedUnit, setSelectedUnit] = useState<SemanticUnit | null>(null);

  // Interactive mode must be explicitly toggled by the user
  const [isInteractiveMode, setIsInteractiveMode] = useState(false);

  // Reset transient state when switching sentences
  useEffect(() => {
    setSelectedUnit(null);
    setHoveredPatternId(null);
    setSelection(null);
    setIsReferenceRevealed(false);
    setIsInteractiveMode(false);
    // Restore persisted analysis or reset
    if (sentence.analysis) {
      setAnalysisState({ status: 'completed', data: sentence.analysis });
    } else {
      setAnalysisState({ status: 'none' });
    }
  }, [sentence.id]);

  // Handle text selection
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // Only handle selection when not in interactive mode
    if (isInteractiveMode) return;

    const selectedText = window.getSelection()?.toString().trim();
    if (selectedText && selectedText.length > 0 && selectedText.length < 200) {
      // Get selection position
      const selectionObj = window.getSelection();
      if (selectionObj && selectionObj.rangeCount > 0) {
        const range = selectionObj.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelection({
          text: selectedText,
          position: {
            x: rect.left + rect.width / 2,
            y: rect.top,
          },
        });
      }
    } else {
      // Clear selection if clicking without selecting
      setSelection(null);
    }
  }, [isInteractiveMode]);

  // Handle adding vocabulary
  const handleAddWord = useCallback(() => {
    if (selection && onAddVocabulary) {
      onAddVocabulary(selection.text, 'word');
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    }
  }, [selection, onAddVocabulary]);

  const handleAddCollocation = useCallback(() => {
    if (selection && onAddVocabulary) {
      onAddVocabulary(selection.text, 'collocation');
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    }
  }, [selection, onAddVocabulary]);

  // Handle pattern suggestion
  const handleSuggestPatterns = useCallback(async () => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();

    setPatternModal({ isOpen: true, isLoading: true, patterns: [] });

    try {
      const result = await suggestPatterns(sentence.en, sentence.zh);
      if (result.success && result.patterns) {
        setPatternModal({
          isOpen: true,
          isLoading: false,
          patterns: result.patterns,
        });
      } else {
        setPatternModal({
          isOpen: true,
          isLoading: false,
          patterns: [],
          error: result.error || 'Failed to get pattern suggestions',
        });
      }
    } catch (error) {
      setPatternModal({
        isOpen: true,
        isLoading: false,
        patterns: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [sentence.en, sentence.zh]);

  // Handle adding patterns from modal
  const handleAddPatterns = useCallback((patterns: PatternSuggestion[]) => {
    if (onAddPattern) {
      patterns.forEach(p => {
        onAddPattern(p.text, p.template, p.explanation);
      });
    }
  }, [onAddPattern]);

  // Close selection popover
  const handleCloseSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  // Handler for magic analyze button
  const handleMagicAnalyze = useCallback(async () => {
    // If already in interactive mode, toggle it off
    if (isInteractiveMode) {
      setIsInteractiveMode(false);
      setSelectedUnit(null);
      setHoveredPatternId(null);
      return;
    }

    // If already analyzed, just toggle interactive mode on
    if (analysisState.status === 'completed' && analysisState.data) {
      setIsInteractiveMode(true);
      return;
    }

    // Check if sentence has persisted analysis
    if (sentence.analysis) {
      setAnalysisState({ status: 'completed', data: sentence.analysis });
      setIsInteractiveMode(true);
      return;
    }

    setAnalysisState({ status: 'loading' });

    const result = await analyzeSentence(sentence.en, sentence.zh);

    if (result.success && result.data) {
      const analysis: SentenceAnalysis = {
        tokens: result.data.tokens,
        chunks: result.data.chunks,
        patterns: result.data.patterns,
      };
      setAnalysisState({ status: 'completed', data: analysis });
      setIsInteractiveMode(true);
      // Persist to sentence
      if (onUpdateSentence) {
        onUpdateSentence(sentence.id, { analysis });
      }
    } else {
      setAnalysisState({
        status: 'error',
        error: result.error || 'Analysis failed'
      });
    }
  }, [sentence, onUpdateSentence, isInteractiveMode, analysisState]);

  // Handler for semantic unit clicks
  const handleUnitClick = useCallback((unit: SemanticUnit) => {
    setSelectedUnit(unit);
  }, []);

  // Handler for pattern chip clicks
  const handlePatternClick = useCallback((pattern: SentenceAnalysis['patterns'][0]) => {
    setSelectedUnit({
      text: pattern.matchedText || pattern.template,
      type: 'pattern',
      startIndex: 0,
      endIndex: pattern.matchedText?.length || pattern.template.length,
      patternId: pattern.id,
    });
  }, []);

  // Handler for adding from inline action bar
  const handleAddFromPopover = useCallback((text: string, type: VocabularyType) => {
    if (onAddVocabulary) {
      onAddVocabulary(text, type);
    }
    setSelectedUnit(null);
  }, [onAddVocabulary]);

  // Determine which text is the "reference" (the answer) based on practice mode
  const isEnToZh = practiceMode === 'EN_TO_ZH';
  const sourceText = isEnToZh ? sentence.en : sentence.zh;
  const referenceText = isEnToZh ? sentence.zh : sentence.en;
  const sourceLabel = isEnToZh ? 'EN' : 'ZH';
  const referenceLabel = isEnToZh ? 'ZH' : 'EN';
  const sourceField = isEnToZh ? 'en' : 'zh';
  const referenceField = isEnToZh ? 'zh' : 'en';

  // Handle saving edited text
  const handleSaveEdit = (newValue: string) => {
    if (editingField && onUpdateSentence) {
      onUpdateSentence(sentence.id, { [editingField]: newValue });
    }
    setEditingField(null);
  };

  // Get context counts for navigation buttons
  const paragraphSentences = sentence.paragraphId
    ? allSentences.filter(s => s.paragraphId === sentence.paragraphId)
    : [];
  const articleSentences = sentence.articleId
    ? allSentences.filter(s => s.articleId === sentence.articleId)
    : [];

  const hasParagraphContext = paragraphSentences.length > 1;
  const hasArticleContext = articleSentences.length > 1;
  const showContextNav = sentence.sourceType !== 'sentence' && (hasParagraphContext || hasArticleContext);

  // Get translation status
  const translation = practiceMode === 'EN_TO_ZH' ? sentence.userTranslationZh : sentence.userTranslationEn;
  const hasPracticed = translation && translation.type !== 'draft';

  return (
    <div className="flex-1 flex flex-col p-8 overflow-hidden">
      {/* Main Content - Centered */}
      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
        {/* Sentence Content Card */}
        <div className="glass-panel rounded-2xl p-8">
          {/* Header Row: Mode Toggle + Tags */}
          <div className="flex items-center justify-between mb-6">
            {/* Left: Mode Toggle + Practiced Badge */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={onModeToggle}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:opacity-80"
                style={{
                  backgroundColor: 'var(--surface-hover)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--glass-border)'
                }}
              >
                {practiceMode === 'EN_TO_ZH' ? 'EN → 中' : '中 → EN'}
              </button>
              {hasPracticed && (
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                  Practiced
                </span>
              )}
            </div>

            {/* Right: Tags */}
            <div className="flex flex-wrap items-center justify-end gap-2 ml-4 min-w-0">
              {sentence.tags && sentence.tags.length > 0 ? (
                sentence.tags.map((tagId) => {
                  const tagInfo = allTags.find(t => t.id === tagId);
                  return (
                    <TagChip
                      key={tagId}
                      tag={tagInfo || tagId}
                      size="sm"
                      showLabel
                      onRemove={onToggleTag ? () => onToggleTag(tagId) : undefined}
                    />
                  );
                })
              ) : (
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  No tags
                </span>
              )}
              {onOpenTagPicker && (
                <button
                  onClick={onOpenTagPicker}
                  className="px-2 py-1 text-xs rounded-lg border border-dashed border-[var(--glass-border)] hover:bg-[var(--surface-hover)] transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Add or manage tags"
                >
                  + Tag
                </button>
              )}
            </div>
          </div>

          {/* Source Text */}
          <div className="mb-6 group/source" onMouseUp={handleMouseUp}>
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  {sourceLabel}
                </span>
                <button
                  onClick={() => playTextToSpeech(sourceText)}
                  className="p-1 hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Read Aloud"
                >
                  <SpeakerIcon />
                </button>

                {/* Analysis status indicator */}
                {analysisState.status === 'loading' && (
                  <span className="text-xs" style={{ color: 'var(--accent-blue, #60A5FA)' }}>
                    Analyzing...
                  </span>
                )}
                {analysisState.status === 'error' && (
                  <span className="text-xs text-red-400" title={analysisState.error}>
                    Analysis failed
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Edit button - right side */}
                {onUpdateSentence && (
                  <button
                    onClick={() => {
                      setSelection(null);
                      setEditingField(sourceField as 'en' | 'zh');
                    }}
                    className="p-1 hover:opacity-80 transition-opacity hover:bg-[var(--surface-hover)] rounded-lg cursor-pointer"
                    style={{ color: 'var(--text-secondary)' }}
                    title={`Edit ${sourceLabel} text`}
                  >
                    <PencilIcon />
                  </button>
                )}

                {/* Magic Analyze Button - right side, only for English in EN_TO_ZH mode */}
                {isEnToZh && onUpdateSentence && (
                  <button
                    onClick={handleMagicAnalyze}
                    disabled={analysisState.status === 'loading'}
                    className="p-1 rounded-lg transition-all hover:scale-110 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
                    style={{
                      color: isInteractiveMode
                        ? 'var(--accent-yellow, #FBBF24)'
                        : analysisState.status === 'completed'
                          ? 'var(--accent-yellow, #FBBF24)'
                          : 'var(--text-secondary)',
                    }}
                    title={
                      isInteractiveMode ? 'Exit interactive mode' :
                      analysisState.status === 'completed' ? 'Enter interactive mode - click words to add vocabulary' :
                      analysisState.status === 'loading' ? 'Analyzing...' :
                      'AI Analyze - Click to find vocabulary'
                    }
                  >
                    <MagicWandIcon />
                  </button>
                )}
              </div>
            </div>

            {/* Interactive or static text rendering */}
            {isInteractiveMode && analysisState.data && isEnToZh ? (
              <InteractiveSentenceRenderer
                sentence={sourceText}
                analysis={analysisState.data}
                onUnitClick={handleUnitClick}
                hoveredPatternId={hoveredPatternId}
              />
            ) : (
              <p
                className="text-xl leading-relaxed font-serif-sc select-text cursor-text"
                style={{ color: 'var(--text-main)' }}
              >
                {sourceText}
              </p>
            )}

            {/* Pattern Chips - Display below source text when in interactive mode */}
            {isInteractiveMode && analysisState.data?.patterns && isEnToZh && (
              <PatternChips
                patterns={analysisState.data.patterns}
                hoveredPatternId={hoveredPatternId}
                onPatternHover={setHoveredPatternId}
                onPatternClick={handlePatternClick}
              />
            )}

            {/* Inline Action Bar - Replaces floating popover */}
            {selectedUnit && (
              <SemanticUnitPopover
                unit={selectedUnit}
                onAddToVocabulary={handleAddFromPopover}
                onClose={() => setSelectedUnit(null)}
              />
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-[var(--glass-border)] my-6" />

          {/* Reference Text */}
          <div className="mb-8 group/reference">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-mono uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                {referenceLabel}
              </span>
              {(!hideReferenceInDetailView || isReferenceRevealed) && (
                <button
                  onClick={() => playTextToSpeech(referenceText)}
                  className="p-1 hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Read Aloud"
                >
                  <SpeakerIcon />
                </button>
              )}
            </div>
            {hideReferenceInDetailView && !isReferenceRevealed ? (
              <button
                onClick={() => setIsReferenceRevealed(true)}
                className="w-full py-4 rounded-lg border border-dashed border-[var(--glass-border)] hover:bg-[var(--surface-hover)] transition-colors text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                Tap to reveal reference
              </button>
            ) : (
              <div className="relative">
                <p className="text-xl leading-relaxed font-serif-sc pr-16" style={{ color: 'var(--text-main)' }}>
                  {referenceText}
                </p>
                {onUpdateSentence && (
                  <button
                    onClick={() => {
                      setSelection(null);
                      setEditingField(referenceField as 'en' | 'zh');
                    }}
                    className="absolute top-0 right-0 p-2 rounded-lg opacity-0 group-hover/reference:opacity-100 transition-opacity hover:bg-[var(--surface-hover)] cursor-pointer"
                    style={{ color: 'var(--text-secondary)' }}
                    title={`Edit ${referenceLabel} text`}
                  >
                    <PencilIcon />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Start Practice Button - Inside the card */}
          <button
            onClick={onStartPractice}
            className="w-full py-4 rounded-xl text-base font-medium transition-all duration-200 hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: 'var(--text-main)',
              color: 'var(--bg-main)',
            }}
          >
            Start Practice
          </button>
        </div>

        {/* Context Navigation - Compact inline links */}
        {showContextNav && (
          <div className="flex items-center justify-center gap-4 mt-6">
            {hasParagraphContext && (
              <button
                onClick={onShowParagraphContext}
                className="text-sm hover:underline transition-colors cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                View Paragraph ({paragraphSentences.length})
              </button>
            )}
            {hasParagraphContext && hasArticleContext && (
              <span style={{ color: 'var(--text-secondary)' }}>·</span>
            )}
            {hasArticleContext && (
              <button
                onClick={onShowArticleContext}
                className="text-sm hover:underline transition-colors cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                View Article ({articleSentences.length})
              </button>
            )}
          </div>
        )}

        {/* NOTE: Stats section removed - now in dedicated StatsCard */}
      </div>

      {/* Edit Modal */}
      {editingField && (
        <TextEditModal
          title={`Edit ${editingField === 'en' ? 'English' : 'Chinese'} Text`}
          label={editingField === 'en' ? 'English' : '中文'}
          initialValue={editingField === 'en' ? sentence.en : sentence.zh}
          onSave={handleSaveEdit}
          onCancel={() => setEditingField(null)}
        />
      )}

      {/* Text Selection Popover */}
      {selection && onAddVocabulary && (
        <TextSelectionPopover
          selectedText={selection.text}
          position={selection.position}
          onAddWord={handleAddWord}
          onAddCollocation={handleAddCollocation}
          onSuggestPatterns={handleSuggestPatterns}
          onClose={handleCloseSelection}
        />
      )}

      {/* Pattern Suggestion Modal */}
      {patternModal.isOpen && (
        <PatternSuggestionModal
          patterns={patternModal.patterns}
          isLoading={patternModal.isLoading}
          error={patternModal.error}
          onAddPatterns={handleAddPatterns}
          onClose={() => setPatternModal({ isOpen: false, isLoading: false, patterns: [] })}
        />
      )}

    </div>
  );
};
