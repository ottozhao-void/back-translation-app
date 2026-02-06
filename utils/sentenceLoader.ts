import { SentencePair, SentenceStore, SentenceFilterType, Article } from '../types';
import { splitParagraphToSentences } from './sentenceSplitter';

/**
 * Fetches all sentences from the server
 */
export const fetchSentences = async (): Promise<SentencePair[]> => {
  try {
    const response = await fetch('/api/sentences');
    if (!response.ok) {
      console.error('Failed to fetch sentences:', response.statusText);
      return [];
    }
    const store: SentenceStore = await response.json();
    return store.sentences || [];
  } catch (error) {
    console.error('Failed to fetch sentences:', error);
    return [];
  }
};

/**
 * Fetches the full sentence store (including metadata)
 */
export const fetchSentenceStore = async (): Promise<SentenceStore> => {
  try {
    const response = await fetch('/api/sentences');
    if (!response.ok) {
      console.error('Failed to fetch sentence store:', response.statusText);
      return { version: 1, sentences: [], lastModified: Date.now() };
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch sentence store:', error);
    return { version: 1, sentences: [], lastModified: Date.now() };
  }
};

/**
 * Saves sentences to the server
 */
export const saveSentences = async (sentences: SentencePair[]): Promise<boolean> => {
  try {
    const store: SentenceStore = {
      version: 1,
      sentences,
      lastModified: Date.now(),
    };
    const response = await fetch('/api/sentences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(store),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to save sentences:', error);
    return false;
  }
};

/**
 * Imports sentences from an article
 */
export const importFromArticle = async (article: Article): Promise<SentencePair[]> => {
  const newSentences: SentencePair[] = [];

  for (const paragraph of article.content) {
    const enText = paragraph.en[0] || '';
    const zhText = paragraph.zh[0] || '';

    if (!enText.trim() && !zhText.trim()) continue;

    const pairs = splitParagraphToSentences(
      enText,
      zhText,
      article.id,
      paragraph.id
    );
    newSentences.push(...pairs);
  }

  return newSentences;
};

/**
 * Adds a single manually-entered sentence
 */
export const createManualSentence = (en: string, zh: string): SentencePair => {
  const timestamp = Date.now();
  const suffix = Math.random().toString(36).substring(2, 6);
  return {
    id: `manual_${timestamp}_${suffix}`,
    en: en.trim(),
    zh: zh.trim(),
    sourceType: 'manual',
    createdAt: timestamp,
  };
};

/**
 * Adds a sentence to the store and saves
 */
export const addSentence = async (en: string, zh: string): Promise<SentencePair | null> => {
  try {
    const sentences = await fetchSentences();
    const newSentence = createManualSentence(en, zh);
    sentences.push(newSentence);
    const success = await saveSentences(sentences);
    return success ? newSentence : null;
  } catch (error) {
    console.error('Failed to add sentence:', error);
    return null;
  }
};

/**
 * Deletes a sentence by ID
 */
export const deleteSentence = async (id: string): Promise<boolean> => {
  try {
    const sentences = await fetchSentences();
    const filtered = sentences.filter(s => s.id !== id);
    if (filtered.length === sentences.length) {
      console.warn('Sentence not found:', id);
      return false;
    }
    return await saveSentences(filtered);
  } catch (error) {
    console.error('Failed to delete sentence:', error);
    return false;
  }
};

/**
 * Updates a sentence in the store
 */
export const updateSentence = async (
  id: string,
  updates: Partial<SentencePair>
): Promise<boolean> => {
  try {
    const sentences = await fetchSentences();
    const index = sentences.findIndex(s => s.id === id);
    if (index === -1) {
      console.warn('Sentence not found:', id);
      return false;
    }
    sentences[index] = { ...sentences[index], ...updates };
    return await saveSentences(sentences);
  } catch (error) {
    console.error('Failed to update sentence:', error);
    return false;
  }
};

/**
 * Filters sentences based on filter type
 */
export const filterSentences = (
  sentences: SentencePair[],
  filter: SentenceFilterType
): SentencePair[] => {
  switch (filter.type) {
    case 'article':
      return sentences.filter(s => s.sourceType === filter.articleId);

    case 'time':
      const sorted = [...sentences].sort((a, b) =>
        filter.order === 'asc'
          ? a.createdAt - b.createdAt
          : b.createdAt - a.createdAt
      );
      return sorted;

    case 'random':
      const shuffled = [...sentences].sort(() => Math.random() - 0.5);
      return filter.count ? shuffled.slice(0, filter.count) : shuffled;

    case 'tag':
      return sentences.filter(s => s.tags?.includes(filter.tag));

    default:
      return sentences;
  }
};

/**
 * Groups sentences by their sourceType
 */
export const groupBySource = (
  sentences: SentencePair[]
): Map<string, SentencePair[]> => {
  const groups = new Map<string, SentencePair[]>();

  for (const sentence of sentences) {
    const key = sentence.sourceType;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(sentence);
  }

  return groups;
};

// === Batch Import Types and Functions ===

export type ImportMode = 'batch' | 'paragraph' | 'article';

export interface ImportResult {
  success: boolean;
  count: number;
  error?: string;
}

/**
 * Creates sentence pairs from batch import (line-by-line)
 * Each line in enLines corresponds to the same index in zhLines
 */
export const createBatchSentences = (
  enLines: string[],
  zhLines: string[]
): SentencePair[] => {
  const timestamp = Date.now();
  const maxLen = Math.max(enLines.length, zhLines.length);
  const pairs: SentencePair[] = [];

  for (let i = 0; i < maxLen; i++) {
    pairs.push({
      id: `batch_${timestamp}_${i}`,
      en: enLines[i]?.trim() || '',
      zh: zhLines[i]?.trim() || '',
      sourceType: 'batch',
      sourceIndex: i,
      createdAt: timestamp,
    });
  }

  return pairs;
};

/**
 * Creates sentence pairs from paragraph import (auto-split)
 */
export const createParagraphSentences = (
  enSentences: string[],
  zhSentences: string[]
): SentencePair[] => {
  const timestamp = Date.now();
  const sourceType = `paragraph_${timestamp}`;
  const maxLen = Math.max(enSentences.length, zhSentences.length);
  const pairs: SentencePair[] = [];

  for (let i = 0; i < maxLen; i++) {
    pairs.push({
      id: `${sourceType}_s${i}`,
      en: enSentences[i]?.trim() || '',
      zh: zhSentences[i]?.trim() || '',
      sourceType,
      sourceIndex: i,
      createdAt: timestamp,
    });
  }

  return pairs;
};

/**
 * Creates sentence pairs from article import (auto-split with article context)
 */
export const createArticleSentences = (
  enSentences: string[],
  zhSentences: string[]
): SentencePair[] => {
  const timestamp = Date.now();
  const sourceType = `article_${timestamp}`;
  const maxLen = Math.max(enSentences.length, zhSentences.length);
  const pairs: SentencePair[] = [];

  for (let i = 0; i < maxLen; i++) {
    pairs.push({
      id: `${sourceType}_s${i}`,
      en: enSentences[i]?.trim() || '',
      zh: zhSentences[i]?.trim() || '',
      sourceType,
      sourceIndex: i,
      createdAt: timestamp,
    });
  }

  return pairs;
};

/**
 * Adds multiple sentences to the store at once (batch operation)
 */
export const addSentencesBatch = async (
  newSentences: SentencePair[]
): Promise<ImportResult> => {
  try {
    const sentences = await fetchSentences();
    const merged = [...sentences, ...newSentences];
    const success = await saveSentences(merged);
    return {
      success,
      count: newSentences.length,
      error: success ? undefined : 'Failed to save sentences',
    };
  } catch (error) {
    console.error('Failed to add sentences batch:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
