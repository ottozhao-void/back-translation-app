/**
 * HistoryList - 按日期分组的历史列表
 * Displays practice history entries grouped by date
 */

import React from 'react';
import type { PracticeHistoryEntry } from '../../types';
import { HistoryEntry } from './HistoryEntry';

interface HistoryListProps {
  grouped: Map<string, PracticeHistoryEntry[]>;
  onNavigate: (sentenceId: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ grouped, onNavigate }) => {
  // 空状态
  if (grouped.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[var(--text-secondary)]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1}
          stroke="currentColor"
          className="w-16 h-16 mb-4 opacity-30"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-lg font-medium mb-1">暂无练习记录</p>
        <p className="text-sm opacity-70">开始练习后，你的历史记录将显示在这里</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([dateKey, entries]) => (
        <div key={dateKey}>
          {/* 日期标题 */}
          <div className="sticky top-0 z-10 py-2 px-1 mb-3 bg-[var(--bg-main)]/80 backdrop-blur-sm">
            <h4 className="text-sm font-medium text-[var(--text-secondary)]">{dateKey}</h4>
          </div>

          {/* 该日期的记录列表 */}
          <div className="space-y-3">
            {entries.map((entry) => (
              <HistoryEntry
                key={entry.id}
                entry={entry}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
