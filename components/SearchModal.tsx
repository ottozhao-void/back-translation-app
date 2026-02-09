import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SentencePair, TagInfo } from '../types';
import { useSearch } from './search/useSearch';
import { SearchIcon, XMarkIcon } from './Icons';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  sentences: SentencePair[];
  allTags?: TagInfo[];
  onSelectResult: (sentenceId: string) => void;
}

/**
 * SearchModal - Spotlight-style search modal
 *
 * Features:
 * - Semi-transparent backdrop with blur
 * - Auto-focus input
 * - Keyboard navigation (↑↓ select, Enter confirm, Esc close)
 * - Real-time search results
 * - Text highlighting for matches
 */
export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  sentences,
  allTags = [],
  onSelectResult,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { query, setQuery, results, isTagSearch } = useSearch(sentences, allTags);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure modal is rendered
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen, setQuery]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          onSelectResult(results[selectedIndex].sentence.id);
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [results, selectedIndex, onSelectResult, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && results.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, results.length]);

  // Handle clicking a result
  const handleResultClick = (sentenceId: string) => {
    onSelectResult(sentenceId);
    onClose();
  };

  // Highlight matching text
  const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (!query || isTagSearch) return text;

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) return text;

    const before = text.slice(0, index);
    const match = text.slice(index, index + query.length);
    const after = text.slice(index + query.length);

    return (
      <>
        {before}
        <span className="bg-yellow-500/30 rounded px-0.5">{match}</span>
        {after}
      </>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl mx-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-main)',
          border: '1px solid var(--border-high-contrast)',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--glass-border)' }}>
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sentences... (# for tags)"
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: 'var(--text-main)' }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full hover:bg-[var(--surface-hover)] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <XMarkIcon />
            </button>
          )}
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto custom-scrollbar"
        >
          {query && results.length === 0 ? (
            <div className="px-4 py-8 text-center" style={{ color: 'var(--text-secondary)' }}>
              No results found
            </div>
          ) : (
            results.slice(0, 10).map((result, index) => (
              <button
                key={result.sentence.id}
                onClick={() => handleResultClick(result.sentence.id)}
                className={`w-full px-4 py-3 text-left transition-colors ${
                  index === selectedIndex ? 'bg-[var(--surface-active)]' : 'hover:bg-[var(--surface-hover)]'
                }`}
              >
                {/* Main text */}
                <p
                  className="text-sm line-clamp-1 font-serif-sc"
                  style={{ color: 'var(--text-main)' }}
                >
                  {result.matchType === 'text' && result.matchField === 'en'
                    ? highlightMatch(result.sentence.en, query)
                    : result.sentence.en.slice(0, 60) + (result.sentence.en.length > 60 ? '...' : '')}
                </p>
                {/* Secondary text */}
                <p
                  className="text-xs mt-1 line-clamp-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {result.matchType === 'text' && result.matchField === 'zh'
                    ? highlightMatch(result.sentence.zh, query)
                    : result.sentence.zh.slice(0, 60) + (result.sentence.zh.length > 60 ? '...' : '')}
                </p>
                {/* Tag indicator */}
                {result.matchType === 'tag' && result.matchedTag && (
                  <span
                    className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)' }}
                  >
                    #{result.matchedTag}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        {results.length > 0 && (
          <div
            className="px-4 py-2 text-xs border-t flex items-center justify-between"
            style={{ borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}
          >
            <span>↑↓ to navigate • Enter to select • Esc to close</span>
            <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
};
