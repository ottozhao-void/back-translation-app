/**
 * History Utilities
 * 提取、过滤、分组练习历史记录的工具函数
 */

import type {
  SentencePair,
  PracticeHistoryEntry,
  TimeFilterPreset,
} from '../types';

/**
 * 时间预设配置
 * Returns start/end timestamps for each preset filter
 */
export const TIME_PRESETS: Record<TimeFilterPreset, () => { start: number; end: number }> = {
  today: () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { start: start.getTime(), end: Date.now() };
  },
  week: () => {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return { start: start.getTime(), end: Date.now() };
  },
  month: () => {
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    start.setHours(0, 0, 0, 0);
    return { start: start.getTime(), end: Date.now() };
  },
  all: () => ({ start: 0, end: Date.now() }),
};

/**
 * 从所有句子中提取练习历史
 * Extracts all practice history entries from sentence pairs
 */
export function extractAllHistory(sentences: SentencePair[]): PracticeHistoryEntry[] {
  const entries: PracticeHistoryEntry[] = [];

  for (const sentence of sentences) {
    // 提取 EN→ZH 历史 (从 history 数组)
    const zhHistory = sentence.userTranslationZh?.history ?? [];

    for (const record of zhHistory) {
      entries.push({
        id: `${sentence.id}-zh-${record.timestamp}`,
        sentenceId: sentence.id,
        direction: 'en-to-zh',
        timestamp: record.timestamp,
        text: record.text,
        type: record.type,
        score: record.score,
        originalEn: sentence.en,
        originalZh: sentence.zh,
        articleId: sentence.articleId,
      });
    }

    // 也包含当前翻译（如果存在且非草稿）
    if (sentence.userTranslationZh && sentence.userTranslationZh.type !== 'draft') {
      entries.push({
        id: `${sentence.id}-zh-${sentence.userTranslationZh.timestamp}`,
        sentenceId: sentence.id,
        direction: 'en-to-zh',
        timestamp: sentence.userTranslationZh.timestamp,
        text: sentence.userTranslationZh.text,
        type: sentence.userTranslationZh.type,
        score: sentence.userTranslationZh.score,
        originalEn: sentence.en,
        originalZh: sentence.zh,
        articleId: sentence.articleId,
      });
    }

    // 同理提取 ZH→EN 历史
    const enHistory = sentence.userTranslationEn?.history ?? [];

    for (const record of enHistory) {
      entries.push({
        id: `${sentence.id}-en-${record.timestamp}`,
        sentenceId: sentence.id,
        direction: 'zh-to-en',
        timestamp: record.timestamp,
        text: record.text,
        type: record.type,
        score: record.score,
        originalEn: sentence.en,
        originalZh: sentence.zh,
        articleId: sentence.articleId,
      });
    }

    // 也包含当前翻译（如果存在且非草稿）
    if (sentence.userTranslationEn && sentence.userTranslationEn.type !== 'draft') {
      entries.push({
        id: `${sentence.id}-en-${sentence.userTranslationEn.timestamp}`,
        sentenceId: sentence.id,
        direction: 'zh-to-en',
        timestamp: sentence.userTranslationEn.timestamp,
        text: sentence.userTranslationEn.text,
        type: sentence.userTranslationEn.type,
        score: sentence.userTranslationEn.score,
        originalEn: sentence.en,
        originalZh: sentence.zh,
        articleId: sentence.articleId,
      });
    }
  }

  // 去重（基于 id）并按时间倒序排列
  const uniqueEntries = Array.from(
    new Map(entries.map(e => [e.id, e])).values()
  );

  return uniqueEntries.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * 按日期分组历史记录
 * Groups history entries by date for display
 */
export function groupByDate(
  entries: PracticeHistoryEntry[]
): Map<string, PracticeHistoryEntry[]> {
  const groups = new Map<string, PracticeHistoryEntry[]>();

  for (const entry of entries) {
    const dateKey = new Date(entry.timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(entry);
  }

  return groups;
}

/**
 * 过滤历史记录
 * Filters entries by time range
 */
export function filterByTimeRange(
  entries: PracticeHistoryEntry[],
  preset: TimeFilterPreset
): PracticeHistoryEntry[] {
  const range = TIME_PRESETS[preset]();
  return entries.filter(
    (e) => e.timestamp >= range.start && e.timestamp <= range.end
  );
}

/**
 * 格式化时间戳为时间字符串
 * Formats timestamp to HH:MM format
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 获取分数对应的状态颜色
 * Returns color class based on score
 */
export function getScoreColor(type: PracticeHistoryEntry['type'], score?: number): string {
  if (type === 'draft') return 'text-gray-400';
  if (type === 'diff') return 'text-blue-400';

  // LLM mode with score
  if (score === undefined) return 'text-gray-400';
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-red-400';
}

/**
 * 获取方向的显示文本
 * Returns display text for direction
 */
export function getDirectionLabel(direction: PracticeHistoryEntry['direction']): string {
  return direction === 'en-to-zh' ? 'EN→ZH' : 'ZH→EN';
}
