# Implementation Plan: LLM Translation Feedback Feature

## Context

**Problem**: Currently, the "LLM Feedback" button in the PC practice view only copies a prompt to clipboard, requiring users to manually paste it into an external LLM interface. This breaks the practice flow and provides no integrated feedback experience.

**Goal**: Implement real LLM-based translation review with an in-app slide-up sheet UI, providing instant feedback (score, comments, suggestions) after users submit their translations.

**User Requirements** (from clarification):
- Button appears only **after submit**
- Feedback displayed in **slide-up bottom sheet**
- Feedback is **ephemeral** (not stored)
- Mobile: **Remove Skip button** entirely (swipe to navigate)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Submits Translation                  │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              "AI Feedback" Button Appears                    │
│         (PC: SentencePracticeArea, Mobile: Toolbar)          │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  FeedbackSheet Opens                         │
│              (Loading state with spinner)                    │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              llmService.getTranslationFeedback()             │
│                  POST /api/llm/execute                       │
│               taskType: 'score'                              │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   FeedbackSheet Updates                      │
│        Score (0-100) | Feedback Text | Suggestions           │
└─────────────────────────────────────────────────────────────┘
```

---

## Files to Create

### 1. `components/common/FeedbackSheet.tsx` (NEW)

Reusable slide-up bottom sheet component with glassmorphism styling.

```typescript
interface FeedbackSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  data?: {
    score: number;
    feedback: string;
    suggestions: string[];
  };
  error?: string;
  onRetry: () => void;
}
```

**UI Structure:**
- Backdrop overlay (semi-transparent, click to close)
- Sheet container (slides up from bottom, `backdrop-blur-md`)
- Header: "AI Analysis" title + close button (X)
- Score: Large circular indicator, color-coded:
  - Green (≥80): Excellent
  - Yellow (60-79): Good
  - Red (<60): Needs improvement
- Feedback: Text paragraph explaining the evaluation
- Suggestions: Bulleted list of improvements
- Footer: Close button (or Retry if error)

**Animation:** Use CSS `transform: translateY()` with transition for smooth slide-up effect.

---

## Files to Modify

### 2. `services/llmService.ts`

**Add** helper function for translation feedback:

```typescript
export interface FeedbackResult {
  success: boolean;
  data?: {
    score: number;
    feedback: string;
    suggestions: string[];
  };
  error?: string;
}

export async function getTranslationFeedback(
  original: string,
  reference: string,
  userTranslation: string,
  providerId?: string,
  modelId?: string
): Promise<FeedbackResult>
```

This wraps `executeTask('score', ...)` with proper typing and default provider/model lookup.

---

### 3. `components/sentence-mode/SentencePracticeArea.tsx`

**Changes:**
- Remove `handleLLMFeedback` clipboard logic (lines 140-167)
- Add state: `isFeedbackOpen`, `feedbackData`, `feedbackLoading`, `feedbackError`
- Add `handleGetFeedback` function that calls `llmService.getTranslationFeedback()`
- Replace the "LLM Feedback" button with new "AI Feedback" button
- Render `<FeedbackSheet />` component at the end of the JSX

**Button placement:** Same location (bottom-right of translation card after submit)

---

### 4. `components/mobile/PracticeToolbar.tsx`

**Changes:**
- Add props: `isSubmitted: boolean`, `onFeedback: () => void`
- Remove "Skip" button from the buttons array
- Conditional rendering based on `isSubmitted`:
  - **Before submit:** [Reset] [Submit]
  - **After submit:** [AI Feedback] [Reset] (or just [AI Feedback])

```typescript
interface PracticeToolbarProps {
  onSubmit: () => void;
  onReset: () => void;
  onFeedback: () => void;      // NEW
  isSubmitDisabled: boolean;
  isSubmitted: boolean;         // NEW
}
```

---

### 5. `views/mobile/MobilePractice.tsx`

**Changes:**
- Add state: `isFeedbackOpen`, `feedbackData`, `feedbackLoading`, `feedbackError`
- Add `handleGetFeedback` function (same logic as PC)
- Pass `isSubmitted={isFlipped}` and `onFeedback` to `<PracticeToolbar />`
- Render `<FeedbackSheet />` component

---

## Implementation Steps

### Phase 1: Foundation
1. Create `components/common/FeedbackSheet.tsx` with glassmorphism styles
2. Add `getTranslationFeedback()` helper to `services/llmService.ts`

### Phase 2: PC Integration
3. Refactor `SentencePracticeArea.tsx`:
   - Remove clipboard logic
   - Add feedback state and handler
   - Integrate FeedbackSheet

### Phase 3: Mobile Integration
4. Modify `PracticeToolbar.tsx`:
   - Add new props
   - Remove Skip button
   - Add conditional button rendering

5. Update `MobilePractice.tsx`:
   - Add feedback state and handler
   - Pass props to toolbar
   - Integrate FeedbackSheet

---

## UI Design Notes (Minimalist / Glassmorphism)

```css
/* FeedbackSheet container */
.feedback-sheet {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 1.5rem 1.5rem 0 0;
}

/* Score indicator */
.score-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
}

.score-excellent { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.score-good { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.score-needs-work { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| No LLM provider configured | Show error in sheet: "Please configure an LLM provider in Settings → AI Models" |
| API call fails | Show error with "Retry" button |
| Network error | Show error with "Retry" button |
| Empty response | Show fallback message: "Unable to analyze translation" |

---

## Verification

1. **PC Flow:**
   - Submit a translation → "AI Feedback" button appears
   - Click button → Sheet slides up with loading spinner
   - Response arrives → Score, feedback, suggestions displayed
   - Click close or backdrop → Sheet closes

2. **Mobile Flow:**
   - Submit translation → Toolbar shows "AI Feedback" button (Skip removed)
   - Tap button → Sheet slides up from bottom
   - Same response handling as PC
   - Swipe left/right still works for navigation

3. **Error Cases:**
   - Disable network → Click feedback → Error shown with retry
   - Remove API key → Click feedback → Config error shown

---

## Dependencies

- Existing `score` task in `server/llm/prompts.ts` (no changes needed)
- Existing LLM executor infrastructure
- User must have LLM provider configured in Settings → AI Models
