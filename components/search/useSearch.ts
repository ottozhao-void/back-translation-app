import { useState, useMemo } from 'react';
import { SentencePair, TagInfo } from '../../types';

export interface SearchResult {
  sentence: SentencePair;
  matchType: 'text' | 'tag';
  matchField?: 'en' | 'zh';
  matchedTag?: string;
}

interface UseSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: SearchResult[];
  isTagSearch: boolean;
}

/**
 * useSearch - Search hook for sentences
 *
 * Features:
 * - Text search: matches en/zh fields (case-insensitive)
 * - Tag search: triggered by '#' prefix, matches tag labels
 * - Returns up to 50 results
 */
export function useSearch(
  sentences: SentencePair[],
  allTags: TagInfo[] = []
): UseSearchReturn {
  const [query, setQuery] = useState('');

  const isTagSearch = query.startsWith('#');

  const results = useMemo(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const searchResults: SearchResult[] = [];
    const maxResults = 50;

    if (isTagSearch) {
      // Tag search mode
      const tagQuery = trimmedQuery.slice(1).toLowerCase();
      if (!tagQuery) return [];

      // Find matching tags
      const matchingTagIds = allTags
        .filter(tag => tag.label.toLowerCase().includes(tagQuery))
        .map(tag => tag.id);

      // Find sentences with matching tags
      for (const sentence of sentences) {
        if (searchResults.length >= maxResults) break;

        const sentenceTags = sentence.tags || [];
        for (const tagId of matchingTagIds) {
          if (sentenceTags.includes(tagId)) {
            const tag = allTags.find(t => t.id === tagId);
            searchResults.push({
              sentence,
              matchType: 'tag',
              matchedTag: tag?.label,
            });
            break; // Only add sentence once
          }
        }
      }
    } else {
      // Text search mode
      const lowerQuery = trimmedQuery.toLowerCase();

      for (const sentence of sentences) {
        if (searchResults.length >= maxResults) break;

        const enMatch = sentence.en.toLowerCase().includes(lowerQuery);
        const zhMatch = sentence.zh.toLowerCase().includes(lowerQuery);

        if (enMatch || zhMatch) {
          searchResults.push({
            sentence,
            matchType: 'text',
            matchField: enMatch ? 'en' : 'zh',
          });
        }
      }
    }

    return searchResults;
  }, [query, sentences, allTags, isTagSearch]);

  return {
    query,
    setQuery,
    results,
    isTagSearch,
  };
}
