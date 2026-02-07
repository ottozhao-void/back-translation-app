/**
 * HistoryModal - 练习历史面板主组件
 * Main modal for viewing and filtering practice history
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { SentencePair, TimeFilterPreset, HistoryFilterState } from '../../types';
import { usePracticeHistory } from '../../hooks/usePracticeHistory';
import { HistoryFilter } from './HistoryFilter';
import { HistoryList } from './HistoryList';
import { XMarkIcon } from '../Icons';

interface HistoryModalProps {
  sentences: SentencePair[];
  onClose: () => void;
  onNavigateToSentence: (sentenceId: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  sentences,
  onClose,
  onNavigateToSentence,
}) => {
  // 过滤状态，默认显示本周
  const [filter, setFilter] = useState<HistoryFilterState>({ preset: 'week' });

  // 获取过滤后的历史数据
  const { grouped, totalCount } = usePracticeHistory(sentences, filter);

  // 处理时间预设变更
  const handlePresetChange = useCallback((preset: TimeFilterPreset) => {
    setFilter({ preset });
  }, []);

  // 处理跳转到句子
  const handleNavigate = useCallback((sentenceId: string) => {
    onNavigateToSentence(sentenceId);
    onClose();
  }, [onNavigateToSentence, onClose]);

  // 键盘事件处理（Escape 关闭）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* Modal 容器 */}
      <div
        className="relative w-full max-w-4xl h-[80vh] glass-panel rounded-2xl flex flex-col shadow-2xl animate-[float_0.3s_ease-out] overflow-hidden"
        style={{ backgroundColor: 'var(--bg-main)' }}
      >
        {/* 头部 */}
        <div className="h-16 border-b border-[var(--glass-border)] flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
              style={{ color: 'var(--text-main)' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-lg font-medium" style={{ color: 'var(--text-main)' }}>
              练习历史
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--surface-hover)] transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <XMarkIcon />
          </button>
        </div>

        {/* 过滤器 */}
        <HistoryFilter
          currentPreset={filter.preset}
          totalCount={totalCount}
          onPresetChange={handlePresetChange}
        />

        {/* 历史列表（可滚动） */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <HistoryList grouped={grouped} onNavigate={handleNavigate} />
        </div>
      </div>
    </div>
  );
};
