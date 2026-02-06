/**
 * Alignment Helpers - Utility functions for sentence alignment operations
 */

export interface AlignmentPair {
  en: string;
  zh: string;
}

/**
 * Insert an empty gap at the specified index for a specific side
 * This shifts all subsequent items down
 */
export function insertGap(
  pairs: AlignmentPair[],
  index: number,
  side: 'en' | 'zh'
): AlignmentPair[] {
  const result = pairs.map((p) => ({ ...p }));

  if (index < 0 || index > result.length) {
    return result;
  }

  // Insert empty string on the specified side, shift others down
  if (side === 'en') {
    // Insert empty EN at index, all EN values from index onwards shift down
    const newPairs: AlignmentPair[] = [];
    for (let i = 0; i < result.length; i++) {
      if (i === index) {
        newPairs.push({ en: '', zh: result[i].zh });
        newPairs.push({ en: result[i].en, zh: '' });
      } else if (i > index) {
        // Shift: current EN goes with previous ZH slot
        const prevPair = newPairs[newPairs.length - 1];
        if (prevPair && prevPair.zh === '') {
          prevPair.zh = result[i].zh;
          newPairs.push({ en: result[i].en, zh: '' });
        } else {
          newPairs.push({ en: result[i].en, zh: result[i].zh });
        }
      } else {
        newPairs.push({ en: result[i].en, zh: result[i].zh });
      }
    }
    // Clean up trailing empty pair if exists
    if (newPairs.length > 0 && newPairs[newPairs.length - 1].en === '' && newPairs[newPairs.length - 1].zh === '') {
      newPairs.pop();
    }
    return newPairs;
  } else {
    // Insert empty ZH at index
    const newPairs: AlignmentPair[] = [];
    for (let i = 0; i < result.length; i++) {
      if (i === index) {
        newPairs.push({ en: result[i].en, zh: '' });
        newPairs.push({ en: '', zh: result[i].zh });
      } else if (i > index) {
        const prevPair = newPairs[newPairs.length - 1];
        if (prevPair && prevPair.en === '') {
          prevPair.en = result[i].en;
          newPairs.push({ en: '', zh: result[i].zh });
        } else {
          newPairs.push({ en: result[i].en, zh: result[i].zh });
        }
      } else {
        newPairs.push({ en: result[i].en, zh: result[i].zh });
      }
    }
    if (newPairs.length > 0 && newPairs[newPairs.length - 1].en === '' && newPairs[newPairs.length - 1].zh === '') {
      newPairs.pop();
    }
    return newPairs;
  }
}

/**
 * Simpler version: Insert a gap row at index for one side
 * The gap pushes content down on that side only
 */
export function insertGapSimple(
  pairs: AlignmentPair[],
  index: number,
  side: 'en' | 'zh'
): AlignmentPair[] {
  if (index < 0 || index > pairs.length) {
    return pairs;
  }

  // Extract the column we're modifying
  const column = pairs.map((p) => p[side]);
  // Insert empty string at index
  column.splice(index, 0, '');

  // Get the other column
  const otherSide = side === 'en' ? 'zh' : 'en';
  const otherColumn = pairs.map((p) => p[otherSide]);

  // Rebuild pairs with potentially different lengths
  const maxLen = Math.max(column.length, otherColumn.length);
  const result: AlignmentPair[] = [];

  for (let i = 0; i < maxLen; i++) {
    result.push({
      en: side === 'en' ? (column[i] ?? '') : (otherColumn[i] ?? ''),
      zh: side === 'zh' ? (column[i] ?? '') : (otherColumn[i] ?? ''),
    });
  }

  return result;
}

/**
 * Remove a gap (empty cell) at the specified index for a specific side
 * This shifts all subsequent items up
 */
export function removeGap(
  pairs: AlignmentPair[],
  index: number,
  side: 'en' | 'zh'
): AlignmentPair[] {
  if (index < 0 || index >= pairs.length) {
    return pairs;
  }

  // Only allow removing if that cell is empty
  if (pairs[index][side] !== '') {
    return pairs;
  }

  // Extract the column
  const column = pairs.map((p) => p[side]);
  // Remove the empty at index
  column.splice(index, 1);

  // Get the other column
  const otherSide = side === 'en' ? 'zh' : 'en';
  const otherColumn = pairs.map((p) => p[otherSide]);

  // Rebuild pairs
  const maxLen = Math.max(column.length, otherColumn.length);
  const result: AlignmentPair[] = [];

  for (let i = 0; i < maxLen; i++) {
    const en = side === 'en' ? (column[i] ?? '') : (otherColumn[i] ?? '');
    const zh = side === 'zh' ? (column[i] ?? '') : (otherColumn[i] ?? '');
    // Skip completely empty pairs at the end
    if (i === maxLen - 1 && en === '' && zh === '') {
      continue;
    }
    result.push({ en, zh });
  }

  return result;
}

/**
 * Merge the content at index with the row above (index - 1)
 * Combines the text with a space
 */
export function mergeUp(
  pairs: AlignmentPair[],
  index: number,
  side: 'en' | 'zh'
): AlignmentPair[] {
  if (index <= 0 || index >= pairs.length) {
    return pairs;
  }

  // Extract the column
  const column = pairs.map((p) => p[side]);

  // Merge content
  const merged = [column[index - 1], column[index]]
    .filter((s) => s.trim() !== '')
    .join(' ');

  column[index - 1] = merged;
  column.splice(index, 1);

  // Get the other column
  const otherSide = side === 'en' ? 'zh' : 'en';
  const otherColumn = pairs.map((p) => p[otherSide]);

  // Rebuild pairs
  const maxLen = Math.max(column.length, otherColumn.length);
  const result: AlignmentPair[] = [];

  for (let i = 0; i < maxLen; i++) {
    result.push({
      en: side === 'en' ? (column[i] ?? '') : (otherColumn[i] ?? ''),
      zh: side === 'zh' ? (column[i] ?? '') : (otherColumn[i] ?? ''),
    });
  }

  return result;
}

/**
 * Split the content at index into two rows at the specified character position
 */
export function splitAt(
  pairs: AlignmentPair[],
  index: number,
  side: 'en' | 'zh',
  charPosition: number
): AlignmentPair[] {
  if (index < 0 || index >= pairs.length) {
    return pairs;
  }

  const text = pairs[index][side];
  if (charPosition <= 0 || charPosition >= text.length) {
    return pairs;
  }

  // Split the text
  const firstPart = text.substring(0, charPosition).trim();
  const secondPart = text.substring(charPosition).trim();

  // Extract the column
  const column = pairs.map((p) => p[side]);
  column[index] = firstPart;
  column.splice(index + 1, 0, secondPart);

  // Get the other column
  const otherSide = side === 'en' ? 'zh' : 'en';
  const otherColumn = pairs.map((p) => p[otherSide]);

  // Rebuild pairs
  const maxLen = Math.max(column.length, otherColumn.length);
  const result: AlignmentPair[] = [];

  for (let i = 0; i < maxLen; i++) {
    result.push({
      en: side === 'en' ? (column[i] ?? '') : (otherColumn[i] ?? ''),
      zh: side === 'zh' ? (column[i] ?? '') : (otherColumn[i] ?? ''),
    });
  }

  return result;
}

/**
 * Update the text content at a specific index and side
 */
export function updateText(
  pairs: AlignmentPair[],
  index: number,
  side: 'en' | 'zh',
  newText: string
): AlignmentPair[] {
  if (index < 0 || index >= pairs.length) {
    return pairs;
  }

  const result = pairs.map((p, i) => {
    if (i === index) {
      return { ...p, [side]: newText };
    }
    return { ...p };
  });

  return result;
}

/**
 * Remove completely empty pairs from the list
 */
export function cleanEmptyPairs(pairs: AlignmentPair[]): AlignmentPair[] {
  return pairs.filter((p) => p.en.trim() !== '' || p.zh.trim() !== '');
}

/**
 * Get statistics about the alignment
 */
export function getAlignmentStats(pairs: AlignmentPair[]): {
  total: number;
  complete: number;
  enOnly: number;
  zhOnly: number;
  empty: number;
} {
  let complete = 0;
  let enOnly = 0;
  let zhOnly = 0;
  let empty = 0;

  for (const pair of pairs) {
    const hasEn = pair.en.trim() !== '';
    const hasZh = pair.zh.trim() !== '';

    if (hasEn && hasZh) {
      complete++;
    } else if (hasEn) {
      enOnly++;
    } else if (hasZh) {
      zhOnly++;
    } else {
      empty++;
    }
  }

  return {
    total: pairs.length,
    complete,
    enOnly,
    zhOnly,
    empty,
  };
}
