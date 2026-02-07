import { SentencePair } from '../types';
import { splitIntoSentences } from './textUtils';

// ID generation helper
const generateId = (prefix: string = 'sent'): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${timestamp}_${random}`;
};

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
      id: generateId('sent'),
      en: enSentences[i] || '',
      zh: zhSentences[i] || '',
      sourceType: 'article',
      articleId,
      paragraphId,
      order: i,
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
