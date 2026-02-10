/**
 * useVocabulary - React hook for vocabulary state management
 *
 * Provides reactive vocabulary data and actions for adding, updating,
 * deleting, and enriching vocabulary items.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  VocabularyItem,
  VocabularyType,
  VocabularyStatus,
  SentencePair,
} from '../types';
import {
  fetchVocabulary,
  saveVocabulary,
  patchVocabularyItem,
  deleteVocabularyItem as deleteVocabApi,
  findByText,
  filterByType,
  filterBySentence,
  filterByStatus,
  searchVocabulary,
  createVocabularyItem,
  createVocabularySource,
  addSourceToItem,
  enrichItem,
  createPatternItem,
} from '../utils/vocabularyLoader';
import { enrichVocabulary } from '../services/llmService';

export interface UseVocabularyReturn {
  // State
  items: VocabularyItem[];
  isLoading: boolean;
  error: string | null;

  // Actions
  addVocabulary: (
    text: string,
    type: VocabularyType,
    sourceSentence: SentencePair
  ) => Promise<VocabularyItem | null>;
  addPattern: (
    text: string,
    template: string,
    explanation: string,
    sourceSentence: SentencePair
  ) => Promise<VocabularyItem | null>;
  updateVocabulary: (id: string, updates: Partial<VocabularyItem>) => Promise<boolean>;
  deleteVocabulary: (id: string) => Promise<boolean>;
  enrichPending: (id?: string) => Promise<void>;
  refresh: () => Promise<void>;

  // Queries
  getByType: (type: VocabularyType) => VocabularyItem[];
  getBySentence: (sentenceId: string) => VocabularyItem[];
  getByStatus: (status: VocabularyStatus) => VocabularyItem[];
  getById: (id: string) => VocabularyItem | undefined;
  search: (query: string) => VocabularyItem[];
  findExisting: (text: string) => VocabularyItem | undefined;
}

export function useVocabulary(): UseVocabularyReturn {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load vocabulary on mount
  const loadVocabulary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchVocabulary();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load vocabulary');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVocabulary();
  }, [loadVocabulary]);

  // Refresh vocabulary from server
  const refresh = useCallback(async () => {
    await loadVocabulary();
  }, [loadVocabulary]);

  // Add a new vocabulary item (word or collocation)
  const addVocabulary = useCallback(
    async (
      text: string,
      type: VocabularyType,
      sourceSentence: SentencePair
    ): Promise<VocabularyItem | null> => {
      const source = createVocabularySource(
        sourceSentence.id,
        sourceSentence.en,
        sourceSentence.zh
      );

      // Check if item already exists
      const existing = findByText(items, text);
      if (existing) {
        // Add new source link to existing item
        const updated = addSourceToItem(existing, source);
        if (updated !== existing) {
          const newItems = items.map(item =>
            item.id === existing.id ? updated : item
          );
          setItems(newItems);
          await saveVocabulary(newItems);
        }
        return updated;
      }

      // Create new item
      const newItem = createVocabularyItem(text, type, source);

      // Optimistic update
      const newItems = [newItem, ...items];
      setItems(newItems);

      // Save to server
      const saved = await saveVocabulary(newItems);
      if (!saved) {
        // Rollback on failure - use functional update to avoid stale closure
        setItems(prev => prev.filter(item => item.id !== newItem.id));
        setError('Failed to save vocabulary');
        return null;
      }

      // Trigger LLM enrichment in background
      enrichVocabulary(text, type, sourceSentence.en).then(async (result) => {
        if (result.success && result.data) {
          const enriched = enrichItem(newItem, result.data);
          setItems(prev =>
            prev.map(item => (item.id === newItem.id ? enriched : item))
          );
          await patchVocabularyItem(newItem.id, {
            definition: enriched.definition,
            definitionZh: enriched.definitionZh,
            examples: enriched.examples,
            status: 'enriched',
            updatedAt: enriched.updatedAt,
          });
        }
      });

      return newItem;
    },
    [items]
  );

  // Add a pattern (from LLM suggestion, already has template)
  const addPattern = useCallback(
    async (
      text: string,
      template: string,
      explanation: string,
      sourceSentence: SentencePair
    ): Promise<VocabularyItem | null> => {
      const source = createVocabularySource(
        sourceSentence.id,
        sourceSentence.en,
        sourceSentence.zh
      );

      // Check if pattern already exists
      const existing = findByText(items, text);
      if (existing) {
        const updated = addSourceToItem(existing, source);
        if (updated !== existing) {
          const newItems = items.map(item =>
            item.id === existing.id ? updated : item
          );
          setItems(newItems);
          await saveVocabulary(newItems);
        }
        return updated;
      }

      // Create pattern item (pre-enriched)
      const newItem = createPatternItem(text, template, explanation, source);

      // Optimistic update
      const newItems = [newItem, ...items];
      setItems(newItems);

      // Save to server
      const saved = await saveVocabulary(newItems);
      if (!saved) {
        // Rollback on failure - use functional update to avoid stale closure
        setItems(prev => prev.filter(item => item.id !== newItem.id));
        setError('Failed to save pattern');
        return null;
      }

      return newItem;
    },
    [items]
  );

  // Update a vocabulary item
  const updateVocabulary = useCallback(
    async (id: string, updates: Partial<VocabularyItem>): Promise<boolean> => {
      const index = items.findIndex(item => item.id === id);
      if (index === -1) return false;

      const updatedItem = {
        ...items[index],
        ...updates,
        updatedAt: Date.now(),
      };

      // Optimistic update
      const newItems = [...items];
      newItems[index] = updatedItem;
      setItems(newItems);

      // Patch on server
      const result = await patchVocabularyItem(id, updates);
      if (!result.success) {
        // Rollback - use functional update to restore original item
        setItems(prev => prev.map(item => item.id === id ? items[index] : item));
        setError(result.error || 'Failed to update vocabulary');
        return false;
      }

      return true;
    },
    [items]
  );

  // Delete a vocabulary item
  const deleteVocabulary = useCallback(
    async (id: string): Promise<boolean> => {
      const index = items.findIndex(item => item.id === id);
      if (index === -1) return false;

      // Optimistic update
      const newItems = items.filter(item => item.id !== id);
      setItems(newItems);

      // Delete on server
      const result = await deleteVocabApi(id);
      if (!result.success) {
        // Rollback - use functional update to restore deleted item
        const deletedItem = items[index];
        setItems(prev => [...prev.slice(0, index), deletedItem, ...prev.slice(index)]);
        setError(result.error || 'Failed to delete vocabulary');
        return false;
      }

      return true;
    },
    [items]
  );

  // Enrich pending items with LLM
  const enrichPending = useCallback(
    async (id?: string) => {
      const pendingItems = id
        ? items.filter(item => item.id === id && item.status === 'pending')
        : filterByStatus(items, 'pending');

      // Process items in parallel for better performance
      await Promise.all(pendingItems.map(async (item) => {
        // Get context from first source
        const context = item.sources[0]?.en || '';
        const result = await enrichVocabulary(item.text, item.type, context);

        if (result.success && result.data) {
          const enriched = enrichItem(item, result.data);
          setItems(prev =>
            prev.map(i => (i.id === item.id ? enriched : i))
          );
          await patchVocabularyItem(item.id, {
            definition: enriched.definition,
            definitionZh: enriched.definitionZh,
            examples: enriched.examples,
            status: 'enriched',
            updatedAt: enriched.updatedAt,
          });
        }
      }));
    },
    [items]
  );

  // Query helpers (memoized)
  const getByType = useCallback(
    (type: VocabularyType) => filterByType(items, type),
    [items]
  );

  const getBySentence = useCallback(
    (sentenceId: string) => filterBySentence(items, sentenceId),
    [items]
  );

  const getByStatus = useCallback(
    (status: VocabularyStatus) => filterByStatus(items, status),
    [items]
  );

  const getById = useCallback(
    (id: string) => items.find(item => item.id === id),
    [items]
  );

  const search = useCallback(
    (query: string) => searchVocabulary(items, query),
    [items]
  );

  const findExisting = useCallback(
    (text: string) => findByText(items, text),
    [items]
  );

  return {
    items,
    isLoading,
    error,
    addVocabulary,
    addPattern,
    updateVocabulary,
    deleteVocabulary,
    enrichPending,
    refresh,
    getByType,
    getBySentence,
    getByStatus,
    getById,
    search,
    findExisting,
  };
}
