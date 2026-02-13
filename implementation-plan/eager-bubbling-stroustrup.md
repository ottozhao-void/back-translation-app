# Implementation Plan: Fix Timer Issue When Navigating via SentenceNavBar

## Context

When users navigate to the next/previous sentence using the SentenceNavBar while in practice mode, the timer displays "00:00" but does not start counting (stays at 00:00).

## Root Cause Analysis

After thorough analysis, the issue is a **stale closure + dependency bug** in the `useEffect` that sets up the interval in `usePracticeTimer.ts`:

### The Bug Location: `hooks/usePracticeTimer.ts` lines 31-44

```typescript
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
}, [isRunning]);  // ← Only depends on isRunning
```

### The Problem

1. `SentencePracticeArea` renders **without a key**, so it persists across sentence navigations
2. The `usePracticeTimer` hook's state also persists
3. When navigating to a new sentence, `restartTimer()` is called
4. `restart()` calls `setIsRunning(true)` which triggers the `useEffect`
5. **BUT**: The `useEffect` cleanup runs first, clearing the interval
6. Then the effect runs again, setting up a new interval
7. **However**: The `intervalRef` is cleared in cleanup, but the effect's closure may have a stale reference

### Additional Issue: Missing Dependency

The `useEffect` cleanup depends on `intervalRef.current`, but this is a mutable ref that changes outside the render cycle. React's `useEffect` cleanup captures the value at the time the effect was set up, not the current value.

### Yet Another Issue: The `restart()` function

```typescript
const restart = useCallback(() => {
  if (intervalRef.current) {  // ← Reads intervalRef
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }
  setElapsed(0);
  startTimeRef.current = Date.now();
  setIsRunning(true);
}, []);
```

The `restart()` function is stable (no dependencies), but when it reads `intervalRef.current`, it's reading a mutable ref that may be in an inconsistent state.

### The Actual Bug: Race Condition

The real issue is more subtle:

1. When `restart()` is called:
   - It clears any existing interval
   - Sets `startTimeRef.current = Date.now()`
   - Calls `setIsRunning(true)`

2. The `useEffect` cleanup runs (because `isRunning` changes):
   - Clears the interval again (defensive but OK)
   - Returns

3. The `useEffect` effect runs again:
   - Checks `if (isRunning && startTimeRef.current)`
   - Both should be true at this point
   - Sets up new interval

**But here's the problem**: The `intervalRef` is set to `null` in the cleanup, but then the effect tries to set `intervalRef.current = setInterval(...)`. If there's a timing issue or if the effect runs twice rapidly, we end up with no interval.

## Solution

**Fix the interval setup/cleanup logic to be idempotent and handle rapid restarts:**

### Implementation: `hooks/usePracticeTimer.ts`

**Change 1**: Store the interval ID directly in a ref, and ensure cleanup is complete

**Change 2**: Make the `useEffect` cleanup more defensive - only clear if it exists

**Change 3 (Most Important)**: Add a ref to track the interval ID separately from the ref used in the effect, ensuring no race conditions

Actually, simpler fix: **Use a single ref for interval and ensure the effect cleanup is idempotent:**

```typescript
useEffect(() => {
  if (isRunning && startTimeRef.current) {
    // Clear any existing interval first (defensive)
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    // Set up new interval
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current!);
    }, 100);
  } else {
    // Not running - ensure interval is cleared
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
}, [isRunning]);
```

Wait, this still has the same issue. Let me think more carefully...

### The Real Fix

The issue is that `restart()` is calling `clearInterval` AND then the effect's cleanup also calls `clearInterval`. The problem is:

```typescript
const restart = useCallback(() => {
  if (intervalRef.current) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;  // ← Set to null
  }
  // ...
  setIsRunning(true);  // ← This triggers effect cleanup
}, []);
```

When `setIsRunning(true)` triggers the effect cleanup:
1. Effect cleanup runs
2. It tries to clear `intervalRef.current` - but it's already null!
3. Effect runs again, sets up new interval

This should work... unless there's a different issue.

### Alternative Root Cause: `useEffect` Dependency Order

Actually, I think the issue might be that when `isRunning` changes from `false` to `true`:
1. The `useEffect` with `[isRunning]` dependency runs
2. But if `isRunning` was already `true` (e.g., user was practicing, navigated, still in practice mode), then the effect doesn't re-run!

**THIS IS IT!**

When the user navigates while in practice mode:
- `isRunning` is already `true`
- `restart()` is called
- `setIsRunning(true)` is called, but since `isRunning` is already `true`, **the effect doesn't re-run**
- The interval from the previous sentence is still running, but with the OLD `startTimeRef.current`!
- So the timer shows incorrect values

### The Fix

**Option A**: Always clear and reset the interval in `restart()`, and make sure the effect re-runs

**Option B (Simpler)**: In `restart()`, after setting state, directly set up the interval instead of relying on the effect:

```typescript
const restart = useCallback(() => {
  // Clear existing interval
  if (intervalRef.current) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  // Reset state
  setElapsed(0);
  startTimeRef.current = Date.now();
  setIsRunning(true);

  // Directly set up the new interval (don't rely on effect)
  intervalRef.current = setInterval(() => {
    setElapsed(Date.now() - startTimeRef.current!);
  }, 100);
}, []);
```

But this conflicts with the effect's cleanup...

**Option C (Best)**: Add a `forceUpdate` ref or use a different approach:

```typescript
// Add a counter ref to force effect re-run
const restartCounterRef = useRef(0);

const restart = useCallback(() => {
  if (intervalRef.current) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }
  setElapsed(0);
  startTimeRef.current = Date.now();
  setIsRunning(true);
  restartCounterRef.current += 1;  // Force re-run
}, []);
```

Then add `restartCounterRef.current` to the effect dependency... but that doesn't work with refs.

**Option D (Actual Best Fix)**: Move interval setup into `restart()` directly and let the effect only handle the `start()` case:

Change the approach:
- `useEffect` only sets up interval when initially started via `start()`
- `restart()` directly manages the interval
- This avoids the dependency issue entirely

## Final Solution

**File: `hooks/usePracticeTimer.ts`**

Modify the hook so that `restart()` directly sets up the interval, and the `useEffect` is only for initial state changes:

```typescript
const restart = useCallback(() => {
  // Clear any existing interval
  if (intervalRef.current) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  // Reset and start
  setElapsed(0);
  startTimeRef.current = Date.now();
  setIsRunning(true);

  // Immediately set up the interval
  intervalRef.current = setInterval(() => {
    setElapsed(Date.now() - startTimeRef.current!);
  }, 100);
}, []);
```

And update the `useEffect` to NOT set up an interval when `isRunning` becomes true (since `restart()` already does):

```typescript
useEffect(() => {
  // Only handle cleanup on unmount or when explicitly stopped
  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
}, []);  // Empty deps - only cleanup on unmount
```

Wait, this breaks the `start()` function...

**Better approach**: Add a flag to track whether interval was manually set up:

```typescript
const manuallyStartedRef = useRef(false);

const restart = useCallback(() => {
  if (intervalRef.current) {
    clearInterval(intervalRef.current);
  }
  setElapsed(0);
  startTimeRef.current = Date.now();
  setIsRunning(true);
  manuallyStartedRef.current = true;

  intervalRef.current = setInterval(() => {
    setElapsed(Date.now() - startTimeRef.current!);
  }, 100);
}, []);
```

And in the effect:

```typescript
useEffect(() => {
  // Only auto-start via effect if not manually started
  if (isRunning && !manuallyStartedRef.current && startTimeRef.current) {
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current!);
    }, 100);
  }

  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!isRunning) {
      manuallyStartedRef.current = false;
    }
  };
}, [isRunning]);
```

This ensures:
- `start()` uses the effect to set up the interval
- `restart()` directly sets up the interval and bypasses the effect
- Cleanup still works

## Files to Modify
- `hooks/usePracticeTimer.ts` - Add `manuallyStartedRef` and modify `restart()` function

## Verification
1. Start a practice session on sentence A
2. Submit translation (timer stops)
3. Click Next to navigate to sentence B
4. Verify timer shows 00:00 and starts counting
5. Submit translation on sentence B
6. Click Next to navigate to sentence C
7. Verify timer shows 00:00 and starts counting
8. Repeat several times to ensure no regression
