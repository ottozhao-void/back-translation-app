import { VocabularyType } from '../../types';

/**
 * Type badge colors for vocabulary items
 * Following the design system color palette
 */
export const VOCABULARY_TYPE_COLORS: Record<VocabularyType, { bg: string; text: string }> = {
  word: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA' },
  collocation: { bg: 'rgba(139, 92, 246, 0.15)', text: '#A78BFA' },
  pattern: { bg: 'rgba(245, 158, 11, 0.15)', text: '#FBBF24' },
};

/**
 * Get display label for vocabulary type
 */
export const getTypeLabel = (type: VocabularyType): string => {
  switch (type) {
    case 'word': return 'Word';
    case 'collocation': return 'Phrase';
    case 'pattern': return 'Pattern';
  }
};
