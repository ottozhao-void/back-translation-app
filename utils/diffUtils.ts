import { DiffPart, DiffType } from '../types';

/**
 * Splits text into tokens.
 * For Chinese (or mixed), character level is usually preferred for precision.
 * For English, word level is better.
 */
const tokenize = (text: string, mode: 'char' | 'word'): string[] => {
  if (mode === 'char') {
    return text.split('');
  } else {
    // Basic word tokenizer that keeps punctuation as separate tokens if needed, 
    // but for simplicity here we just split by whitespace for English practice.
    // A more robust one would handle punctuation.
    return text.trim().split(/\s+/);
  }
};

/**
 * Computes the diff between a reference string and a user attempt.
 * Returns an array of parts indicating matches, insertions (extra user text), and deletions (missed reference text).
 */
export const computeDiff = (reference: string, attempt: string, mode: 'char' | 'word' = 'word'): DiffPart[] => {
  const refTokens = tokenize(reference, mode);
  const attemptTokens = tokenize(attempt, mode);
  
  const m = refTokens.length;
  const n = attemptTokens.length;

  // DP Matrix
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (refTokens[i - 1] === attemptTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  let i = m;
  let j = n;
  const parts: DiffPart[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && refTokens[i - 1] === attemptTokens[j - 1]) {
      parts.unshift({ type: DiffType.MATCH, value: refTokens[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      // Insertion in attempt (User wrote something extra)
      parts.unshift({ type: DiffType.INSERT, value: attemptTokens[j - 1] });
      j--;
    } else {
      // Deletion from reference (User missed something)
      parts.unshift({ type: DiffType.DELETE, value: refTokens[i - 1] });
      i--;
    }
  }

  // Post-processing to merge adjacent same-type tokens for cleaner display
  // and re-add spaces for word mode
  const merged: DiffPart[] = [];
  let current: DiffPart | null = null;

  parts.forEach((part, idx) => {
    // Add space before value if word mode and not the start (rudimentary spacing reconstruction)
    const val = (mode === 'word' && idx > 0 && part.type === current?.type) ? ' ' + part.value : part.value;
    const spacer = (mode === 'word' && idx > 0 && part.type !== current?.type) ? ' ' : '';
    
    // If we just switched types and need a space visually
    const displayValue = spacer + part.value;

    if (!current) {
      current = { type: part.type, value: part.value };
    } else if (current.type === part.type) {
      // For word mode, we lost spaces during tokenization, assume single space join
      const joiner = mode === 'word' ? ' ' : '';
      current.value += joiner + part.value;
    } else {
      merged.push(current);
      current = { type: part.type, value: displayValue };
    }
  });
  if (current) merged.push(current);

  return merged;
};
