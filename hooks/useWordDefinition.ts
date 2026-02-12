import { useState, useRef, useCallback } from 'react';
import { defineWord } from '../services/llmService';

interface WordDefState {
  word: string;
  rect: DOMRect;
}

interface WordDefinition {
  general: string;
  contextual: string;
}

/**
 * useWordDefinition - Manages word definition state and session cache.
 *
 * Cache key: `word_lower::sentence` so same word in different sentences
 * gets different contextual meanings. Cache persists across re-renders
 * but resets on page reload.
 */
export function useWordDefinition() {
  const [selectedWord, setSelectedWord] = useState<WordDefState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, WordDefinition>>(new Map());

  const lookupWord = useCallback(
    async (word: string, sentence: string, language: 'en' | 'zh', rect: DOMRect) => {
      setSelectedWord({ word, rect });
      setError(null);

      const cacheKey = `${word.toLowerCase()}::${sentence}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setDefinition(cached);
        setIsLoading(false);
        return;
      }

      setDefinition(null);
      setIsLoading(true);

      const result = await defineWord(word, sentence, language);

      if (result.success && result.data) {
        cacheRef.current.set(cacheKey, result.data);
        setDefinition(result.data);
      } else {
        setError(result.error || 'Failed to look up word');
      }
      setIsLoading(false);
    },
    []
  );

  const dismiss = useCallback(() => {
    setSelectedWord(null);
    setDefinition(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    selectedWord,
    isLoading,
    definition,
    error,
    lookupWord,
    dismiss,
  };
}
