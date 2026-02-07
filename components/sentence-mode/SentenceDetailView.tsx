import React, { useState, useEffect } from 'react';
import { SentencePair, PracticeMode } from '../../types';
import { CardCarousel, CardConfig, SentenceInfoCard, StatsCard, VocabularyCard } from './cards';

interface SentenceDetailViewProps {
  sentence: SentencePair;
  practiceMode: PracticeMode;
  allSentences: SentencePair[];
  onStartPractice: () => void;
  onShowParagraphContext: () => void;
  onShowArticleContext: () => void;
  onModeToggle: () => void;
  onUpdateSentence?: (id: string, updates: Partial<SentencePair>) => void;
  hideReferenceInDetailView?: boolean;
}

/**
 * SentenceDetailView - 句子详情视图
 *
 * 使用 CardCarousel 展示多个卡片：
 * 1. 句子详情卡片 (SentenceInfoCard)
 * 2. 统计卡片 (StatsCard)
 * 3. 单词卡片 (VocabularyCard) - 占位
 *
 * 支持通过滚轮、左右方向键切换卡片。
 */
export const SentenceDetailView: React.FC<SentenceDetailViewProps> = ({
  sentence,
  practiceMode,
  allSentences,
  onStartPractice,
  onShowParagraphContext,
  onShowArticleContext,
  onModeToggle,
  onUpdateSentence,
  hideReferenceInDetailView = true,
}) => {
  // Current card index for carousel
  const [cardIndex, setCardIndex] = useState(0);

  // Reset to first card when sentence changes
  useEffect(() => {
    setCardIndex(0);
  }, [sentence.id]);

  // Define cards for the carousel
  const cards: CardConfig[] = [
    {
      id: 'info',
      label: 'Sentence',
      component: (
        <SentenceInfoCard
          sentence={sentence}
          practiceMode={practiceMode}
          allSentences={allSentences}
          onStartPractice={onStartPractice}
          onShowParagraphContext={onShowParagraphContext}
          onShowArticleContext={onShowArticleContext}
          onModeToggle={onModeToggle}
          onUpdateSentence={onUpdateSentence}
          hideReferenceInDetailView={hideReferenceInDetailView}
        />
      ),
    },
    {
      id: 'stats',
      label: 'Statistics',
      component: <StatsCard stats={sentence.practiceStats} />,
    },
    {
      id: 'vocabulary',
      label: 'Vocabulary',
      component: <VocabularyCard sentenceId={sentence.id} />,
    },
  ];

  return (
    <CardCarousel
      cards={cards}
      activeIndex={cardIndex}
      onIndexChange={setCardIndex}
      className="flex-1"
    />
  );
};
