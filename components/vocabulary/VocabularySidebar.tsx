import React, { useState, useMemo } from 'react';
import { VocabularyItem, VocabularyType } from '../../types';
import { VocabularyListItem } from './VocabularyListItem';
import { filterByType, searchVocabulary } from '../../utils/vocabularyLoader';

interface VocabularySidebarProps {
  items: VocabularyItem[];
  selectedId: string | null;
  onSelectItem: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

type FilterType = 'all' | VocabularyType;

/**
 * VocabularySidebar - Right sidebar showing vocabulary collection
 */
export const VocabularySidebar: React.FC<VocabularySidebarProps> = ({
  items,
  selectedId,
  onSelectItem,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and search items
  const filteredItems = useMemo(() => {
    let result = items;

    // Filter by type using utility
    if (filter !== 'all') {
      result = filterByType(result, filter);
    }

    // Search using utility
    if (searchQuery.trim()) {
      result = searchVocabulary(result, searchQuery);
    }

    // Sort by most recently updated
    return result.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [items, filter, searchQuery]);

  // Counts for filter tabs
  const counts = useMemo(() => ({
    all: items.length,
    word: items.filter(i => i.type === 'word').length,
    collocation: items.filter(i => i.type === 'collocation').length,
    pattern: items.filter(i => i.type === 'pattern').length,
  }), [items]);

  // Collapsed state
  if (isCollapsed) {
    return (
      <div className="w-10 flex-shrink-0 border-l border-[var(--glass-border)] flex flex-col h-full bg-[var(--surface-hover)]/20">
        <button
          onClick={onToggleCollapse}
          className="flex-1 flex items-center justify-center hover:bg-[var(--surface-hover)] transition-colors"
          title="Expand Vocabulary"
        >
          <span
            className="text-xs font-mono uppercase tracking-widest transform -rotate-90 whitespace-nowrap"
            style={{ color: 'var(--text-secondary)' }}
          >
            {items.length} vocab
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 flex-shrink-0 border-l border-[var(--glass-border)] flex flex-col h-full overflow-hidden bg-[var(--surface-hover)]/20 transition-all duration-200">
      {/* Header */}
      <div className="p-4 border-b border-[var(--glass-border)] flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-sm font-mono uppercase tracking-widest"
            style={{ color: 'var(--text-secondary)' }}
          >
            Vocabulary
          </h2>
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-[var(--surface-hover)] transition-colors"
            title="Collapse"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--surface-hover)' }}>
          {(['all', 'word', 'collocation', 'pattern'] as FilterType[]).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`flex-1 px-2 py-1 text-xs rounded-md transition-all ${
                filter === type
                  ? 'bg-[var(--bg-main)] shadow-sm'
                  : 'hover:bg-[var(--bg-main)]/50'
              }`}
              style={{ color: filter === type ? 'var(--text-main)' : 'var(--text-secondary)' }}
            >
              {type === 'all' ? 'All' : type === 'collocation' ? 'Phrase' : type.charAt(0).toUpperCase() + type.slice(1)}
              <span className="ml-1 opacity-60">{counts[type]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-[var(--glass-border)]">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--text-secondary)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--glass-border)] bg-transparent focus:outline-none focus:border-[var(--text-secondary)] transition-colors"
            style={{ color: 'var(--text-main)' }}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
            <p className="text-sm">
              {items.length === 0
                ? 'No vocabulary yet.'
                : 'No matches found.'}
            </p>
            {items.length === 0 && (
              <p className="text-xs mt-2">
                Select text in a sentence to add words.
              </p>
            )}
          </div>
        ) : (
          filteredItems.map((item) => (
            <VocabularyListItem
              key={item.id}
              item={item}
              isSelected={item.id === selectedId}
              onClick={() => onSelectItem(item.id)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div
        className="p-3 border-t border-[var(--glass-border)] text-center text-xs"
        style={{ color: 'var(--text-secondary)' }}
      >
        {filteredItems.length} / {items.length} items
      </div>
    </div>
  );
};
