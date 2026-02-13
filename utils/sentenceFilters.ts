/**
 * Shared sentence filtering and sorting utilities.
 *
 * This module extracts the filtering logic that was previously inlined in
 * SentenceSidebar.tsx, allowing both the sidebar and navigation components
 * to maintain identical ordering of sentences.
 *
 * Supported filters:
 * - No filter (null): All sentences, sorted by createdAt desc (newest first)
 * - Paragraph filter: Filter by paragraphId, sort by order asc
 * - Article filter: Filter by articleId, sort by paragraphOrder asc then order asc
 * - Tag filter: Filter by tags.includes(id), sort by createdAt desc
 */

import type { SentencePair, ContextFilter } from '../types';

/**
 * Get filtered and sorted sentences based on context filter.
 *
 * @param sentences - All sentence pairs
 * @param contextFilter - Optional context filter (paragraph/article/tag)
 * @returns Filtered and sorted sentence list
 */
export function getFilteredSentences(
  sentences: SentencePair[],
  contextFilter: ContextFilter | null,
): SentencePair[] {
  // No filter: show all sentences sorted by creation time (newest first)
  if (!contextFilter) {
    return [...sentences].sort((a, b) => b.createdAt - a.createdAt);
  }

  // Paragraph context: filter by paragraphId, sort by sentence order within paragraph
  if (contextFilter.type === 'paragraph') {
    return sentences
      .filter(s => s.paragraphId === contextFilter.id)
      .sort((a, b) => a.order - b.order);
  }

  // Article context: filter by articleId, sort by paragraphOrder then sentence order
  if (contextFilter.type === 'article') {
    return sentences
      .filter(s => s.articleId === contextFilter.id)
      .sort((a, b) => {
        // First compare by paragraph order (position of paragraph in article)
        const paraOrderA = a.paragraphOrder ?? 0;
        const paraOrderB = b.paragraphOrder ?? 0;
        if (paraOrderA !== paraOrderB) {
          return paraOrderA - paraOrderB;
        }
        // Then compare by sentence order (position within paragraph)
        return a.order - b.order;
      });
  }

  // Tag context: filter by tag inclusion, sort by creation time (newest first)
  if (contextFilter.type === 'tag') {
    return sentences
      .filter(s => s.tags?.includes(contextFilter.id))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  // Fallback: return all sentences
  return sentences;
}

/**
 * Find the index of a sentence within a filtered list.
 *
 * @param filteredSentences - The filtered sentence list
 * @param sentenceId - The sentence ID to find
 * @returns Index (0-based) or -1 if not found
 */
export function findSentenceIndex(
  filteredSentences: SentencePair[],
  sentenceId: string | null,
): number {
  if (sentenceId === null) return -1;
  return filteredSentences.findIndex(s => s.id === sentenceId);
}
