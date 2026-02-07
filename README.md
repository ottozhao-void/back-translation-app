# Aether Translate

<p align="center">
  <strong>A modern bilingual translation practice app using the back-translation method</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#configuration">Configuration</a>
</p>

---

## Overview

Aether Translate is an immersive web application designed to help users practice **English ↔ Chinese** translation using the **back-translation method**. It provides a focused environment for sentence-by-sentence translation practice with two feedback modes: visual diff comparison or LLM-assisted scoring.

The app emphasizes a beautiful, modern UI with glassmorphism effects, smooth animations, and extensive keyboard shortcuts for power users.

## Features

### Translation Practice

- **Dual Translation Modes**: Practice both **English → Chinese** and **Chinese → English** translations
- **Sentence-by-Sentence Focus**: Concentrate on one sentence at a time for precision improvement
- **Progress Tracking**: Visual indicators for completed sentences, scores, and practice statistics
- **Practice Timer**: Track time spent on each sentence with best-time records

### Feedback Systems

#### 1. Diff Mode (Traditional)
- Compare your translation directly with reference translations
- Visual diff highlighting to instantly spot differences
- Color-coded output: green (match), red (extra text), yellow (missing text)

#### 2. LLM Mode (AI-Powered)
- Evaluate translations using configurable Large Language Models
- Supports any OpenAI-compatible API (OpenAI, Gemini, Ollama, OpenRouter, etc.)
- Automatic scoring and feedback generation

### Content Management

- **Sentence Base**: Hierarchical organization supporting articles, paragraphs, and standalone sentences
- **Smart Import**: Import bilingual texts with LLM-powered sentence segmentation and alignment
- **Three Display Modes**: View sentences flat, grouped by article, or grouped by paragraph
- **Bulk Operations**: Import, export, and manage large collections of sentence pairs

### User Experience

- **Modern Design**: Glassmorphism effects, particle backgrounds, smooth animations
- **Dark/Light Themes**: Toggle between dark and light modes with smooth transitions
- **Customizable Hotkeys**: Extensive keyboard shortcuts with full customization
- **Text-to-Speech**: Listen to original text using Google GenAI TTS
- **Mobile Support**: Responsive design with mobile-optimized views and gestures
- **Keyboard Hints Overlay**: Press `?` to see all available shortcuts

## Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 19, TypeScript, Tailwind CSS |
| **Build Tool** | Vite 6 |
| **Backend** | Node.js, Express (production) / Vite Plugin (development) |
| **Animations** | GSAP |
| **Icons** | react-icons |
| **AI Integration** | Google GenAI SDK, OpenAI-compatible APIs |
| **Data Storage** | Local JSON file storage |

## Getting Started

### Prerequisites

- **Node.js** v18 or higher (v20+ recommended)
- **npm** or **yarn**

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd back-translation-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Set up environment variables:
   ```bash
   # For Text-to-Speech functionality
   echo "GEMINI_API_KEY=your-api-key" > .env
   ```

### Running the Application

#### Development Mode

Start the Vite development server with hot module replacement:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note**: If port 3000 is in use, Vite will automatically use the next available port. Check the terminal output for the actual URL.

#### Production Mode

Build and serve the production version:

```bash
npm run build
node server.js
```

#### Preview Mode

Preview the production build with Vite:

```bash
npm run build
npm run preview
```

## Architecture

### Dual Server Design

The application uses a dual-server architecture to ensure consistency between development and production:

```
┌─────────────────────────────────────────────────────────────┐
│                    Development                               │
│  Vite Dev Server + articleServerPlugin (vite.config.ts)      │
│  - Hot Module Replacement                                    │
│  - API routes via custom middleware                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Production                                │
│  Express Server (server.js)                                  │
│  - Static file serving from dist/                            │
│  - Identical API routes                                      │
└─────────────────────────────────────────────────────────────┘
```

**Important**: Both servers implement identical API endpoints. Changes to one must be mirrored in the other.

### Project Structure

```
back-translation-app/
├── index.tsx                 # App root, state management, view routing
├── index.html                # HTML template with Tailwind config
├── types.ts                  # TypeScript interfaces and types
├── constants.tsx             # Hotkey definitions, fallback data
├── vite.config.ts            # Vite config with dev server middleware
├── server.js                 # Production Express server
│
├── views/
│   ├── SentenceMode.tsx      # Main home view - sentence-based practice
│   ├── ModeSelector.tsx      # EN↔ZH mode selection screen
│   └── PracticeSession.tsx   # Practice interface with hotkeys
│
├── components/
│   ├── SettingsModal.tsx     # App settings (auto-save, hotkeys, AI models)
│   ├── SentenceCompareModal.tsx  # Diff comparison view
│   ├── ConfirmModal.tsx      # Styled confirmation dialogs
│   ├── InputModal.tsx        # Styled input prompts
│   ├── Toast.tsx             # Toast notifications with undo support
│   ├── KeyboardHints.tsx     # Keyboard shortcut overlay (? key)
│   ├── Skeleton.tsx          # Loading placeholders
│   ├── GreetingDisplay.tsx   # Personalized LLM-generated greetings
│   │
│   ├── sentence-mode/        # Sentence mode components
│   │   ├── SentenceSidebar.tsx       # Sentence list with display modes
│   │   ├── SentencePracticeArea.tsx  # Main practice interface
│   │   ├── SentenceDetailView.tsx    # Card carousel for details
│   │   ├── ImportModal.tsx           # Import with LLM segmentation
│   │   ├── AlignmentEditor.tsx       # Manual sentence alignment
│   │   └── cards/
│   │       ├── CardCarousel.tsx      # Horizontal carousel navigation
│   │       ├── SentenceInfoCard.tsx  # Sentence content and actions
│   │       ├── StatsCard.tsx         # Practice statistics
│   │       └── VocabularyCard.tsx    # Vocabulary (placeholder)
│   │
│   ├── settings/             # Settings sub-components
│   │   ├── AIModelsTab.tsx         # LLM provider configuration
│   │   ├── ModelSelector.tsx       # Model selection dropdown
│   │   └── ProviderEditModal.tsx   # Provider add/edit dialog
│   │
│   └── mobile/               # Mobile-optimized components
│       ├── BottomTabBar.tsx        # Mobile navigation
│       ├── MobileHeader.tsx        # Mobile header
│       ├── SentenceListItem.tsx    # Mobile list item
│       ├── SwipeCard.tsx           # Swipe gestures
│       ├── PracticeToolbar.tsx     # Mobile practice controls
│       └── TranslationInput.tsx    # Mobile translation input
│
├── hooks/
│   └── usePracticeTimer.ts   # Practice timing with stable callbacks
│
├── utils/
│   ├── articleLoader.ts      # Article parsing and API calls
│   ├── sentenceLoader.ts     # Sentence CRUD operations
│   ├── textUtils.ts          # Text processing utilities
│   └── alignmentHelpers.ts   # Sentence alignment utilities
│
├── services/
│   ├── geminiService.ts      # Google GenAI TTS integration
│   └── llmService.ts         # LLM platform frontend service
│
├── server/
│   └── llm/                  # LLM backend services
│       ├── index.ts          # API route handlers
│       ├── executor.ts       # OpenAI-compatible API executor
│       ├── prompts.ts        # Task prompt registry
│       └── providers.ts      # Provider config management
│
├── public/
│   ├── articles/             # Article data storage (JSON/MD)
│   └── data/
│       └── sentences.json    # Sentence database
│
└── data/
    └── llm-config.json       # LLM provider configs (gitignored)
```

### Data Models

#### SentencePair

The fundamental unit for translation practice:

```typescript
interface SentencePair {
  id: string;                    // Unique ID (UUID/nanoid)
  en: string;                    // English text
  zh: string;                    // Chinese text

  // Hierarchical context
  sourceType: 'article' | 'paragraph' | 'sentence';
  articleId?: string;            // Parent article ID
  paragraphId?: string;          // Parent paragraph ID
  paragraphOrder?: number;       // Position in article
  order: number;                 // Position in paragraph

  // User practice data
  userTranslationZh?: UserTranslation;
  userTranslationEn?: UserTranslation;
  practiceStats?: PracticeStats;

  // Metadata
  createdAt: number;
  lastPracticed?: number;
  tags?: string[];
}
```

#### UserTranslation

Stores user's translation attempts:

```typescript
interface UserTranslation {
  type: 'diff' | 'llm' | 'draft';
  text: string;
  timestamp: number;
  score?: number;                // LLM mode only
  history?: TranslationRecord[];
}
```

#### PracticeStats

Tracks practice performance:

```typescript
interface PracticeStats {
  attempts: number;
  totalTimeMs: number;
  bestTimeMs?: number;
  lastAttemptMs?: number;
  lastPracticedAt?: number;
}
```

## API Reference

### Sentence API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/sentences` | Get all sentence pairs |
| `POST` | `/api/sentences` | Save all sentence pairs (full replacement) |
| `GET` | `/api/sentences/summary` | Get truncated list (mobile-optimized) |
| `GET` | `/api/sentences/:id` | Get single sentence details |
| `PATCH` | `/api/sentences/:id` | Update single sentence |

### Articles API (Legacy)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/articles` | List article files |
| `POST` | `/api/articles` | Save article (filename, content) |
| `DELETE` | `/api/articles?filename=` | Delete article |
| `POST` | `/api/articles/rename` | Rename article |
| `GET` | `/articles/:filename` | Serve article content |

### LLM API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/llm/config` | Get LLM settings (API keys masked) |
| `POST` | `/api/llm/config` | Save LLM settings |
| `POST` | `/api/llm/provider` | Add/update a provider |
| `DELETE` | `/api/llm/provider?id=` | Delete a provider |
| `POST` | `/api/llm/models` | Fetch available models from provider |
| `POST` | `/api/llm/execute` | Execute an LLM task |

#### LLM Task Types

| Task | Description |
|------|-------------|
| `segment` | Split text into sentences (single language) |
| `segment-align` | Semantically align bilingual text |
| `translate` | Translate text (reserved) |
| `score` | Score translation quality (reserved) |
| `greeting` | Generate personalized greetings |

## Configuration

### LLM Providers

Configure LLM providers in Settings → AI Models:

1. Add a provider with:
   - **Name**: Display name (e.g., "OpenAI")
   - **Base URL**: API endpoint (e.g., `https://api.openai.com/v1`)
   - **API Key**: Your API key

2. Click "Fetch Models" to load available models

3. Select default models for different tasks

Supported providers include:
- OpenAI
- Google Gemini (via OpenAI-compatible endpoint)
- Ollama (local)
- OpenRouter
- Any OpenAI-compatible API

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google GenAI API key for TTS functionality |

### App Settings

Settings are stored in `localStorage` under the key `appSettings`:

```typescript
interface AppSettings {
  autoSave: { enabled: boolean; delay: number };
  llmThreshold: number;
  hotkeys: { [commandId: string]: string };
  practiceGranularity: 'sentence' | 'paragraph';
  hideReferenceInDetailView?: boolean;
  userName?: string;
  greetingPrompt?: string;
  llm?: LLMSettings;
}
```

## Keyboard Shortcuts

| Action | Default Shortcut |
|--------|------------------|
| Next Sentence | `→` (ArrowRight) |
| Previous Sentence | `←` (ArrowLeft) |
| Toggle Hint | `Tab` |
| Submit / Check | `Enter` |
| Edit Translation | `E` |
| Open Compare Modal | `C` |
| Play Audio | `Alt+P` |
| Trigger Auto Save | `Ctrl+S` |
| Show Keyboard Hints | `?` |

All shortcuts are customizable in Settings → Hotkeys.

## Development Notes

### Key Implementation Details

- **Path Alias**: `@/` maps to project root (configured in `tsconfig.json` and `vite.config.ts`)
- **Dual Directory Sync**: Server writes to both `public/` and `dist/` to keep them synchronized
- **Auto-Migration**: Sentences auto-migrate from Articles format if sentence database is empty

### Known Gotchas

1. **useCallback with timers**: Timer hooks updating `elapsed` frequently will cause callback reference changes. Use refs and functional state updates. See [usePracticeTimer.ts](hooks/usePracticeTimer.ts).

2. **CSS Variables**: Using undefined CSS variables fails silently. Always verify variables exist in `index.html` `:root`.

3. **Toast z-index**: Toast container uses `z-[200]`. Action buttons need `pointerEvents: 'auto'` and `e.stopPropagation()`.

4. **Soft Delete Pattern**: Delete operations use 5-second timeout + undo. Store pending deletes in refs, not state.

5. **Port conflicts**: Vite auto-increments port if 3000 is in use. Check terminal for actual port.

## License

[MIT](LICENSE)

---

<p align="center">
  Made with React, TypeScript, and Tailwind CSS
</p>
