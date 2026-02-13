## Plan: Sentence Navigation Bar

A minimalist bottom navigation bar for the desktop practice/detail interface, enabling quick prev/next traversal through the currently filtered sentence list. The bar reflects the same ordering as the sidebar: flat (newest-first), article drill-down (paragraph+sentence order), paragraph drill-down, or tag filter.

**TL;DR**: Extract the sidebar's `displayedSentences` filtering logic into a shared utility. SentenceMode computes the filtered list and current index. A new ultra-minimal `SentenceNavBar` component renders at the bottom of the content area with prev/next arrows and a position indicator. Keyboard shortcuts (`ArrowLeft`/`ArrowRight`) are wired up when no text input is focused.

---

### Steps

**1. Extract filtering logic into shared utility**

Create `utils/sentenceFilters.ts`:
- Export a pure function `getFilteredSentences(sentences: SentencePair[], contextFilter: ContextFilter | null): SentencePair[]` that replicates the exact filtering + sorting from the `displayedSentences` memo in SentenceSidebar.tsx:
  - No filter → all sentences sorted by `createdAt` desc
  - `paragraph` filter → filter by `paragraphId`, sort by `order` asc
  - `article` filter → filter by `articleId`, sort by `paragraphOrder` asc then `order` asc
  - `tag` filter → filter by `tags.includes(id)`, sort by `createdAt` desc

**2. Refactor SentenceSidebar to use shared utility**

In SentenceSidebar.tsx, replace the inline `displayedSentences` useMemo body with a call to `getFilteredSentences()`. Ensures sidebar and nav bar always produce identical lists.

**3. Create `SentenceNavBar` component**

New file: `components/sentence-mode/SentenceNavBar.tsx`

**Props**: `currentIndex`, `total`, `onPrev`, `onNext`

**Design (极简)**:
- Height ~36-40px, **no background, no border** — just floating controls
- Centered horizontal row: left chevron → `"3 / 47"` position text → right chevron
- Chevrons: reuse icons from Icons.tsx. `opacity-30` when disabled (at boundary), `cursor-pointer hover:opacity-100 transition-opacity` when active
- Position text: `text-secondary text-sm tracking-wider font-mono`
- When `total ≤ 1`, return `null` (nothing to navigate)

**Why no glass-panel**: The bar sits naturally at the content bottom as a lightweight affordance. No card, no border — truly minimal. The arrows and counter are all the user needs.

**4. Wire up in SentenceMode**

In SentenceMode.tsx:
- Import `getFilteredSentences`
- Compute `filteredSentences` and `currentIndex` via `useMemo`
- Create `handlePrevSentence` / `handleNextSentence` callbacks
- Render `<SentenceNavBar>` at the bottom of the content `div`, after the detail/practice view:

```
<div className="flex-1 flex flex-col min-w-0">
  {viewMode === 'detail' ? <SentenceDetailView /> : <SentencePracticeArea />}
  <SentenceNavBar currentIndex={currentIndex} total={filteredSentences.length} onPrev={handlePrevSentence} onNext={handleNextSentence} />
</div>
```

The nav bar takes its natural ~40px height; the view above is `flex-1` and absorbs the rest.

**5. Add keyboard navigation**

In SentenceMode.tsx, add `useEffect` keydown listener:
- `ArrowLeft` → prev, `ArrowRight` → next
- **Guard**: Only fire when `document.activeElement` is NOT `textarea`, `input`, or `[contenteditable]` — prevents conflict with translation typing
- Use `matchesHotkey()` against `appSettings.hotkeys` for the existing `next`/`prev` commands defined in constants.tsx

**6. Handle practice mode continuity**

Current `handleSelectSentence` resets `viewMode` to `'detail'`. Navigating via the nav bar during practice would drop the user out of practice — bad UX.

**Fix**: Create a separate `handleNavSentence(id: string)` that sets `selectedId` and increments `detailResetKey` but does **not** reset `viewMode`. This preserves the user's current view (detail or practice) when using the nav bar.

---

### Verification

1. **Flat mode**: Home → select sentence → nav bar shows `"1 / 147"`. Prev/next arrows cycle through newest-first order.
2. **Article drill-down**: By-article mode → click article → nav bar count matches article's sentences. Arrows traverse in paragraph order.
3. **Paragraph/tag drill-down**: Same validation for paragraph and tag contexts.
4. **Boundaries**: First sentence → left arrow disabled. Last → right disabled. Single sentence → bar hidden.
5. **Keyboard**: `ArrowLeft`/`ArrowRight` navigate when not in a text input. Normal cursor movement inside textarea.
6. **Practice continuity**: During practice, pressing next moves to next sentence and stays in practice mode.

### Decisions

- **No glass-panel on nav bar** — Chose borderless/backgroundless to maintain 极简. The bar is functional, not decorative.
- **Shared utility over prop drilling** — Extracted to `utils/sentenceFilters.ts` rather than passing filtered list up from sidebar. Simpler, avoids circular data flow.
- **Separate nav handler** — `handleNavSentence` preserves `viewMode` unlike `handleSelectSentence`, so navigating during practice doesn't reset to detail.
- **Hide when ≤1** — No point showing arrows for a single sentence.