# Plan: Tap-to-Define Word Lookup

**TL;DR**: Make words in the source text card clickable during practice sessions. Tapping a word triggers a lightweight LLM call that returns its general meaning and contextual meaning within the current sentence. The result appears in a minimalist inline tooltip near the clicked word. Applies to both desktop (`SentencePracticeArea`) and mobile (`SwipeCard`). English words are split by spaces; Chinese characters are clickable individually, with the LLM identifying the full word/phrase. Results are cached per session to avoid redundant LLM calls.

---

## Steps

### 1. Add `define-word` LLM task type

**File**: [types.ts](types.ts#L248)

- Add `'define-word'` to the `LLMTaskType` union type, after `'analyze-sentence'`

**File**: [types.ts](types.ts#L306)

- The `TaskModelConfig` mapping uses `LLMTaskType` as keys, so this auto-extends

### 2. Add `define-word` prompt config

**File**: [server/llm/prompts.ts](server/llm/prompts.ts)

- Add a new entry `'define-word'` to `TASK_PROMPTS` with:
  - **systemPrompt**: Concise bilingual dictionary prompt. Given a word/character and its sentence context + language, return:
    - `general`: Brief general meaning (1 line, bilingual — Chinese for En words, English for Zh words)
    - `contextual`: What it means specifically in this sentence (1 line, bilingual)
  - **buildUserMessage**: Takes `{ word, sentence, language }` — formats as "Word: X / Sentence: Y / Language: Z"
  - **parseResponse**: Extracts `{ general: string, contextual: string }`
  - **Key design**: Prompt should encourage SHORT responses (under 50 words total) for speed and minimal UI

### 3. Add `define-word` task metadata for settings UI

**File**: [components/settings/llm/taskMetadata.ts](components/settings/llm/taskMetadata.ts)

- Add `'define-word'` to `TASK_DEFINITIONS` with:
  - `label`: "Word Definition"
  - `description`: "Quick word meaning lookup during practice"
  - `category`: `'learning'`
- No default params override needed (default temperature/tokens are fine)

### 4. Add frontend convenience method `defineWord()`

**File**: [services/llmService.ts](services/llmService.ts)

- Add `DefineWordResult` interface: `{ success, data?: { general: string, contextual: string }, error? }`
- Add `defineWord(word, sentence, language, providerId?, modelId?)` function following the pattern of `enrichVocabulary()`:
  1. Resolve provider/model from config (`taskModels['define-word']` → fallback to default)
  2. Call `executeTask<{ general, contextual }>('define-word', ...)`
  3. Return typed result
- No fallback (unlike segmentation) — if no LLM configured, return error message

### 5. Create `ClickableText` component

**New file**: `components/practice-area/ClickableText.tsx`

A reusable component that renders text with individually clickable words.

**Props**:
- `text: string` — the source text
- `language: 'en' | 'zh'` — determines tokenization strategy
- `onWordClick: (word: string, rect: DOMRect) => void` — callback with clicked word text and bounding rect for positioning
- `className?: string` — pass through styling
- `style?: React.CSSProperties`

**Tokenization logic**:
- **English**: Split by regex `/(\s+)/` to preserve spaces, then each non-space token becomes a clickable `<span>`. Strip surrounding punctuation from the word passed to callback but keep punctuation in display.
- **Chinese**: Each character wrapped in a `<span>`. On click, pass the character + position. Punctuation characters (，。！？；：""''、) are not clickable.

**Behavior**:
- Each word `<span>` has:
  - `cursor-pointer` on hover
  - Subtle underline-on-hover (dashed, very light color) to indicate clickability
  - `onClick` handler that calls `onWordClick(cleanWord, spanElement.getBoundingClientRect())`
  - `e.stopPropagation()` to prevent card flip
- No visible permanent styling change — words look like normal text until hovered

### 6. Create `WordDefinitionTooltip` component

**New file**: `components/practice-area/WordDefinitionTooltip.tsx`

A minimalist floating tooltip that appears near the clicked word.

**Props**:
- `word: string` — the clicked word
- `anchorRect: DOMRect` — position of clicked word for tooltip placement
- `isLoading: boolean`
- `data?: { general: string; contextual: string }` — definition data
- `error?: string`
- `onClose: () => void`

**Positioning**:
- Use a portal (`createPortal`) to render at document body level
- Position below the word by default; flip above if near bottom of viewport
- Center horizontally on the word
- Max width: 280px desktop, 240px mobile

**Visual design** (极简):
- Small glassmorphism card: `bg-[var(--glass-bg)]`, `backdrop-blur-lg`, `border: 1px solid var(--glass-border)`, `rounded-xl`
- **Loading**: Single small spinner + "..." text, very compact
- **Success**: 
  - Word displayed in bold at top
  - "General:" label (tiny, muted) → meaning text
  - "In context:" label (tiny, muted) → contextual meaning text
  - Font size: 13px body text
  - Total height: ~80-120px
- **Error**: Brief "Failed to look up" message
- Subtle entry animation: `opacity 0→1` + `translateY(4px→0)` over 150ms
- Shadow: `shadow-lg`

**Dismissal**:
- Click outside → close
- Press Escape → close
- Click another word → close current, open new one
- Scroll → close

### 7. Create `useWordDefinition` hook

**New file**: `hooks/useWordDefinition.ts`

Manages the word definition state and session cache.

**State**:
- `selectedWord: { word: string, rect: DOMRect } | null`
- `isLoading: boolean`
- `definition: { general: string, contextual: string } | null`
- `error: string | null`
- `cache: Map<string, { general: string, contextual: string }>` (stored in ref, persists across re-renders)

**Cache key**: `${word.toLowerCase()}::${sentence}` — so same word in different sentences gets different contextual meanings

**Methods**:
- `lookupWord(word, sentence, language, rect)`:
  1. Set `selectedWord`
  2. Check cache → if hit, set `definition` immediately, skip LLM
  3. If miss: set `isLoading=true`, call `defineWord()`, store result in cache, set state
- `dismiss()`: Reset all state (keep cache)

### 8. Integrate into `SentencePracticeArea` (Desktop)

**File**: [components/sentence-mode/SentencePracticeArea.tsx](components/sentence-mode/SentencePracticeArea.tsx)

Changes:
1. Import `ClickableText`, `WordDefinitionTooltip`, `useWordDefinition`
2. Replace the plain `<p>{sourceText}</p>` on the **front face** of the card (~line 213) with:
   ```
   <ClickableText text={sourceText} language={...} onWordClick={handleWordClick} />
   ```
3. Add `useWordDefinition()` hook at component level
4. `handleWordClick`: calls `lookupWord(word, sourceText, language, rect)`
5. Render `<WordDefinitionTooltip>` conditionally when `selectedWord` is set
6. On card flip or sentence change: call `dismiss()`
7. **Important**: `ClickableText`'s `onWordClick` calls `e.stopPropagation()` so the card flip handler doesn't fire

Language determination: `practiceMode === 'EN_TO_ZH' ? 'en' : 'zh'`

### 9. Integrate into `SwipeCard` (Mobile)

**File**: [components/mobile/SwipeCard.tsx](components/mobile/SwipeCard.tsx)

Changes:
1. Add new props: `onWordClick?: (word: string, rect: DOMRect) => void`
2. Replace the plain `<p>{frontText}</p>` on the front face with `<ClickableText>`:
   - Pass `onWordClick` prop through
   - Determine language from `lang` prop
3. In `ClickableText` click handler, `e.stopPropagation()` prevents the flip

**File**: [views/mobile/MobilePractice.tsx](views/mobile/MobilePractice.tsx)

1. Add `useWordDefinition()` hook
2. Pass `onWordClick` callback to `SwipeCard`
3. Render `WordDefinitionTooltip` at the view level
4. Dismiss on card flip / sentence change

### 10. Mirror API route if needed

**Check**: The `POST /api/llm/execute` endpoint already handles any task type from `TASK_PROMPTS` dynamically. Since we only added a new entry to the prompts registry, **no changes needed** in [server/llm/index.ts](server/llm/index.ts) or [server/llm/executor.ts](server/llm/executor.ts) — the executor dispatches by task type string to the prompts registry. Same for [vite.config.ts](vite.config.ts) middleware.

---

## Verification

1. **Unit test**: Click a word in English mode → tooltip appears with loading → definitions show
2. **Unit test**: Click a word in Chinese mode → tooltip appears → LLM returns full word + meanings
3. **Cache test**: Click same word twice → second click is instant (no loading state)
4. **Interaction test**: Word click does NOT flip the card (both desktop and mobile)
5. **Dismiss test**: Escape, click outside, scroll, card flip all dismiss tooltip
6. **No LLM configured**: Click word → tooltip shows "No LLM provider configured" error
7. **Mobile**: Tap word on SwipeCard front face → tooltip appears correctly positioned, doesn't interfere with swipe gestures
8. **Visual**: Tooltip is glassmorphism-styled, max 280px wide, brief text, appears/disappears with 150ms animation

**Manual checks**:
```bash
npm run dev
# Navigate to practice mode
# Click/tap words in English and Chinese source text
# Verify tooltip positioning, content, caching, dismissal
```

---

## Decisions

- **New task type `define-word`** over reusing `enrich-vocab`: The existing `enrich-vocab` returns heavyweight data (full definition + multiple example sentences), too slow for a quick lookup. `define-word` is optimized for speed with a prompt that encourages 2-line responses.
- **Inline tooltip** over bottom sheet or modal: Matches the "极简" (minimalist) requirement — content appears right where the user's attention is, minimal cognitive load.
- **English space-split + Chinese per-character**: Simplest tokenization that works for both languages. The LLM handles Chinese word boundary detection (e.g., user clicks "经" in "经济", LLM understands the full word "经济").
- **Session-level cache** with `word::sentence` key: Same word has different contextual meanings in different sentences, so caching is per word-sentence pair. Cache lives in a ref, survives re-renders but resets on page reload.
- **No API route changes**: The executor already dispatches dynamically by task type string to `TASK_PROMPTS`, so adding a new prompt entry is sufficient.
- **Portal-based tooltip**: Avoids z-index/overflow clipping issues inside the flippable card container.
