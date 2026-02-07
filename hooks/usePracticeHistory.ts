/**
 * usePracticeHistory Hook
 * 管理练习历史数据的提取、过滤和分组
 */

import { useMemo } from 'react';
import type {
  SentencePair,
  PracticeHistoryEntry,
  HistoryFilterState,
} from '../types';
import {
  extractAllHistory,
  filterByTimeRange,
  groupByDate,
} from '../utils/historyUtils';

export interface UsePracticeHistoryResult {
  /** 过滤后的历史记录（按时间倒序） */
  entries: PracticeHistoryEntry[];
  /** 按日期分组的历史记录 */
  grouped: Map<string, PracticeHistoryEntry[]>;
  /** 过滤后的总条目数 */
  totalCount: number;
  /** 所有历史记录总数（用于显示"全部"标签的数字） */
  allCount: number;
}

/**
 * 练习历史 Hook
 * Provides filtered and grouped practice history data
 *
 * @param sentences - All sentence pairs from the store
 * @param filter - Current filter state (preset or custom range)
 * @returns Filtered entries, grouped by date, with counts
 */
export function usePracticeHistory(
  sentences: SentencePair[],
  filter: HistoryFilterState
): UsePracticeHistoryResult {
  return useMemo(() => {
    // 提取所有历史记录
    const all = extractAllHistory(sentences);

    // 根据时间预设过滤
    const filtered = filterByTimeRange(all, filter.preset);

    // 按日期分组
    const grouped = groupByDate(filtered);

    return {
      entries: filtered,
      grouped,
      totalCount: filtered.length,
      allCount: all.length,
    };
  }, [sentences, filter.preset]);
}
