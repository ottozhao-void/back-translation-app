# Files to Refactor

> Generated on: 2026-01-04

## Summary

The codebase inspection revealed **significant architectural violations** primarily centered around the **massive monolithic `index.tsx` file** (1784 lines). This file contains the entire application: icons, settings modal, main app component, upload modal, article list, preview modal, mode selector, toast component, and practice session — all in one file. This severely violates separation of concerns, modularity, and single responsibility principles.

The backend layer (`server.js` and `vite.config.ts`) is well-structured but contains **code duplication** between development and production configurations.

## Violations by Category

### Architecture Violations

| File | Violation | Recommendation |
|------|-----------|----------------|
| `index.tsx` | **Monolithic file** containing 1784 lines with 69+ functions/components including icons, modals, views, and the main app. Severely violates Single Responsibility and Modularity principles. | Extract into multiple files organized by concern (see detailed breakdown below). |
| `vite.config.ts` + `server.js` | **Code duplication**: Both files contain identical API handling logic for `/api/articles` endpoints (GET, POST, DELETE, rename). | Extract shared API logic into a common module or ensure both files always stay in sync via documentation/tests. |

### Backend Violations

| File | Violation | Recommendation |
|------|-----------|----------------|
| `server.js` | **Mixed concerns**: Serves as both static file server and API endpoint handler in the same file with inline route handlers. | Consider extracting API routes into a separate `routes/` or `api/` module for better organization. |
| `services/geminiService.ts` | **UI side effects in service layer**: Uses `alert()` for error handling (line 96) which is a UI concern. | Throw a domain exception instead and let the UI layer handle user notification. |

### Frontend Violations

| File | Violation | Recommendation |
|------|-----------|----------------|
| `index.tsx` | **Icons defined inline** (lines 15-194): 25+ SVG icon components defined directly in the main file. | Extract to `components/icons/` or `components/Icons.tsx`. |
| `index.tsx` | **SettingsModal component** (lines 196-468): 270+ line modal component embedded in main file. | Extract to `components/SettingsModal.tsx`. |
| `index.tsx` | **UploadModal component** (lines 847-961): Modal with business logic embedded in main file. | Extract to `components/UploadModal.tsx`. |
| `index.tsx` | **ArticleList view** (lines 963-1112): Major view component embedded in main file. | Extract to `views/ArticleList.tsx` or `components/ArticleList.tsx`. |
| `index.tsx` | **PreviewModal component** (lines 1114-1166): Modal embedded in main file. | Extract to `components/PreviewModal.tsx`. |
| `index.tsx` | **ModeSelector view** (lines 1168-1196): View component embedded in main file. | Extract to `views/ModeSelector.tsx` or `components/ModeSelector.tsx`. |
| `index.tsx` | **Toast component** (lines 1198-1209): Generic UI component embedded in main file. | Extract to `components/Toast.tsx`. |
| `index.tsx` | **PracticeSession view** (lines 1235-1778): **543 lines** - The largest component containing state management, UI rendering, keyboard handling, and business logic all mixed together. | Extract to `views/PracticeSession.tsx` and split logic into custom hooks (e.g., `usePracticeSession`, `useKeyboardHandlers`). |
| `index.tsx` | **App component** (lines 473-845): Contains significant business logic (article CRUD operations, settings management) mixed with UI rendering. | Extract business logic into custom hooks (`useArticleOperations`, `useSettings`, `useTheme`). |
| `index.tsx` | **Inline constants** (lines 122-132): `AVAILABLE_COMMANDS` array defined mid-file. | Extract to `constants.tsx` or `config/hotkeys.ts`. |
| `components/SentenceCompareModal.tsx` | **Inline icons** (lines 4-26): Duplicate icon definitions also present in `index.tsx`. | Import from shared `components/Icons.tsx` instead. |

### General Coding Standard Violations

| File | Violation | Recommendation |
|------|-----------|----------------|
| `index.tsx` | **No JSDoc/TypeScript documentation** for complex functions like `updateArticleProgress`, `handleArticleRename`, `addReferenceTranslation`. | Add documentation for public interfaces and complex algorithms. |
| `services/geminiService.ts` | **Hardcoded values**: Sample rate `24000` used multiple times without a named constant. | Extract to a constant like `TTS_SAMPLE_RATE`. |
| `utils/articleLoader.ts` | **Minimal error handling**: Most functions return `null` or `false` without specific error information. | Consider using a Result type or throwing domain-specific errors. |

## Priority Order

### High Priority (Critical Architecture)
1. **Extract components from `index.tsx`** - This is blocking all other improvements and making the codebase unmaintainable.

### Medium Priority (Code Quality)
2. **Extract icons to shared module** - Eliminates duplication between `index.tsx` and `SentenceCompareModal.tsx`.
3. **Extract custom hooks from large components** - Separate state/logic from presentation in `App`, `PracticeSession`.
4. **Fix `geminiService.ts` UI side effect** - Remove `alert()` from service layer.

### Low Priority (Nice to Have)
5. **Deduplicate API logic** between `vite.config.ts` and `server.js`.
6. **Add JSDoc documentation** to complex functions.
7. **Extract hardcoded values** to constants.

## Next Steps

1. **Start with icon extraction**: Create `components/Icons.tsx` and move all SVG icons there.
2. **Extract modals**: Create separate files for `SettingsModal`, `UploadModal`, `PreviewModal`.
3. **Extract views**: Create `views/` directory with `ArticleList`, `ModeSelector`, `PracticeSession`.
4. **Extract hooks**: Create `hooks/` directory with `useArticleOperations`, `usePracticeSession`, `useKeyboardHandlers`, `useSettings`, `useTheme`.
5. **Clean up `index.tsx`**: After extraction, this file should only contain the `App` component and render call.

## Recommended File Structure After Refactoring

```
├── index.tsx              # Only App component + render
├── types.ts               # Existing (good)
├── constants.tsx          # Existing + AVAILABLE_COMMANDS
├── components/
│   ├── Icons.tsx          # All SVG icons
│   ├── Toast.tsx
│   ├── ParticleBackground.tsx
│   ├── SettingsModal.tsx
│   ├── UploadModal.tsx
│   ├── PreviewModal.tsx
│   ├── ArticleCard.tsx
│   └── SentenceCompareModal.tsx  # Existing (update imports)
├── views/
│   ├── ArticleList.tsx
│   ├── ModeSelector.tsx
│   └── PracticeSession.tsx
├── hooks/
│   ├── useArticleOperations.ts
│   ├── usePracticeSession.ts
│   ├── useKeyboardHandlers.ts
│   ├── useSettings.ts
│   └── useTheme.ts
├── services/
│   └── geminiService.ts   # Existing (fix alert)
└── utils/
    ├── articleLoader.ts   # Existing
    └── textUtils.ts       # Existing
```
