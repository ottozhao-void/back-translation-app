# Aether Translate (Back Translation App)

## Project Overview
Aether Translate is a web-based tool designed for practicing language translation (specifically English <-> Chinese) using the **back-translation** method. It features a modern, immersive UI with glassmorphism effects and utilizes Google's Gemini API for advanced features like Text-to-Speech (TTS) and translation feedback.

## Tech Stack
- **Frontend Framework:** React 19 (TypeScript)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (loaded via CDN in `index.html`), Custom CSS Variables for theming (Light/Dark).
- **Backend:** Node.js
    - **Development:** Custom Vite Plugin (`vite.config.ts`) handles API requests.
    - **Production:** Express server (`server.js`) serves static assets and handles API requests.
- **Data Storage:** Local filesystem (JSON/Markdown files) in `public/articles`.
- **AI Integration:** Google GenAI SDK (`@google/genai`) for TTS and feedback.

## Architecture & Data Flow

### The "Backend"
Uniquely, this project handles backend logic differently in Dev vs. Prod to ensure a seamless local experience without a separate backend process in development.
- **Development (`npm run dev`):** The `articleServerPlugin` in `vite.config.ts` intercepts requests to `/api/articles` and performs file system operations (read/write/rename/delete) directly on the `public/articles` directory.
- **Production (`node server.js`):** An Express app serves the `dist/` folder and replicates the same API endpoints (`/api/articles/*`), performing operations on the `articles/` directory relative to the server script.

### Data Storage
- Articles are stored as files in `public/articles/`.
- **Format:** JSON is preferred for maintaining translation history and metadata, but `.txt` and `.md` are supported for raw imports.
- **Synchronization:** The backend logic attempts to keep `public/articles` (source) and `dist/articles` (build output) in sync during runtime to prevent data loss or stale reads.

### AI Service
- Located in `services/geminiService.ts`.
- Uses `GoogleGenAI` client.
- **TTS:** Generates speech using `gemini-2.5-flash-preview-tts` and plays it back using the Web Audio API (`AudioContext`).
- **Key Management:** Relies on `process.env.API_KEY` (injected via Vite define or process env).

## Key Directories & Files

| Path | Description |
| :--- | :--- |
| `public/articles/` | The "Database". Contains all user articles. |
| `vite.config.ts` | **Critical.** Contains the `articleServerPlugin` which acts as the backend during development. |
| `server.js` | **Critical.** The production server script. Mirrors logic from `vite.config.ts`. |
| `index.html` | Entry point. Contains **Tailwind CDN link** and **CSS Variable definitions** for the theme system. |
| `services/geminiService.ts` | Handles interaction with Google Gemini API (primarily TTS). |
| `feature-implementation/` | Documentation for current and planned features. |

## Development Workflow

### Installation
```bash
npm install
```

### Running Locally
```bash
npm run dev
```
*   Starts Vite on port 3000.
*   API requests are handled by Vite middleware.
*   **Note:** If you modify API logic, you must update BOTH `vite.config.ts` and `server.js` to maintain parity.

### Building for Production
```bash
npm run build
node server.js
```

## Conventions & Style
- **Styling:** Use Tailwind utility classes primarily. For complex animations or glassmorphism specific to this app, rely on the CSS variables defined in `index.html` (`--glass-bg`, `--text-main`, etc.).
- **State Management:** React Hooks (`useState`, `useEffect`, custom hooks).
- **File Operations:** All file I/O happens in the "backend" layer (Vite plugin or Express). The frontend simply fetches `/api/articles`.
- **Imports:** Uses ESM imports.
