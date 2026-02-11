# Implementation Plan: Interactive Mode Toolbar Enhancement

## Context

When users enter the "word selection mode" (单词点选模式) by clicking the Magic Analyze button, the toolbar actions should change to reflect the available operations for that mode. Currently, the toolbar shows `Edit` and `AI Analysis` buttons, but in interactive mode, users need different tools: `Clear cache` to remove analysis data and `Regenerate` to re-run the AI analysis.

## Current Behavior

In [SentenceInfoCard.tsx](components/sentence-mode/cards/SentenceInfoCard.tsx#L394-L433):
- **Normal mode**: Shows Edit (pencil) and Magic Analyze (wand) buttons
- **Interactive mode**: Still shows the same buttons (Magic Analyze turns yellow)

## Desired Behavior

- **Normal mode**: Edit + Magic Analyze buttons
- **Interactive mode**: Clear cache + Regenerate + Magic Analyze (yellow) buttons

The Edit button should be hidden when in interactive mode, replaced by Clear cache and Regenerate buttons.

## Implementation Details

### File to Modify

**[components/sentence-mode/cards/SentenceInfoCard.tsx](components/sentence-mode/cards/SentenceInfoCard.tsx)**

### Changes Required

#### 1. Add Icon Imports (Line 3)

Add `TrashIcon` and `RefreshIcon` to the existing Icons import:

```typescript
import { SpeakerIcon, PencilIcon, MagicWandIcon, TrashIcon, RefreshIcon } from '../../Icons';
```

#### 2. Add `handleClearAnalysis` Handler (After line 245)

```typescript
const handleClearAnalysis = useCallback(() => {
  // Remove analysis from sentence (persist)
  if (onUpdateSentence) {
    onUpdateSentence(sentence.id, { analysis: undefined });
  }

  // Reset local state
  setAnalysisState({ status: 'none' });
  setIsInteractiveMode(false);
  setSelectedUnit(null);
  setHoveredPatternId(null);
}, [sentence.id, onUpdateSentence]);
```

#### 3. Add `handleRegenerateAnalysis` Handler (After `handleClearAnalysis`)

```typescript
const handleRegenerateAnalysis = useCallback(async () => {
  setAnalysisState({ status: 'loading' });

  const result = await analyzeSentence(sentence.en, sentence.zh);

  if (result.success && result.data) {
    const analysis: SentenceAnalysis = {
      tokens: result.data.tokens,
      chunks: result.data.chunks,
      patterns: result.data.patterns,
    };
    setAnalysisState({ status: 'completed', data: analysis });
    setIsInteractiveMode(true);

    // Persist to sentence
    if (onUpdateSentence) {
      onUpdateSentence(sentence.id, { analysis });
    }
  } else {
    setAnalysisState({
      status: 'error',
      error: result.error || 'Analysis failed'
    });
  }
}, [sentence.en, sentence.zh, sentence.id, onUpdateSentence]);
```

#### 4. Replace Toolbar JSX (Lines 394-433)

Replace the existing toolbar button structure with conditional rendering:

```tsx
<div className="flex items-center gap-2">
  {/* Normal mode: Show Edit button */}
  {!isInteractiveMode && onUpdateSentence && (
    <button
      onClick={() => {
        setSelection(null);
        setEditingField(sourceField as 'en' | 'zh');
      }}
      className="p-1 hover:opacity-80 transition-opacity hover:bg-[var(--surface-hover)] rounded-lg cursor-pointer"
      style={{ color: 'var(--text-secondary)' }}
      title={`Edit ${sourceLabel} text`}
    >
      <PencilIcon />
    </button>
  )}

  {/* Interactive mode: Show Clear cache and Regenerate buttons */}
  {isInteractiveMode && onUpdateSentence && (
    <>
      <button
        onClick={handleClearAnalysis}
        disabled={analysisState.status === 'loading'}
        className="p-1 hover:opacity-80 transition-opacity hover:bg-[var(--surface-hover)] rounded-lg disabled:opacity-50 cursor-pointer"
        style={{ color: 'var(--text-secondary)' }}
        title="Clear analysis cache"
      >
        <TrashIcon />
      </button>

      <button
        onClick={handleRegenerateAnalysis}
        disabled={analysisState.status === 'loading'}
        className="p-1 hover:opacity-80 transition-opacity hover:bg-[var(--surface-hover)] rounded-lg disabled:opacity-50 cursor-pointer"
        style={{ color: 'var(--text-secondary)' }}
        title="Regenerate analysis"
      >
        <RefreshIcon />
      </button>
    </>
  )}

  {/* Magic Analyze button - always shown when applicable */}
  {isEnToZh && onUpdateSentence && (
    <button
      onClick={handleMagicAnalyze}
      disabled={analysisState.status === 'loading'}
      className="p-1 rounded-lg transition-all hover:scale-110 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
      style={{
        color: isInteractiveMode
          ? 'var(--accent-yellow, #FBBF24)'
          : analysisState.status === 'completed'
            ? 'var(--accent-yellow, #FBBF24)'
            : 'var(--text-secondary)',
      }}
      title={
        isInteractiveMode ? 'Exit interactive mode' :
        analysisState.status === 'completed' ? 'Enter interactive mode - click words to add vocabulary' :
        analysisState.status === 'loading' ? 'Analyzing...' :
        'AI Analyze - Click to find vocabulary'
      }
    >
      <MagicWandIcon />
    </button>
  )}
</div>
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Interaction Flow                        │
└─────────────────────────────────────────────────────────────────┘

NORMAL MODE (isInteractiveMode = false)
  Toolbar: [Edit] [Magic Analyze]
  │
  ├─ Edit → Opens TextEditModal
  └─ Magic Analyze → Enters interactive mode

INTERACTIVE MODE (isInteractiveMode = true)
  Toolbar: [Clear cache] [Regenerate] [Magic Analyze: yellow]
  │
  ├─ Clear cache → Removes analysis, exits interactive mode
  ├─ Regenerate → Re-runs AI analysis, stays in interactive mode
  └─ Magic Analyze → Exits interactive mode
```

## Verification Steps

1. **Normal Mode Verification**
   - [ ] View a sentence in EN→ZH mode
   - [ ] Verify Edit button (pencil) is visible
   - [ ] Verify Magic Analyze button (wand) is visible and gray

2. **Enter Interactive Mode**
   - [ ] Click Magic Analyze button
   - [ ] Verify sentence text becomes clickable (blue words)
   - [ ] Verify toolbar changes: Edit button hidden, Clear cache and Regenerate buttons visible
   - [ ] Verify Magic Analyze button turns yellow

3. **Clear Cache Function**
   - [ ] Click Clear cache button (trash icon)
   - [ ] Verify analysis is removed (sentence no longer clickable)
   - [ ] Verify toolbar returns to normal state (Edit button visible)
   - [ ] Verify Magic Analyze button returns to gray

4. **Regenerate Function**
   - [ ] Enter interactive mode
   - [ ] Click Regenerate button (refresh icon)
   - [ ] Verify "Analyzing..." status appears
   - [ ] Verify analysis completes and interactive mode stays active
   - [ ] Verify clicking words still works

5. **Edge Cases**
   - [ ] Verify buttons are disabled during loading state
   - [ ] Verify tooltips display correctly on hover
   - [ ] Test with LLM error (regenerate should handle error gracefully)

## Summary

- **Files to modify**: 1 ([SentenceInfoCard.tsx](components/sentence-mode/cards/SentenceInfoCard.tsx))
- **New dependencies**: None (TrashIcon and RefreshIcon already exist)
- **Lines of code**: ~60 added/modified
- **Breaking changes**: None
