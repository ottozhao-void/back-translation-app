import { SentencePair } from '../types';
import { splitIntoSentences } from './textUtils';

/**
 * Splits a paragraph into sentence pairs
 * Uses the existing splitIntoSentences function from textUtils
 */
export const splitParagraphToSentences = (
  enText: string,
  zhText: string,
  articleId: string,
  paragraphId: string
): SentencePair[] => {
  const enSentences = splitIntoSentences(enText);
  const zhSentences = splitIntoSentences(zhText);

  const maxLen = Math.max(enSentences.length, zhSentences.length);
  const pairs: SentencePair[] = [];

  for (let i = 0; i < maxLen; i++) {
    pairs.push({
      id: `${articleId}_${paragraphId}_s${i}`,
      en: enSentences[i] || '',
      zh: zhSentences[i] || '',
      sourceType: articleId,
      sourceIndex: i,
      paragraphId,
      createdAt: Date.now(),
    });
  }

  return pairs;
};

/**
 * Splits multiple paragraphs from an article into sentence pairs
 */
export const splitArticleToSentences = (
  paragraphs: Array<{ id: string; en: string[]; zh: string[] }>,
  articleId: string
): SentencePair[] => {
  const allPairs: SentencePair[] = [];

  for (const paragraph of paragraphs) {
    const enText = paragraph.en[0] || '';
    const zhText = paragraph.zh[0] || '';

    if (!enText.trim() && !zhText.trim()) continue;

    const pairs = splitParagraphToSentences(enText, zhText, articleId, paragraph.id);
    allPairs.push(...pairs);
  }

  return allPairs;
};
