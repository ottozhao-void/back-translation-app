import React, { useState, useMemo, useEffect } from 'react';
import { VocabularyItem, VocabularyType } from '../../types';
import { filterByType, searchVocabulary } from '../../utils/vocabularyLoader';
import { VocabularyListItem } from '../../components/mobile/VocabularyListItem';
import { VocabularyDetailModal } from '../../components/mobile/VocabularyDetailModal';
import { VOCABULARY_TYPE_COLORS } from '../../components/vocabulary/constants';

type FilterType = 'all' | VocabularyType;

interface MobileVocabularyProps {
  items: VocabularyItem[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onNavigateToSentence: (sentenceId: string) => void;
}

/**
 * MobileVocabulary - Mobile vocabulary management view
 *
 * Features:
 * - Filter tabs (All / Word / Phrase / Pattern)
 * - Inline search bar
 * - List of vocabulary items
 * - Full-screen detail modal
 */
export const MobileVocabulary: React.FC<MobileVocabularyProps> = ({
  items,
  isLoading,
  onDelete,
  onNavigateToSentence,
}) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<VocabularyItem | null>(null);

  // Filter and search items
  const filteredItems = useMemo(() => {
    let result = items;

    // Filter by type
    if (filter !== 'all') {
      result = filterByType(result, filter);
    }

    // Search
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

  // Clear selection when items change significantly
  useEffect(() => {
    if (selectedItem && !items.find(i => i.id === selectedItem.id)) {
      setSelectedItem(null);
    }
  }, [items, selectedItem]);

  const getFilterLabel = (type: FilterType): string => {
    switch (type) {
      case 'all': return 'All';
      case 'word': return 'Words';
      case 'collocation': return 'Phrases';
      case 'pattern': return 'Patterns';
    }
  };

  return (
    <>
      <div className="px-4 py-4">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {(['all', 'word', 'collocation', 'pattern'] as FilterType[]).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 text-sm rounded-full whitespace-nowrap transition-all duration-200 ${
                filter === type ? 'font-medium' : ''
              }`}
              style={{
                backgroundColor: filter === type ? 'var(--surface-active)' : 'var(--surface-hover)',
                color: 'var(--text-main)',
              }}
            >
              {getFilterLabel(type)}
              <span className="ml-1 opacity-60">({counts[type]})</span>
            </button>
          ))}
        </div>

        {/* Inline Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
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
              placeholder="Search vocabulary..."
              className="w-full pl-12 pr-4 py-3 text-sm rounded-xl border focus:outline-none transition-colors"
              style={{
                backgroundColor: 'var(--glass-bg)',
                borderColor: 'var(--glass-border)',
                color: 'var(--text-main)',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full"
                style={{ backgroundColor: 'var(--surface-hover)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: 'var(--text-secondary)', borderTopColor: 'transparent' }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>Loading vocabulary...</span>
            </div>
          </div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
            <div className="text-4xl mb-4">📖</div>
            <h2 className="text-lg font-medium mb-2" style={{ color: 'var(--text-main)' }}>
              No vocabulary yet
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Select text in sentences to add words to your vocabulary
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          /* No Results */
          <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="text-lg font-medium mb-2" style={{ color: 'var(--text-main)' }}>
              No matches found
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Try adjusting your search or filter
            </p>
          </div>
        ) : (
          /* Vocabulary List */
          <div className="space-y-3 pb-4">
            {filteredItems.map((item) => (
              <VocabularyListItem
                key={item.id}
                item={item}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        )}

        {/* Footer count */}
        {!isLoading && items.length > 0 && (
          <div className="text-center py-3">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {filteredItems.length} / {items.length} items
            </p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <VocabularyDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onDelete={onDelete}
          onNavigateToSentence={onNavigateToSentence}
        />
      )}
    </>
  );
};
