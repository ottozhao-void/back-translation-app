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
│   ├── ArticleList.tsx     # Home view - article grid
│   ├── ModeSelector.tsx    # EN↔ZH mode selection
│   └── PracticeSession.tsx # Main practice interface with hotkeys
├── components/
│   ├── SettingsModal.tsx   # App settings (auto-save, hotkeys)
│   ├── SentenceCompareModal.tsx  # Diff comparison view
│   └── ...
├── utils/
│   ├── articleLoader.ts    # Article parsing, serialization, API calls
│   └── textUtils.ts
├── services/
│   └── geminiService.ts    # Google GenAI TTS integration
├── types.ts        # TypeScript interfaces (Article, Paragraph, UserTranslation)
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

### Hotkey System
Hotkeys are configurable via Settings. Defaults defined in `constants.tsx` (`AVAILABLE_COMMANDS`). The `PracticeSession` component handles keyboard events with `matchesHotkey()` helper.

## Key Implementation Details

- Articles support both legacy Markdown format (with section headers like `# 英文原文`) and JSON format
- Path alias `@/` maps to project root (configured in both `tsconfig.json` and `vite.config.ts`)
- Environment variable `GEMINI_API_KEY` enables TTS via Google GenAI SDK
- Auto-save creates 'draft' type translations; submitting creates 'diff' or 'llm' type
