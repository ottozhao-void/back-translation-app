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
│   ├── settings/           # Settings sub-components
│   │   ├── AIModelsTab.tsx       # LLM provider configuration
│   │   └── ProviderEditModal.tsx # Provider add/edit dialog
│   ├── sentence-mode/      # SentenceMode sub-components
│   │   ├── SentenceSidebar.tsx
│   │   ├── SentencePracticeArea.tsx
│   │   ├── SentenceDetailView.tsx  # Card carousel container for detail views
│   │   ├── ImportModal.tsx       # Import with LLM segmentation
│   │   ├── AlignmentEditor.tsx   # Sentence alignment editor
│   │   └── cards/               # Detail view card components
│   │       ├── CardCarousel.tsx     # Horizontal carousel with keyboard/wheel nav
│   │       ├── SentenceInfoCard.tsx # Sentence content and actions
│   │       ├── StatsCard.tsx        # Practice statistics
│   │       └── VocabularyCard.tsx   # Vocabulary (placeholder)
│   └── ...
├── hooks/
│   └── usePracticeTimer.ts  # Practice session timing with stable callbacks
├── utils/
│   ├── articleLoader.ts    # Article parsing, serialization, API calls
│   ├── sentenceLoader.ts   # Sentence CRUD operations
│   ├── textUtils.ts
│   └── alignmentHelpers.ts # Sentence alignment utilities
├── services/
│   ├── geminiService.ts    # Google GenAI TTS integration
│   └── llmService.ts       # LLM platform frontend service
├── server/
│   └── llm/                # LLM backend services
│       ├── index.ts        # API route handlers
│       ├── executor.ts     # OpenAI-compatible API executor
│       ├── prompts.ts      # Task prompt registry
│       └── providers.ts    # Provider config management
├── types.ts        # TypeScript interfaces (Article, Paragraph, SentencePair, LLM types)
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

The app uses a hierarchical "Sentence Base" model where all translation pairs are stored with optional article/paragraph context.

```typescript
SentencePair {
  id: string;
  en: string;
  zh: string;
  sourceType: 'article' | 'paragraph' | 'sentence';
  articleId?: string;       // Article ID (when sourceType='article')
  paragraphId?: string;     // Paragraph ID (for article/paragraph modes)
  paragraphOrder?: number;  // Position of paragraph within article
  order: number;            // Position of sentence within paragraph
  createdAt: number;        // Creation timestamp
  userTranslationZh?: UserTranslation;
  userTranslationEn?: UserTranslation;
  practiceStats?: PracticeStats;
}
```

- Data stored in `public/data/sentences.json`
- Auto-migrates from Articles if sentence database is empty
- Sidebar supports three display modes via `SidebarDisplayMode`

### Sidebar Display Modes

`SidebarDisplayMode: 'flat' | 'by-article' | 'by-paragraph'`

- **flat**: All sentences in chronological order (newest first)
- **by-article**: Group list view → click to drill into article's sentences
- **by-paragraph**: Group list view → click to drill into paragraph's sentences

Uses progressive disclosure pattern - clicking a group sets `contextFilter` to show that group's sentences with a back button.

### Hotkey System
Hotkeys are configurable via Settings. Defaults defined in `constants.tsx` (`AVAILABLE_COMMANDS`). The `PracticeSession` component handles keyboard events with `matchesHotkey()` helper.

### LLM Platform Architecture

The app includes a generic LLM platform for AI-powered features like intelligent sentence segmentation.

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend                                  │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │ Settings UI     │  │ ImportModal                     │   │
│  │ (AIModelsTab)   │  │ (LLM segmentation + alignment)  │   │
│  └────────┬────────┘  └────────────────┬────────────────┘   │
│           │                            │                     │
│           ▼                            ▼                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              services/llmService.ts                  │    │
│  │  - segmentText(), segmentAndAlign()                  │    │
│  │  - Automatic fallback to regex when LLM unavailable  │    │
│  └──────────────────────────┬──────────────────────────┘    │
├─────────────────────────────┼───────────────────────────────┤
│                             ▼                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              server/llm/ (Backend)                   │    │
│  │  - index.ts: API route handlers                      │    │
│  │  - executor.ts: OpenAI-compatible API calls          │    │
│  │  - prompts.ts: Task-specific prompt registry         │    │
│  │  - providers.ts: Provider config management          │    │
│  └──────────────────────────┬──────────────────────────┘    │
│                             ▼                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         LLM Provider (OpenAI-Compatible API)         │    │
│  │  OpenAI, Gemini, Ollama, OpenRouter, etc.            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**LLM API Endpoints:**
- `GET /api/llm/config` - Get LLM settings (API keys masked)
- `POST /api/llm/config` - Save LLM settings
- `POST /api/llm/provider` - Add/update a provider
- `DELETE /api/llm/provider?id=` - Delete a provider
- `POST /api/llm/models` - Fetch available models from provider
- `POST /api/llm/execute` - Execute an LLM task

**LLM Task Types:**
- `segment` - Split text into sentences (single language)
- `segment-align` - Semantically align bilingual text
- `translate` - Translate text (reserved)
- `score` - Score translation quality (reserved)

**Configuration:**
- Provider configs stored in `data/llm-config.json` (gitignored)
- Settings UI: Settings → AI Models tab
- Supports any OpenAI-compatible API (OpenAI, Gemini, Ollama, etc.)

## Key Implementation Details

- Articles support both legacy Markdown format (with section headers like `# 英文原文`) and JSON format
- Path alias `@/` maps to project root (configured in both `tsconfig.json` and `vite.config.ts`)
- Environment variable `GEMINI_API_KEY` enables TTS via Google GenAI SDK
- Auto-save creates 'draft' type translations; submitting creates 'diff' or 'llm' type

## Gotchas

- **useCallback with timers**: Timer hooks that update `elapsed` frequently will cause `useCallback` functions depending on it to get new references. Use refs and functional state updates to keep callback references stable. See `usePracticeTimer.ts` for the pattern.
- **CSS Variables**: Using undefined CSS variables (e.g., `var(--accent-blue)`) fails silently. Always verify variables exist in `index.html` `:root`.
- **Toast z-index**: Toast container uses `z-[200]`. Action buttons need `pointerEvents: 'auto'` and `e.stopPropagation()` to be clickable.
- **Soft Delete Pattern**: Delete operations use 5-second timeout + undo. Store pending deletes in a ref, not state, to avoid re-render issues.
- **Port conflicts**: Vite dev server auto-increments port if 3000 is in use. Check terminal output for actual port.
- **ArticleList unused**: Despite being in codebase, `ArticleList.tsx` is not rendered. `SentenceMode.tsx` is the actual home view.
- **ModelSelector TypeScript error**: `components/settings/ModelSelector.tsx` has a pre-existing TS error (`Property 'filter' does not exist on type 'unknown'`). This doesn't block builds but shows in `tsc --noEmit`.
