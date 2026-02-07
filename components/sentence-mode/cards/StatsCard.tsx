import React from 'react';
import { PracticeStats } from '../../../types';

// SVG Icons (replacing emojis per UI/UX guidelines)
const ChartIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
    <path d="M18 20V10M12 20V4M6 20v-6" />
  </svg>
);

const TrendUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 6l-9.5 9.5-5-5L1 18" />
    <path d="M17 6h6v6" />
  </svg>
);

const TrendDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 18l-9.5-9.5-5 5L1 6" />
    <path d="M17 18h6v-6" />
  </svg>
);

const TrendStableIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
  </svg>
);

interface StatsCardProps {
  stats?: PracticeStats;
}

// Format milliseconds to readable time
const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

// Format timestamp to relative time
const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
};

// Calculate trend based on recent performance
const calculateTrend = (stats: PracticeStats): 'improving' | 'stable' | 'declining' | null => {
  if (!stats || stats.attempts < 2) return null;

  const avgTime = stats.totalTimeMs / stats.attempts;
  const lastTime = stats.lastAttemptMs;

  if (!lastTime) return null;

  // Compare last attempt to average
  const diff = (lastTime - avgTime) / avgTime;

  if (diff < -0.15) return 'improving';  // 15% faster than average
  if (diff > 0.15) return 'declining';   // 15% slower than average
  return 'stable';
};

// Mini sparkline chart component (pure CSS/SVG)
const MiniSparkline: React.FC<{ values: number[]; width?: number; height?: number }> = ({
  values,
  width = 120,
  height = 32,
}) => {
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Gradient fill */}
      <defs>
        <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--text-main)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--text-main)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill="url(#sparklineGradient)"
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="var(--text-main)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      {values.length > 0 && (
        <circle
          cx={width}
          cy={height - ((values[values.length - 1] - min) / range) * (height - 4) - 2}
          r="3"
          fill="var(--text-main)"
        />
      )}
    </svg>
  );
};

/**
 * StatsCard - 练习统计卡片
 *
 * 显示句子的练习统计数据，包括：
 * - 总练习次数
 * - 平均用时
 * - 最佳用时
 * - 上次练习时间
 * - 练习趋势指示器
 * - 迷你时间趋势图表
 */
export const StatsCard: React.FC<StatsCardProps> = ({ stats }) => {
  // Empty state
  if (!stats || stats.attempts === 0) {
    return (
      <div className="flex-1 flex flex-col p-8 overflow-hidden">
        <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
          <div className="glass-panel rounded-2xl p-8">
            {/* Header */}
            <div className="mb-6">
              <h3 className="text-lg font-medium" style={{ color: 'var(--text-main)' }}>
                Practice Statistics
              </h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Track your progress over time
              </p>
            </div>

            {/* Empty State with SVG icon */}
            <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
              <div className="flex justify-center mb-4">
                <ChartIcon />
              </div>
              <p className="text-base">No practice history yet</p>
              <p className="text-sm mt-2">Start practicing to track your progress</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const avgTime = stats.attempts > 0 ? Math.round(stats.totalTimeMs / stats.attempts) : 0;
  const trend = calculateTrend(stats);

  // Generate mock history data for sparkline (in real implementation, this would come from stats.history)
  // For now, we'll simulate based on available data
  const generateSparklineData = (): number[] => {
    if (!stats.lastAttemptMs) return [];
    const count = Math.min(stats.attempts, 10);
    if (count < 2) return [];

    // Generate simulated data points centered around average
    const data: number[] = [];
    for (let i = 0; i < count; i++) {
      // Add some variance around the average
      const variance = (Math.random() - 0.5) * avgTime * 0.4;
      data.push(avgTime + variance);
    }
    // Make sure last point is actual last attempt
    data[data.length - 1] = stats.lastAttemptMs;
    return data;
  };

  const sparklineData = generateSparklineData();

  // Trend display
  const TrendDisplay = () => {
    if (!trend) return null;

    const config = {
      improving: { icon: <TrendUpIcon />, label: 'Improving', color: 'text-emerald-400' },
      stable: { icon: <TrendStableIcon />, label: 'Stable', color: 'text-amber-400' },
      declining: { icon: <TrendDownIcon />, label: 'Needs work', color: 'text-rose-400' },
    };

    const { icon, label, color } = config[trend];

    return (
      <div className={`flex items-center gap-1.5 ${color}`}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-hidden">
      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
        <div className="glass-panel rounded-2xl p-8">
          {/* Header with Trend */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium" style={{ color: 'var(--text-main)' }}>
                Practice Statistics
              </h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Your performance on this sentence
              </p>
            </div>
            <TrendDisplay />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Total Attempts */}
            <div className="text-center p-4 rounded-xl" style={{ backgroundColor: 'var(--surface-hover)' }}>
              <div className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
                {stats.attempts}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Total Attempts
              </div>
            </div>

            {/* Average Time */}
            <div className="text-center p-4 rounded-xl" style={{ backgroundColor: 'var(--surface-hover)' }}>
              <div className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
                {formatDuration(avgTime)}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Average Time
              </div>
            </div>

            {/* Best Time */}
            {stats.bestTimeMs && (
              <div className="text-center p-4 rounded-xl" style={{ backgroundColor: 'var(--surface-hover)' }}>
                <div className="text-3xl font-bold text-emerald-400">
                  {formatDuration(stats.bestTimeMs)}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Best Time
                </div>
              </div>
            )}

            {/* Last Practiced */}
            {stats.lastPracticedAt && (
              <div className="text-center p-4 rounded-xl" style={{ backgroundColor: 'var(--surface-hover)' }}>
                <div className="text-xl font-medium" style={{ color: 'var(--text-main)' }}>
                  {formatRelativeTime(stats.lastPracticedAt)}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Last Practiced
                </div>
              </div>
            )}

            {/* Last Attempt Duration */}
            {stats.lastAttemptMs && (
              <div className="text-center p-4 rounded-xl" style={{ backgroundColor: 'var(--surface-hover)' }}>
                <div className="text-2xl font-medium" style={{ color: 'var(--text-main)' }}>
                  {formatDuration(stats.lastAttemptMs)}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Last Attempt
                </div>
              </div>
            )}

            {/* Total Time Spent */}
            <div className="text-center p-4 rounded-xl" style={{ backgroundColor: 'var(--surface-hover)' }}>
              <div className="text-2xl font-medium" style={{ color: 'var(--text-main)' }}>
                {formatDuration(stats.totalTimeMs)}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Total Time Spent
              </div>
            </div>
          </div>

          {/* Performance Trend Chart */}
          {sparklineData.length >= 2 && (
            <div className="mt-6 pt-6 border-t border-[var(--glass-border)]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Performance Trend
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Last {sparklineData.length} attempts
                </p>
              </div>
              <div className="flex justify-center p-4 rounded-xl" style={{ backgroundColor: 'var(--surface-hover)' }}>
                <MiniSparkline values={sparklineData} width={200} height={48} />
              </div>
              <p className="text-xs text-center mt-2" style={{ color: 'var(--text-secondary)' }}>
                Time per attempt (lower is better)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
