import { PracticeStats } from '../types';

/**
 * Calculate updated practice statistics after a practice attempt
 *
 * @param existingStats - Current stats (or undefined for first attempt)
 * @param durationMs - Duration of the attempt in milliseconds
 * @param now - Current timestamp (defaults to Date.now())
 * @returns Updated PracticeStats object
 */
export const calculatePracticeStats = (
  existingStats: PracticeStats | undefined,
  durationMs: number,
  now: number = Date.now()
): PracticeStats => {
  const current = existingStats || { attempts: 0, totalTimeMs: 0 };

  return {
    attempts: (current.attempts || 0) + 1,
    totalTimeMs: (current.totalTimeMs || 0) + durationMs,
    lastAttemptMs: durationMs,
    lastPracticedAt: now,
    bestTimeMs: current.bestTimeMs
      ? Math.min(current.bestTimeMs, durationMs)
      : durationMs,
  };
};
