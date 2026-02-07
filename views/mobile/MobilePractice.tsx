import React, { useState, useRef, useCallback } from 'react';
import { SentencePair, PracticeMode, UserTranslation, AppSettings } from '../../types';
import { patchSentence } from '../../utils/sentenceLoader';
import { SwipeCard } from '../../components/mobile/SwipeCard';
import { PracticeToolbar } from '../../components/mobile/PracticeToolbar';
import { TranslationInput } from '../../components/mobile/TranslationInput';

interface MobilePracticeProps {
  sentence: SentencePair;
  mode: PracticeMode;
  currentIndex: number;
  totalCount: number;
  onNext: () => void;
  onPrev: () => void;
  onUpdate: (sentence: SentencePair) => void;
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
 */
export const MobilePractice: React.FC<MobilePracticeProps> = ({
  sentence,
  mode,
  currentIndex,
  totalCount,
  onNext,
  onPrev,
  onUpdate,
  appSettings,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get the correct text based on practice mode
  const originalText = mode === 'EN_TO_ZH' ? sentence.en : sentence.zh;
  const referenceText = mode === 'EN_TO_ZH' ? sentence.zh : sentence.en;
  const existingTranslation = mode === 'EN_TO_ZH'
    ? sentence.userTranslationZh
    : sentence.userTranslationEn;

  // Initialize input with existing translation (draft or submitted)
  React.useEffect(() => {
    if (existingTranslation?.text) {
      setUserInput(existingTranslation.text);
    } else {
      setUserInput('');
    }
    setIsFlipped(false);
  }, [sentence.id, existingTranslation]);

  // Auto-save draft
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

        const updates = mode === 'EN_TO_ZH'
          ? { userTranslationZh: draft }
          : { userTranslationEn: draft };

        const response = await patchSentence(sentence.id, updates);
        if (response.success && response.data) {
          onUpdate(response.data);
        }
      }
    }, appSettings.autoSave.delay);
  }, [sentence.id, mode, appSettings, onUpdate]);

  // Submit translation
  const handleSubmit = async () => {
    if (!userInput.trim() || isSubmitting) return;

    setIsSubmitting(true);

    const translation: UserTranslation = {
      type: 'diff', // Using diff mode for mobile (simplified)
      text: userInput.trim(),
      timestamp: Date.now(),
    };

    const updates = mode === 'EN_TO_ZH'
      ? { userTranslationZh: translation, lastPracticed: Date.now() }
      : { userTranslationEn: translation, lastPracticed: Date.now() };

    const response = await patchSentence(sentence.id, updates);
    if (response.success && response.data) {
      onUpdate(response.data);
      setIsFlipped(true); // Show answer after submit
    }

    setIsSubmitting(false);
  };

  // Handle swipe gestures
  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      onNext();
    } else {
      onPrev();
    }
  };

  // Skip to next sentence
  const handleSkip = () => {
    onNext();
  };

  // Reset current practice
  const handleReset = () => {
    setUserInput('');
    setIsFlipped(false);
  };

  return (
    <div className="flex flex-col h-full px-4 pt-4 pb-24">
      {/* Swipe Card Area - constrained height to prevent overlap */}
      <div className="flex-shrink-0 flex flex-col items-center justify-center" style={{ height: '50vh', maxHeight: '400px' }}>
        <SwipeCard
          frontText={originalText}
          backText={referenceText}
          isFlipped={isFlipped}
          onFlip={() => setIsFlipped(!isFlipped)}
          onSwipe={handleSwipe}
          canSwipeLeft={currentIndex < totalCount - 1}
          canSwipeRight={currentIndex > 0}
          lang={mode === 'EN_TO_ZH' ? 'en' : 'zh'}
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
          onSkip={handleSkip}
          onReset={handleReset}
          isSubmitDisabled={!userInput.trim() || isSubmitting}
        />
      </div>
    </div>
  );
};
