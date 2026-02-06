# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Aether Translate is a bilingual translation practice app (English ↔ Chinese) using the back-translation method. Users practice sentence-by-sentence translation with two feedback modes: visual diff comparison or LLM-assisted scoring.

## Development Commands

```bash
npm run dev      # Start Vite dev server on http://localhost:3000
npm run build    # Build for production to dist/
npm run preview  # Preview production build
node server.js   # Run production server (after build)
```

## Architecture

### Dual Server Design
- **Development**: Vite dev server with `articleServerPlugin` (custom plugin in `vite.config.ts`) handles API routes via middleware
- **Production**: Express server (`server.js`) serves static files from `dist/` and handles the same API routes

Both servers implement identical API endpoints - changes to one must be mirrored in the other.

### API Endpoints (implemented in both vite.config.ts and server.js)

**Sentences API:**
- `GET /api/sentences` - Load all sentence pairs
- `POST /api/sentences` - Save all sentence pairs (full replacement)

**Articles API (legacy):**
- `GET /api/articles` - List article files
- `POST /api/articles` - Save article (filename, content)
- `DELETE /api/articles?filename=` - Delete article
- `POST /api/articles/rename` - Rename article
- `GET /articles/:filename` - Serve article content from `public/articles/`

### Data Flow
Articles are stored as JSON in `public/articles/`. The server writes to both `public/` (source) and `dist/` (if exists) to keep them synchronized during development.

### Application Structure
```
index.tsx           # App root, state management, view routing
├── views/
│   ├── SentenceMode.tsx    # Home view - sentence-based practice
│   ├── ArticleList.tsx     # Legacy article grid (currently unused)
│   ├── ModeSelector.tsx    # EN↔ZH mode selection
│   └── PracticeSession.tsx # Main practice interface with hotkeys
├── components/
│   ├── SettingsModal.tsx   # App settings (auto-save, hotkeys)
│   ├── SentenceCompareModal.tsx  # Diff comparison view
│   ├── ConfirmModal.tsx    # Styled confirmation dialogs
│   ├── InputModal.tsx      # Styled input prompts
│   ├── Toast.tsx           # Toast notifications with undo support
│   ├── KeyboardHints.tsx   # Keyboard shortcut overlay (? key)
│   ├── Skeleton.tsx        # Loading placeholders
│   ├── sentence-mode/      # SentenceMode sub-components
│   │   ├── SentenceSidebar.tsx
│   │   ├── SentencePracticeArea.tsx
│   │   └── ImportModal.tsx
│   └── ...
├── utils/
│   ├── articleLoader.ts    # Article parsing, serialization, API calls
│   ├── sentenceLoader.ts   # Sentence CRUD operations
│   └── textUtils.ts
├── services/
│   └── geminiService.ts    # Google GenAI TTS integration
├── types.ts        # TypeScript interfaces (Article, Paragraph, SentencePair, UserTranslation)
└── constants.tsx   # Hotkey definitions, fallback article list
```

### State Management
- App uses React useState at the root level (`index.tsx`)
- Three view states: `HOME` → `MODE_SELECT` → `PRACTICE`
- Settings persisted to localStorage (`appSettings` key)
- Article progress saved to server as JSON with each user action

### Article Data Model
```typescript
Article {
  id: string;           // Filename
  content: Paragraph[];
}

Paragraph {
  en: string[];         // English versions (first is primary)
  zh: string[];         // Chinese versions (first is primary)
  userTranslationZh?: UserTranslation;  // User's EN→ZH translation
  userTranslationEn?: UserTranslation;  // User's ZH→EN translation
}

UserTranslation {
  type: 'diff' | 'llm' | 'draft';
  text: string;
  score?: number;       // LLM mode only
  history?: TranslationRecord[];
}
```

### Sentence Mode Architecture (Current)

The app uses a "Sentence Base" model where all translation pairs are stored in a flat list and grouped by source.

```typescript
SentencePair {
  id: string;
  en: string;
  zh: string;
  sourceType: string;      // e.g., "article-name.json" or "manual"
  userTranslationZh?: UserTranslation;
  userTranslationEn?: UserTranslation;
}
```

- Data stored in `public/sentences.json`
- Auto-migrates from Articles if sentence database is empty
- Sidebar groups sentences by `sourceType`

### Hotkey System
Hotkeys are configurable via Settings. Defaults defined in `constants.tsx` (`AVAILABLE_COMMANDS`). The `PracticeSession` component handles keyboard events with `matchesHotkey()` helper.

## Key Implementation Details

- Articles support both legacy Markdown format (with section headers like `# 英文原文`) and JSON format
- Path alias `@/` maps to project root (configured in both `tsconfig.json` and `vite.config.ts`)
- Environment variable `GEMINI_API_KEY` enables TTS via Google GenAI SDK
- Auto-save creates 'draft' type translations; submitting creates 'diff' or 'llm' type

## Gotchas

- **CSS Variables**: Using undefined CSS variables (e.g., `var(--accent-blue)`) fails silently. Always verify variables exist in `index.html` `:root`.
- **Toast z-index**: Toast container uses `z-[200]`. Action buttons need `pointerEvents: 'auto'` and `e.stopPropagation()` to be clickable.
- **Soft Delete Pattern**: Delete operations use 5-second timeout + undo. Store pending deletes in a ref, not state, to avoid re-render issues.
- **Port conflicts**: Vite dev server auto-increments port if 3000 is in use. Check terminal output for actual port.
- **ArticleList unused**: Despite being in codebase, `ArticleList.tsx` is not rendered. `SentenceMode.tsx` is the actual home view.
