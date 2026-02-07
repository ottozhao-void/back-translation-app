import { SentencePair, SentenceStore, SentenceFilterType, Article, SourceType } from '../types';
import { splitParagraphToSentences } from './sentenceSplitter';

// === Mobile-Optimized API Types ===

/**
 * Summary version of sentence for list views (mobile-optimized)
 */
export interface SentenceSummary {
  id: string;
  en: string;  // Truncated to 50 chars
  zh: string;  // Truncated to 50 chars
  sourceType: string;
  articleId?: string;
  paragraphId?: string;
  hasUserTranslation: boolean;
  lastPracticed?: number;
  createdAt: number;
}

/**
 * Response type for summary API
 */
export interface SentenceSummaryResponse {
  success: boolean;
  data: SentenceSummary[];
  total: number;
  error?: string;
}

/**
 * Response type for single sentence API
 */
export interface SentenceDetailResponse {
  success: boolean;
  data?: SentencePair;
  error?: string;
}

/**
 * Response type for patch API
 */
export interface SentencePatchResponse {
  success: boolean;
  data?: SentencePair;
  error?: string;
}

// === Mobile-Optimized API Functions ===

/**
 * Fetches sentence summaries (mobile-optimized, truncated content)
 * Use this for list views to reduce data transfer
 */
export const fetchSentenceSummary = async (): Promise<SentenceSummaryResponse> => {
  try {
    const response = await fetch('/api/sentences/summary');
    if (!response.ok) {
      console.error('Failed to fetch sentence summary:', response.statusText);
      return { success: false, data: [], total: 0, error: response.statusText };
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch sentence summary:', error);
    return {
      success: false,
      data: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Fetches a single sentence by ID (full details)
 * Use this when user selects a sentence for practice
 */
export const fetchSentenceById = async (id: string): Promise<SentenceDetailResponse> => {
  try {
    const response = await fetch(`/api/sentences/${encodeURIComponent(id)}`);
    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Sentence not found' };
      }
      return { success: false, error: response.statusText };
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch sentence:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Incrementally updates a single sentence (PATCH)
 * Use this for mobile to avoid sending/receiving full sentence list
 */
export const patchSentence = async (
  id: string,
  updates: Partial<SentencePair>
): Promise<SentencePatchResponse> => {
  try {
    const response = await fetch(`/api/sentences/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Sentence not found' };
      }
      return { success: false, error: response.statusText };
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to patch sentence:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// === ID Generation ===

/**
 * Generates a unique ID using timestamp + random suffix
 * Format: prefix_timestamp_random (e.g., "sent_1234567890_a1b2")
 */
const generateId = (prefix: string = 'sent'): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${timestamp}_${random}`;
};

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
 * Adds a single manually-entered sentence (sentence mode)
 */
export const createManualSentence = (en: string, zh: string): SentencePair => {
  const timestamp = Date.now();
  return {
    id: generateId('sent'),
    en: en.trim(),
    zh: zh.trim(),
    sourceType: 'sentence',
    order: -1,  // No order for standalone sentences
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
    case 'all':
      return sentences;

    case 'sourceType':
      return sentences.filter(s => s.sourceType === filter.sourceType);

    case 'article':
      return sentences.filter(s => s.articleId === filter.articleId);

    case 'paragraph':
      return sentences.filter(s => s.paragraphId === filter.paragraphId);

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

/**
 * Gets all sentences belonging to the same paragraph as the given sentence
 */
export const getParagraphContext = (
  sentence: SentencePair,
  allSentences: SentencePair[]
): SentencePair[] => {
  if (!sentence.paragraphId) return [sentence];

  return allSentences
    .filter(s => s.paragraphId === sentence.paragraphId)
    .sort((a, b) => a.order - b.order);
};

/**
 * Gets all sentences belonging to the same article as the given sentence
 */
export const getArticleContext = (
  sentence: SentencePair,
  allSentences: SentencePair[]
): SentencePair[] => {
  if (!sentence.articleId) return [sentence];

  return allSentences
    .filter(s => s.articleId === sentence.articleId)
    .sort((a, b) => a.order - b.order);
};

/**
 * Groups sentences by paragraph within an article
 */
export const groupByParagraph = (
  sentences: SentencePair[]
): Map<string, SentencePair[]> => {
  const groups = new Map<string, SentencePair[]>();

  for (const sentence of sentences) {
    const key = sentence.paragraphId || 'standalone';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(sentence);
  }

  // Sort sentences within each paragraph by order
  for (const [key, group] of groups) {
    groups.set(key, group.sort((a, b) => a.order - b.order));
  }

  return groups;
};

// === Data Migration ===

/**
 * Extracts paragraph order from paragraphId format like "article-1.md_p0" -> 0
 */
const extractParagraphOrder = (paragraphId: string | undefined): number | undefined => {
  if (!paragraphId) return undefined;
  const match = paragraphId.match(/_p(\d+)$/);
  return match ? parseInt(match[1], 10) : undefined;
};

/**
 * Migrates legacy sentence data to the new hierarchical format
 *
 * Legacy format (from old article migration):
 * - sourceType: "1766188879030_the_translator_s_guide_to_chinglish___forward.json" (article filename)
 * - paragraphId: "article-1.md_p0" (contains paragraph order as _pN suffix)
 * - sourceIndex: 0 (sentence order within paragraph)
 *
 * New format:
 * - sourceType: 'article' | 'paragraph' | 'sentence'
 * - articleId: the old sourceType value (article filename)
 * - paragraphId: unchanged
 * - paragraphOrder: extracted from paragraphId (e.g., _p0 -> 0)
 * - order: sourceIndex or existing order
 */
export const migrateSentence = (sentence: SentencePair): SentencePair => {
  const legacySourceType = sentence.sourceType as string;

  // Already migrated - sourceType is one of the new valid values
  if (['article', 'paragraph', 'sentence'].includes(legacySourceType)) {
    // Ensure order field exists
    if (sentence.order === undefined) {
      return { ...sentence, order: sentence.sourceIndex ?? -1 };
    }
    return sentence;
  }

  // Check for legacy patterns
  if (legacySourceType === 'manual' || legacySourceType === 'batch') {
    return {
      ...sentence,
      sourceType: 'sentence',
      order: -1,
    };
  }

  if (legacySourceType.startsWith('paragraph_')) {
    return {
      ...sentence,
      sourceType: 'paragraph',
      paragraphId: sentence.paragraphId || legacySourceType,
      order: sentence.sourceIndex ?? sentence.order ?? 0,
    };
  }

  // Legacy article format: sourceType contains filename like "xxx.json"
  // or starts with "article_"
  if (legacySourceType.startsWith('article_') || legacySourceType.includes('.json')) {
    const paragraphOrder = extractParagraphOrder(sentence.paragraphId);

    return {
      ...sentence,
      sourceType: 'article',
      articleId: sentence.articleId || legacySourceType,  // Preserve old sourceType as articleId
      paragraphId: sentence.paragraphId || generateId('para'),
      paragraphOrder: sentence.paragraphOrder ?? paragraphOrder,  // Extract from paragraphId
      order: sentence.sourceIndex ?? sentence.order ?? 0,
    };
  }

  // Default: treat as standalone sentence
  return {
    ...sentence,
    sourceType: 'sentence',
    order: -1,
  };
};

/**
 * Migrates all sentences in the store to the new format
 */
export const migrateAllSentences = (sentences: SentencePair[]): SentencePair[] => {
  return sentences.map(migrateSentence);
};

// === Batch Import Types and Functions ===

export type ImportMode = 'article' | 'paragraph' | 'sentence';

export interface ImportResult {
  success: boolean;
  count: number;
  error?: string;
}

/**
 * Creates sentence pairs from sentence mode (batch/line-by-line import)
 * Each line in enLines corresponds to the same index in zhLines
 * These are standalone sentences with no paragraph/article context
 */
export const createSentenceModePairs = (
  enLines: string[],
  zhLines: string[]
): SentencePair[] => {
  const timestamp = Date.now();
  const maxLen = Math.max(enLines.length, zhLines.length);
  const pairs: SentencePair[] = [];

  for (let i = 0; i < maxLen; i++) {
    pairs.push({
      id: generateId('sent'),
      en: enLines[i]?.trim() || '',
      zh: zhLines[i]?.trim() || '',
      sourceType: 'sentence',
      order: -1,  // No order for standalone sentences
      createdAt: timestamp,
    });
  }

  return pairs;
};

/**
 * Creates sentence pairs from paragraph mode (single paragraph import)
 * All sentences share the same paragraphId
 */
export const createParagraphModePairs = (
  enSentences: string[],
  zhSentences: string[]
): SentencePair[] => {
  const timestamp = Date.now();
  const paragraphId = generateId('para');
  const maxLen = Math.max(enSentences.length, zhSentences.length);
  const pairs: SentencePair[] = [];

  for (let i = 0; i < maxLen; i++) {
    pairs.push({
      id: generateId('sent'),
      en: enSentences[i]?.trim() || '',
      zh: zhSentences[i]?.trim() || '',
      sourceType: 'paragraph',
      paragraphId,
      order: i,
      createdAt: timestamp,
    });
  }

  return pairs;
};

/**
 * Paragraph data for article mode import
 */
export interface ParagraphData {
  enSentences: string[];
  zhSentences: string[];
}

/**
 * Creates sentence pairs from article mode (multi-paragraph import)
 * All sentences share the same articleId, grouped by paragraphId
 *
 * Ordering:
 * - paragraphOrder: position of paragraph within article (0, 1, 2...)
 * - order: position of sentence within paragraph (0, 1, 2...)
 */
export const createArticleModePairs = (
  paragraphs: ParagraphData[]
): SentencePair[] => {
  const timestamp = Date.now();
  const articleId = generateId('art');
  const pairs: SentencePair[] = [];

  for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex++) {
    const paragraph = paragraphs[paragraphIndex];
    const paragraphId = generateId('para');
    const maxLen = Math.max(paragraph.enSentences.length, paragraph.zhSentences.length);

    for (let sentenceIndex = 0; sentenceIndex < maxLen; sentenceIndex++) {
      pairs.push({
        id: generateId('sent'),
        en: paragraph.enSentences[sentenceIndex]?.trim() || '',
        zh: paragraph.zhSentences[sentenceIndex]?.trim() || '',
        sourceType: 'article',
        articleId,
        paragraphId,
        paragraphOrder: paragraphIndex,  // Position of paragraph in article
        order: sentenceIndex,            // Position of sentence in paragraph
        createdAt: timestamp,
      });
    }
  }

  return pairs;
};

// === Legacy compatibility (deprecated, use new functions above) ===

/**
 * @deprecated Use createSentenceModePairs instead
 */
export const createBatchSentences = createSentenceModePairs;

/**
 * @deprecated Use createParagraphModePairs instead
 */
export const createParagraphSentences = (
  enSentences: string[],
  zhSentences: string[]
): SentencePair[] => createParagraphModePairs(enSentences, zhSentences);

/**
 * @deprecated Use createArticleModePairs instead
 */
export const createArticleSentences = (
  enSentences: string[],
  zhSentences: string[]
): SentencePair[] => createArticleModePairs([{ enSentences, zhSentences }]);

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
