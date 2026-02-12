import React, { useState, useRef, useCallback, useEffect } from 'react';
import { SentencePair, PracticeMode, UserTranslation, AppSettings } from '../../types';
import { SwipeCard } from '../../components/mobile/SwipeCard';
import { PracticeToolbar } from '../../components/mobile/PracticeToolbar';
import { TranslationInput } from '../../components/mobile/TranslationInput';
import { usePracticeTimer } from '../../hooks/usePracticeTimer';
import { FeedbackSheet, FeedbackData } from '../../components/common/FeedbackSheet';
import { getTranslationFeedback } from '../../services/llmService';
import { WordDefinitionTooltip } from '../../components/practice-area/WordDefinitionTooltip';
import { useWordDefinition } from '../../hooks/useWordDefinition';

interface MobilePracticeProps {
  sentence: SentencePair;
  mode: PracticeMode;
  currentIndex: number;
  totalCount: number;
  onNext: () => void;
  onPrev: () => void;
  onSubmit: (sentenceId: string, translation: UserTranslation, durationMs?: number) => Promise<void>;
  appSettings: AppSettings;
}

/**
 * MobilePractice - Main practice view with swipe cards
 *
 * Features:
 * - Swipe left/right to navigate sentences
 * - Tap card to flip and reveal answer
 * - Bottom toolbar with actions
 * - Auto-save drafts
 * - Practice timer for tracking duration
 */
export const MobilePractice: React.FC<MobilePracticeProps> = ({
  sentence,
  mode,
  currentIndex,
  totalCount,
  onNext,
  onPrev,
  onSubmit,
  appSettings,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Feedback sheet state
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | undefined>();
  const [feedbackError, setFeedbackError] = useState<string | undefined>();
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentenceIdRef = useRef<string | null>(null); // Start as null to trigger on first mount

  // Word definition lookup
  const { selectedWord, isLoading: wordDefLoading, definition: wordDefData, error: wordDefError, lookupWord, dismiss: dismissWordDef } = useWordDefinition();

  // Practice timer - starts when sentence is displayed
  const { formatTime, stop: stopTimer, restart: restartTimer } = usePracticeTimer(false);

  // Get the correct text based on practice mode
  const originalText = mode === 'EN_TO_ZH' ? sentence.en : sentence.zh;
  const referenceText = mode === 'EN_TO_ZH' ? sentence.zh : sentence.en;
  const existingTranslation = mode === 'EN_TO_ZH'
    ? sentence.userTranslationZh
    : sentence.userTranslationEn;

  // Initialize input and restart timer on mount AND when sentence ID changes
  useEffect(() => {
    // Reset state on first mount or when switching to a different sentence
    if (lastSentenceIdRef.current === null || sentence.id !== lastSentenceIdRef.current) {
      setIsFlipped(false);
      restartTimer();
      dismissWordDef();
      setUserInput(existingTranslation?.text || '');
      lastSentenceIdRef.current = sentence.id;
    }
  }, [sentence.id, existingTranslation?.text, restartTimer]);

  // Auto-save draft (without stopping timer)
  const handleInputChange = useCallback((text: string) => {
    setUserInput(text);

    if (!appSettings.autoSave.enabled) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (text.trim()) {
        const draft: UserTranslation = {
          type: 'draft',
          text: text.trim(),
          timestamp: Date.now(),
        };

        // Auto-save as draft - no duration tracking for drafts
        await onSubmit(sentence.id, draft);
      }
    }, appSettings.autoSave.delay);
  }, [sentence.id, appSettings, onSubmit]);

  // Submit translation with timing
  const handleSubmit = async () => {
    if (!userInput.trim() || isSubmitting) return;

    setIsSubmitting(true);

    // Stop timer and capture duration
    const duration = stopTimer();

    const translation: UserTranslation = {
      type: 'submitted',
      text: userInput.trim(),
      timestamp: Date.now(),
    };

    // Submit with duration for stats tracking
    await onSubmit(sentence.id, translation, duration);
    setIsFlipped(true); // Show answer after submit

    setIsSubmitting(false);
  };

  // Handle word click for definition lookup
  const handleWordClick = useCallback((word: string, rect: DOMRect) => {
    const lang = mode === 'EN_TO_ZH' ? 'en' : 'zh';
    lookupWord(word, originalText, lang, rect);
  }, [mode, originalText, lookupWord]);

  // Handle swipe gestures
  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      onNext();
    } else {
      onPrev();
    }
  };

  // Reset current practice
  const handleReset = () => {
    setUserInput('');
    setIsFlipped(false);
    restartTimer(); // Restart timer on reset
  };

  // Get LLM feedback on the translation
  const handleGetFeedback = async () => {
    if (!userInput.trim()) return;

    // Open sheet and show loading
    setIsFeedbackOpen(true);
    setFeedbackLoading(true);
    setFeedbackData(undefined);
    setFeedbackError(undefined);

    const result = await getTranslationFeedback(
      originalText,
      referenceText,
      userInput
    );

    setFeedbackLoading(false);

    if (result.success && result.data) {
      setFeedbackData(result.data);
    } else {
      setFeedbackError(result.error || 'Failed to get feedback');
    }
  };

  const handleCloseFeedback = () => {
    setIsFeedbackOpen(false);
    // Clear data after close animation
    setTimeout(() => {
      setFeedbackData(undefined);
      setFeedbackError(undefined);
    }, 300);
  };

  return (
    <div className="flex flex-col h-full px-4 pt-4 pb-24">
      {/* Timer Display - above swipe card */}
      {!isFlipped && (
        <div className="flex-shrink-0 flex justify-center mb-2">
          <span
            className="text-sm font-mono px-3 py-1 rounded-lg"
            style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)' }}
          >
            {formatTime()}
          </span>
        </div>
      )}

      {/* Swipe Card Area - constrained height to prevent overlap */}
      <div className="flex-shrink-0 flex flex-col items-center justify-center" style={{ height: '45vh', maxHeight: '380px' }}>
        <SwipeCard
          frontText={originalText}
          backText={referenceText}
          isFlipped={isFlipped}
          onFlip={() => setIsFlipped(!isFlipped)}
          onSwipe={handleSwipe}
          canSwipeLeft={currentIndex < totalCount - 1}
          canSwipeRight={currentIndex > 0}
          lang={mode === 'EN_TO_ZH' ? 'en' : 'zh'}
          onWordClick={handleWordClick}
        />
      </div>

      {/* Translation Input - fixed section */}
      <div className="flex-shrink-0 mt-3">
        <TranslationInput
          value={userInput}
          onChange={handleInputChange}
          placeholder={mode === 'EN_TO_ZH' ? '输入中文翻译...' : 'Enter English translation...'}
          disabled={isFlipped && existingTranslation?.type !== 'draft'}
        />
      </div>

      {/* Bottom Toolbar - fixed section */}
      <div className="flex-shrink-0 mt-3">
        <PracticeToolbar
          onSubmit={handleSubmit}
          onReset={handleReset}
          onFeedback={handleGetFeedback}
          isSubmitDisabled={!userInput.trim() || isSubmitting}
          isSubmitted={isFlipped}
        />
      </div>

      {/* Word Definition Tooltip */}
      {selectedWord && (
        <WordDefinitionTooltip
          word={selectedWord.word}
          anchorRect={selectedWord.rect}
          isLoading={wordDefLoading}
          data={wordDefData || undefined}
          error={wordDefError || undefined}
          onClose={dismissWordDef}
        />
      )}

      {/* Feedback Sheet */}
      <FeedbackSheet
        isOpen={isFeedbackOpen}
        onClose={handleCloseFeedback}
        isLoading={feedbackLoading}
        data={feedbackData}
        error={feedbackError}
        onRetry={handleGetFeedback}
      />
    </div>
  );
};
