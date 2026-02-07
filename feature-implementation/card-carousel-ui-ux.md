# Card Carousel UI/UX Implementation Guide

## Overview

This document describes the remaining UI/UX work needed to complete the card carousel feature for sentence detail view.

**Status**: Framework implemented, UI/UX polish needed

## Implemented (Framework)

### Components Created

| File | Description |
|------|-------------|
| `components/sentence-mode/cards/CardCarousel.tsx` | Core carousel container with horizontal slide animation |
| `components/sentence-mode/cards/SentenceInfoCard.tsx` | Sentence detail card (extracted from SentenceDetailView) |
| `components/sentence-mode/cards/StatsCard.tsx` | Practice statistics card |
| `components/sentence-mode/cards/VocabularyCard.tsx` | Vocabulary card (placeholder) |
| `components/sentence-mode/cards/index.ts` | Barrel exports |

### Features Working

- [x] Horizontal slide animation (300ms ease-out)
- [x] Left/Right arrow key navigation
- [x] Mouse wheel navigation (with threshold debounce)
- [x] Pagination dots indicator
- [x] Auto-reset to first card when sentence changes
- [x] Stats card with full statistics display
- [x] Removed inline stats from detail view (now in dedicated card)

---

## TODO: UI/UX Enhancements

### 1. Animation Polish

**Current State**: Basic `translateX` transition

**Improvements Needed**:
- [ ] Add subtle scale effect during transition (active card slightly larger)
- [ ] Consider adding parallax effect for card content
- [ ] Add spring physics for more natural feel (use `framer-motion` or CSS spring)
- [ ] Improve touch/swipe support for mobile devices

**Example CSS Enhancement**:
```css
/* Add to active card */
.card-active {
  transform: scale(1);
  opacity: 1;
}

.card-adjacent {
  transform: scale(0.95);
  opacity: 0.7;
}
```

### 2. Pagination Dots

**Current State**: Simple dots with width expansion for active state

**Improvements Needed**:
- [ ] Add hover tooltip showing card name
- [ ] Consider replacing with card type icons (📄 📊 📝)
- [ ] Add keyboard focus styles for accessibility
- [ ] Consider adding swipe gesture indicator on mobile

**Design Options**:

Option A: Icon-based indicators
```
[📄] [📊] [📝]
```

Option B: Labeled segments
```
[Sentence] · [Stats] · [Words]
```

### 3. StatsCard Enhancements

**Current State**: Basic grid of stats

**Improvements Needed**:
- [ ] Add practice history chart (line graph showing time over attempts)
- [ ] Separate EN→ZH and ZH→EN statistics
- [ ] Add progress trend indicator (↑ improving / → stable / ↓ declining)
- [ ] Add comparison with average across all sentences
- [ ] Add "streak" counter for consecutive practice days

**Suggested Layout**:
```
┌─────────────────────────────────────────────┐
│ Practice Statistics                          │
├─────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│ │ 12      │ │ 45s     │ │ 32s ↑   │        │
│ │ Attempts│ │ Average │ │ Best    │        │
│ └─────────┘ └─────────┘ └─────────┘        │
├─────────────────────────────────────────────┤
│ Performance Trend                            │
│ [═══════════════════════▶]                  │
│ Time per attempt over last 10 practices     │
├─────────────────────────────────────────────┤
│ EN→ZH: 8 attempts, avg 42s                  │
│ ZH→EN: 4 attempts, avg 51s                  │
└─────────────────────────────────────────────┘
```

### 4. VocabularyCard Implementation

**Current State**: Placeholder with "Coming Soon"

**Data Structure Needed** (add to `types.ts`):
```typescript
interface VocabularyWord {
  id: string;
  word: string;
  translation?: string;
  notes?: string;
  familiarity: 'new' | 'learning' | 'familiar' | 'mastered';
  createdAt: number;
  lastReviewedAt?: number;
}

// Add to SentencePair
interface SentencePair {
  // ... existing fields
  vocabulary?: VocabularyWord[];
}
```

**UI Features Needed**:
- [ ] Word selection from sentence text (highlight to add)
- [ ] Word list display with familiarity color coding
- [ ] Inline editing for translation/notes
- [ ] Familiarity level toggle (tap to cycle)
- [ ] Delete word with swipe or long-press
- [ ] Empty state with instructions

**Familiarity Color Scheme**:
- New: `bg-blue-500/20 text-blue-400`
- Learning: `bg-amber-500/20 text-amber-400`
- Familiar: `bg-emerald-500/20 text-emerald-400`
- Mastered: `bg-purple-500/20 text-purple-400`

### 5. Accessibility

- [ ] Add `aria-label` to carousel container
- [ ] Add `role="tablist"` to pagination dots
- [ ] Add `role="tabpanel"` to each card
- [ ] Ensure focus management when switching cards
- [ ] Add screen reader announcements for card changes

### 6. Mobile/Touch Support

- [ ] Add touch swipe detection (use `touch-action: pan-y` to allow vertical scroll)
- [ ] Add swipe velocity detection for momentum scrolling
- [ ] Ensure tap targets are at least 44x44px
- [ ] Test on various screen sizes

---

## Implementation Priority

| Priority | Task | Effort |
|----------|------|--------|
| P1 | StatsCard history chart | Medium |
| P1 | VocabularyCard data structure | Low |
| P2 | Animation polish | Low |
| P2 | Touch/swipe support | Medium |
| P3 | Accessibility improvements | Low |
| P3 | Pagination redesign | Low |

---

## Testing Checklist

- [ ] Carousel navigates correctly with arrow keys
- [ ] Carousel navigates correctly with mouse wheel
- [ ] Pagination dots work correctly
- [ ] Cards reset to first when switching sentences
- [ ] Stats card shows correct data
- [ ] No layout shift during transitions
- [ ] Works on mobile viewport
- [ ] Keyboard focus is visible

---

## Files Modified

| File | Change |
|------|--------|
| `components/sentence-mode/SentenceDetailView.tsx` | Replaced with carousel wrapper |
| `components/sentence-mode/cards/*` | New card components |

## Files to Modify (Future)

| File | Change Needed |
|------|---------------|
| `types.ts` | Add `VocabularyWord` interface, add `vocabulary` field to `SentencePair` |
| `utils/sentenceLoader.ts` | Handle vocabulary CRUD operations |
| `views/SentenceMode.tsx` | Add vocabulary update handlers |
