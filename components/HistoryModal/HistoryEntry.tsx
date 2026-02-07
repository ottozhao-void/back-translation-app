/**
 * HistoryEntry - 单条历史记录组件
 * Displays a single practice history entry with score indicator and navigation
 */

import React from 'react';
import type { PracticeHistoryEntry } from '../../types';
import { formatTime, getScoreColor, getDirectionLabel } from '../../utils/historyUtils';
import { ChevronRightIcon } from '../Icons';

interface HistoryEntryProps {
  entry: PracticeHistoryEntry;
  onNavigate: (sentenceId: string) => void;
}

export const HistoryEntry: React.FC<HistoryEntryProps> = ({ entry, onNavigate }) => {
  const scoreColor = getScoreColor(entry.type, entry.score);
  const directionLabel = getDirectionLabel(entry.direction);
  const timeStr = formatTime(entry.timestamp);

  // 截断显示的文本
  const truncate = (text: string, maxLen: number) =>
    text.length > maxLen ? text.slice(0, maxLen) + '...' : text;

  // 原文（根据方向显示）
  const originalText = entry.direction === 'en-to-zh' ? entry.originalEn : entry.originalZh;

  // 获取类型标签
  const getTypeLabel = () => {
    if (entry.type === 'draft') return '草稿';
    if (entry.type === 'diff') return 'diff';
    if (entry.score !== undefined) return `${entry.score}分`;
    return 'LLM';
  };

  return (
    <div
      className="group p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10 hover:bg-[var(--surface-hover)]/30 transition-all cursor-pointer"
      onClick={() => onNavigate(entry.sentenceId)}
    >
      {/* 第一行：状态、时间、方向、原文预览、分数 */}
      <div className="flex items-center gap-3">
        {/* 状态指示器 */}
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${scoreColor.replace('text-', 'bg-')}`} />

        {/* 时间 */}
        <span className="text-xs font-mono text-[var(--text-secondary)] flex-shrink-0">
          {timeStr}
        </span>

        {/* 方向标签 */}
        <span className="text-xs font-medium px-2 py-0.5 rounded bg-[var(--surface-active)] text-[var(--text-secondary)] flex-shrink-0">
          {directionLabel}
        </span>

        {/* 原文预览 */}
        <span className="flex-1 text-sm text-[var(--text-main)] truncate">
          "{truncate(originalText, 40)}"
        </span>

        {/* 分数/类型标签 */}
        <span className={`text-xs font-medium flex-shrink-0 ${scoreColor}`}>
          {getTypeLabel()}
        </span>
      </div>

      {/* 第二行：用户翻译 */}
      <div className="mt-2 pl-5 flex items-center gap-2">
        <span className="text-xs text-[var(--text-secondary)]">↳ 你的翻译:</span>
        <span className="text-sm text-[var(--text-secondary)] italic truncate flex-1">
          "{truncate(entry.text, 50)}"
        </span>

        {/* 跳转箭头 */}
        <span className="text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <ChevronRightIcon />
        </span>
      </div>
    </div>
  );
};
