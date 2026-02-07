import React, { useMemo, useState } from 'react';
import { SentenceSummary } from '../../utils/sentenceLoader';
import { SentenceListItem } from '../../components/mobile/SentenceListItem';

interface MobileHomeProps {
  summaries: SentenceSummary[];
  isLoading: boolean;
  onSelectSentence: (id: string) => void;
  onStartPractice: (sentenceIds: string[]) => void;
}

type GroupMode = 'all' | 'by-source';

/**
 * MobileHome - Home view showing sentence list
 *
 * Features:
 * - Group by source or show all
 * - Quick practice button for each group
 * - Pull-to-refresh (future)
 */
export const MobileHome: React.FC<MobileHomeProps> = ({
  summaries,
  isLoading,
  onSelectSentence,
  onStartPractice,
}) => {
  const [groupMode, setGroupMode] = useState<GroupMode>('by-source');
  const [expandedSource, setExpandedSource] = useState<string | null>(null);

  // Group sentences by sourceType
  const groupedSentences = useMemo(() => {
    const groups = new Map<string, SentenceSummary[]>();

    for (const sentence of summaries) {
      const key = sentence.articleId || sentence.sourceType || 'standalone';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(sentence);
    }

    return groups;
  }, [summaries]);

  // Calculate stats for a group
  const getGroupStats = (sentences: SentenceSummary[]) => {
    const total = sentences.length;
    const practiced = sentences.filter(s => s.hasUserTranslation).length;
    return { total, practiced, progress: total > 0 ? practiced / total : 0 };
  };

  // Format source name for display
  const formatSourceName = (sourceType: string): string => {
    if (sourceType === 'standalone' || sourceType === 'sentence') {
      return 'Manual Entries';
    }
    // Extract readable name from article ID
    const name = sourceType
      .replace(/^\d+_/, '') // Remove timestamp prefix
      .replace(/\.json$/, '') // Remove extension
      .replace(/_/g, ' '); // Replace underscores with spaces
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--text-secondary)', borderTopColor: 'transparent' }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>Loading sentences...</span>
        </div>
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
        <div className="text-4xl mb-4">📚</div>
        <h2 className="text-lg font-medium mb-2" style={{ color: 'var(--text-main)' }}>
          No sentences yet
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Add sentences from the desktop version to start practicing
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      {/* Group mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setGroupMode('by-source')}
          className={`px-3 py-1.5 text-sm rounded-full transition-colors duration-200 ${
            groupMode === 'by-source' ? 'font-medium' : ''
          }`}
          style={{
            backgroundColor: groupMode === 'by-source' ? 'var(--surface-active)' : 'var(--surface-hover)',
            color: 'var(--text-main)',
          }}
        >
          By Source
        </button>
        <button
          onClick={() => setGroupMode('all')}
          className={`px-3 py-1.5 text-sm rounded-full transition-colors duration-200 ${
            groupMode === 'all' ? 'font-medium' : ''
          }`}
          style={{
            backgroundColor: groupMode === 'all' ? 'var(--surface-active)' : 'var(--surface-hover)',
            color: 'var(--text-main)',
          }}
        >
          All ({summaries.length})
        </button>
      </div>

      {groupMode === 'by-source' ? (
        // Grouped view
        <div className="space-y-3">
          {Array.from(groupedSentences.entries()).map(([sourceType, sentences]) => {
            const stats = getGroupStats(sentences);
            const isExpanded = expandedSource === sourceType;

            return (
              <div
                key={sourceType}
                className="rounded-xl overflow-hidden"
                style={{
                  backgroundColor: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                {/* Group header */}
                <button
                  onClick={() => setExpandedSource(isExpanded ? null : sourceType)}
                  className="w-full px-4 py-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="font-medium truncate" style={{ color: 'var(--text-main)' }}>
                      {formatSourceName(sourceType)}
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {stats.total} sentences · {stats.practiced} practiced
                    </p>
                  </div>

                  {/* Progress indicator */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div
                      className="w-16 h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'var(--surface-hover)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${stats.progress * 100}%`,
                          backgroundColor: stats.progress === 1 ? 'var(--success-color, #22c55e)' : 'var(--text-main)',
                        }}
                      />
                    </div>

                    {/* Expand icon */}
                    <svg
                      className={`w-5 h-5 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div
                    className="border-t"
                    style={{ borderColor: 'var(--glass-border)' }}
                  >
                    {/* Quick practice button */}
                    <button
                      onClick={() => onStartPractice(sentences.map(s => s.id))}
                      className="w-full px-4 py-2.5 flex items-center justify-center gap-2 transition-colors duration-200"
                      style={{
                        backgroundColor: 'var(--surface-hover)',
                        color: 'var(--text-main)',
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Practice All
                    </button>

                    {/* Sentence list */}
                    <div className="max-h-64 overflow-y-auto">
                      {sentences.map((sentence, index) => (
                        <SentenceListItem
                          key={sentence.id}
                          sentence={sentence}
                          index={index + 1}
                          onClick={() => onSelectSentence(sentence.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // Flat list view
        <div className="space-y-2">
          {summaries.map((sentence, index) => (
            <SentenceListItem
              key={sentence.id}
              sentence={sentence}
              index={index + 1}
              onClick={() => onSelectSentence(sentence.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
