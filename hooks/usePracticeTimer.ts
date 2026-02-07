import { useState, useEffect, useRef, useCallback } from 'react';

export interface UsePracticeTimerReturn {
  elapsed: number;          // Elapsed time in milliseconds
  isRunning: boolean;       // Whether the timer is currently running
  start: () => void;        // Start or resume the timer
  stop: () => number;       // Stop and return final duration
  reset: () => void;        // Reset the timer to zero
  restart: () => void;      // Reset and immediately start (atomic operation)
  formatTime: () => string; // Format elapsed time as "mm:ss"
}

/**
 * Hook for tracking practice session duration
 *
 * @param autoStart - If true, starts timing immediately on mount
 * @returns Timer controls and state
 *
 * @example
 * const { elapsed, isRunning, start, stop, formatTime } = usePracticeTimer(true);
 * // Timer auto-starts, user practices, then:
 * const duration = stop(); // Returns total time in ms
 */
export const usePracticeTimer = (autoStart = false): UsePracticeTimerReturn => {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(autoStart);
  const startTimeRef = useRef<number | null>(autoStart ? Date.now() : null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update elapsed time every 100ms while running
  useEffect(() => {
    if (isRunning && startTimeRef.current) {
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - startTimeRef.current!);
      }, 100);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  const start = useCallback(() => {
    setIsRunning(prev => {
      if (!prev) {
        // Use functional update to avoid stale closure
        startTimeRef.current = Date.now();
        return true;
      }
      return prev;
    });
  }, []);

  const stop = useCallback((): number => {
    let finalElapsed = 0;
    if (startTimeRef.current) {
      finalElapsed = Date.now() - startTimeRef.current;
      setElapsed(finalElapsed);
    }
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return finalElapsed;
  }, []);

  const reset = useCallback(() => {
    setElapsed(0);
    setIsRunning(false);
    startTimeRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Atomic reset + start operation with stable reference
  const restart = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setElapsed(0);
    startTimeRef.current = Date.now();
    setIsRunning(true);
  }, []);

  const formatTime = useCallback((): string => {
    const totalSeconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [elapsed]);

  return {
    elapsed,
    isRunning,
    start,
    stop,
    reset,
    restart,
    formatTime,
  };
};
