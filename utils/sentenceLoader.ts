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
