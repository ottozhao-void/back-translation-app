/**
 * Vocabulary Loader - CRUD operations and API client for vocabulary system
 */

import type {
  VocabularyItem,
  VocabularyStore,
  VocabularyType,
  VocabularyStatus,
  VocabularySource,
  VocabularyExample,
  DEFAULT_VOCABULARY_STORE,
} from '../types';

// === API Response Types ===

export interface VocabularyStoreResponse {
  success: boolean;
  data?: VocabularyStore;
  error?: string;
}

export interface VocabularyItemResponse {
  success: boolean;
  data?: VocabularyItem;
  error?: string;
}

export interface VocabularySaveResponse {
  success: boolean;
  count?: number;
  error?: string;
}

// === ID Generation ===

/**
 * Generates a unique vocabulary ID
 * Format: vocab_timestamp_random (e.g., "vocab_1234567890_a1b2")
 */
export const generateVocabId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `vocab_${timestamp}_${random}`;
};

// === Text Normalization ===

/**
 * Normalize text for deduplication matching
 * - Lowercase
 * - Trim whitespace
 * - Collapse multiple spaces to single space
 */
export const normalizeText = (text: string): string => {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
};

// === API Functions ===

/**
 * Fetch the full vocabulary store from the server
 */
export const fetchVocabularyStore = async (): Promise<VocabularyStoreResponse> => {
  try {
    const response = await fetch('/api/vocabulary');
    if (!response.ok) {
      return { success: false, error: response.statusText };
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to fetch vocabulary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Fetch all vocabulary items
 */
export const fetchVocabulary = async (): Promise<VocabularyItem[]> => {
  const result = await fetchVocabularyStore();
  if (result.success && result.data) {
    return result.data.items || [];
  }
  return [];
};

/**
 * Save the full vocabulary store
 */
export const saveVocabularyStore = async (store: VocabularyStore): Promise<VocabularySaveResponse> => {
  try {
    const response = await fetch('/api/vocabulary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(store),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to save vocabulary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Save vocabulary items (wraps in store structure)
 */
export const saveVocabulary = async (items: VocabularyItem[]): Promise<boolean> => {
  const store: VocabularyStore = {
    version: 1,
    items,
    lastModified: Date.now(),
  };
  const result = await saveVocabularyStore(store);
  return result.success;
};

/**
 * Fetch a single vocabulary item by ID
 */
export const fetchVocabularyById = async (id: string): Promise<VocabularyItemResponse> => {
  try {
    const response = await fetch(`/api/vocabulary/${encodeURIComponent(id)}`);
    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Vocabulary item not found' };
      }
      return { success: false, error: response.statusText };
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch vocabulary item:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Update a single vocabulary item (PATCH)
 */
export const patchVocabularyItem = async (
  id: string,
  updates: Partial<VocabularyItem>
): Promise<VocabularyItemResponse> => {
  try {
    const response = await fetch(`/api/vocabulary/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Vocabulary item not found' };
      }
      return { success: false, error: response.statusText };
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to patch vocabulary item:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Delete a vocabulary item by ID
 */
export const deleteVocabularyItem = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`/api/vocabulary/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to delete vocabulary item:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// === Query Helpers ===

/**
 * Find an existing vocabulary item by normalized text
 */
export const findByText = (
  items: VocabularyItem[],
  text: string
): VocabularyItem | undefined => {
  const normalized = normalizeText(text);
  return items.find(item => item.normalizedText === normalized);
};

/**
 * Find vocabulary items by type
 */
export const filterByType = (
  items: VocabularyItem[],
  type: VocabularyType
): VocabularyItem[] => {
  return items.filter(item => item.type === type);
};

/**
 * Find vocabulary items linked to a specific sentence
 */
export const filterBySentence = (
  items: VocabularyItem[],
  sentenceId: string
): VocabularyItem[] => {
  return items.filter(item =>
    item.sources.some(source => source.sentenceId === sentenceId)
  );
};

/**
 * Find vocabulary items by status
 */
export const filterByStatus = (
  items: VocabularyItem[],
  status: VocabularyStatus
): VocabularyItem[] => {
  return items.filter(item => item.status === status);
};

/**
 * Search vocabulary items by text (case-insensitive)
 */
export const searchVocabulary = (
  items: VocabularyItem[],
  query: string
): VocabularyItem[] => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return items;

  return items.filter(item =>
    item.normalizedText.includes(normalizedQuery) ||
    item.definition.toLowerCase().includes(normalizedQuery) ||
    (item.definitionZh && item.definitionZh.includes(query))
  );
};

// === Factory Functions ===

/**
 * Create a new vocabulary item (pending status, no enrichment yet)
 */
export const createVocabularyItem = (
  text: string,
  type: VocabularyType,
  source: VocabularySource
): VocabularyItem => {
  const now = Date.now();
  return {
    id: generateVocabId(),
    text: text.trim(),
    normalizedText: normalizeText(text),
    type,
    definition: '',
    examples: [],
    sources: [source],
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Create a vocabulary source reference from a sentence
 */
export const createVocabularySource = (
  sentenceId: string,
  en: string,
  zh: string
): VocabularySource => {
  return {
    sentenceId,
    en,
    zh,
    addedAt: Date.now(),
  };
};

/**
 * Add a source to an existing vocabulary item (for duplicates)
 */
export const addSourceToItem = (
  item: VocabularyItem,
  source: VocabularySource
): VocabularyItem => {
  // Check if this source already exists
  const exists = item.sources.some(s => s.sentenceId === source.sentenceId);
  if (exists) {
    return item;
  }

  return {
    ...item,
    sources: [...item.sources, source],
    updatedAt: Date.now(),
  };
};

/**
 * Update item with LLM enrichment data
 */
export const enrichItem = (
  item: VocabularyItem,
  enrichment: {
    definition: string;
    definitionZh?: string;
    examples: VocabularyExample[];
  }
): VocabularyItem => {
  return {
    ...item,
    definition: enrichment.definition,
    definitionZh: enrichment.definitionZh,
    examples: enrichment.examples,
    status: 'enriched',
    updatedAt: Date.now(),
  };
};

/**
 * Create a pattern item with template (from LLM suggestion)
 */
export const createPatternItem = (
  text: string,
  template: string,
  explanation: string,
  source: VocabularySource
): VocabularyItem => {
  const now = Date.now();
  return {
    id: generateVocabId(),
    text: text.trim(),
    normalizedText: normalizeText(text),
    type: 'pattern',
    definition: explanation,
    examples: [],
    patternTemplate: template,
    patternExplanation: explanation,
    sources: [source],
    status: 'enriched', // Patterns come pre-enriched from LLM
    createdAt: now,
    updatedAt: now,
  };
};
