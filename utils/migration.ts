import { Article, SentencePair } from '../types';
import { splitParagraphToSentences } from './sentenceSplitter';

/**
 * Migrates existing articles to sentence pairs.
 * Preserves user translation progress by copying it to the first sentence of each paragraph.
 */
export const migrateArticlesToSentences = (articles: Article[]): SentencePair[] => {
  const allSentences: SentencePair[] = [];

  for (const article of articles) {
    for (const paragraph of article.content) {
      const enText = paragraph.en[0] || '';
      const zhText = paragraph.zh[0] || '';

      if (!enText.trim() && !zhText.trim()) continue;

      const sentences = splitParagraphToSentences(
        enText,
        zhText,
        article.id,
        paragraph.id
      );

      // Migrate user translation progress to the first sentence
      if (sentences.length > 0) {
        if (paragraph.userTranslationZh) {
          sentences[0].userTranslationZh = paragraph.userTranslationZh;
        }
        if (paragraph.userTranslationEn) {
          sentences[0].userTranslationEn = paragraph.userTranslationEn;
        }
        if (paragraph.lastPracticed) {
          sentences[0].lastPracticed = paragraph.lastPracticed;
        }
      }

      allSentences.push(...sentences);
    }
  }

  return allSentences;
};

/**
 * Checks if migration is needed (sentences empty, articles exist)
 */
export const shouldMigrate = (
  sentenceCount: number,
  articleCount: number
): boolean => {
  return sentenceCount === 0 && articleCount > 0;
};
