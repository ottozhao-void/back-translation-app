/**
 * HistoryFilter - 时间过滤按钮组
 * Provides preset time filters for practice history
 */

import React from 'react';
import type { TimeFilterPreset } from '../../types';

interface HistoryFilterProps {
  currentPreset: TimeFilterPreset;
  totalCount: number;
  onPresetChange: (preset: TimeFilterPreset) => void;
}

const PRESET_LABELS: Record<TimeFilterPreset, string> = {
  today: '今天',
  week: '本周',
  month: '本月',
  all: '全部',
};

export const HistoryFilter: React.FC<HistoryFilterProps> = ({
  currentPreset,
  totalCount,
  onPresetChange,
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)]">
      {/* 过滤按钮组 */}
      <div className="flex gap-2">
        {(Object.keys(PRESET_LABELS) as TimeFilterPreset[]).map((preset) => (
          <button
            key={preset}
            onClick={() => onPresetChange(preset)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentPreset === preset
                ? 'bg-[var(--surface-active)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            {PRESET_LABELS[preset]}
          </button>
        ))}
      </div>

      {/* 总数显示 */}
      <span className="text-sm text-[var(--text-secondary)]">
        共 <span className="font-medium text-[var(--text-main)]">{totalCount}</span> 条记录
      </span>
    </div>
  );
};
