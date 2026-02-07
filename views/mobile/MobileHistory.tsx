/**
 * MobileHistory - Mobile-optimized practice history view
 * Reuses HistoryFilter and HistoryList from desktop HistoryModal
 */

import React, { useState, useCallback } from 'react';
import type { SentencePair, TimeFilterPreset, HistoryFilterState } from '../../types';
import { usePracticeHistory } from '../../hooks/usePracticeHistory';
import { HistoryFilter } from '../../components/HistoryModal/HistoryFilter';
import { HistoryList } from '../../components/HistoryModal/HistoryList';

interface MobileHistoryProps {
  sentences: SentencePair[];
  isLoading: boolean;
  onNavigateToSentence: (sentenceId: string) => void;
}

/**
 * Mobile history view - full-screen tab content (no modal chrome)
 */
export const MobileHistory: React.FC<MobileHistoryProps> = ({
  sentences,
  isLoading,
  onNavigateToSentence,
}) => {
  const [filter, setFilter] = useState<HistoryFilterState>({ preset: 'week' });
  const { grouped, totalCount } = usePracticeHistory(sentences, filter);

  const handlePresetChange = useCallback((preset: TimeFilterPreset) => {
    setFilter({ preset });
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        {/* Skeleton filter bar */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)]">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="w-14 h-8 rounded-lg animate-pulse"
                style={{ backgroundColor: 'var(--surface-hover)' }}
              />
            ))}
          </div>
          <div
            className="w-20 h-5 rounded animate-pulse"
            style={{ backgroundColor: 'var(--surface-hover)' }}
          />
        </div>
        {/* Skeleton list */}
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-3">
              <div
                className="w-24 h-4 rounded animate-pulse"
                style={{ backgroundColor: 'var(--surface-hover)' }}
              />
              {[1, 2].map(j => (
                <div
                  key={j}
                  className="h-20 rounded-lg animate-pulse"
                  style={{ backgroundColor: 'var(--surface-hover)' }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar - sticky at top */}
      <HistoryFilter
        currentPreset={filter.preset}
        totalCount={totalCount}
        onPresetChange={handlePresetChange}
      />

      {/* Scrollable history list */}
      <div className="flex-1 overflow-y-auto p-4">
        <HistoryList grouped={grouped} onNavigate={onNavigateToSentence} />
      </div>
    </div>
  );
};
