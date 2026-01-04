# Aether Translate (Back Translation App)

## User/Project Details
Aether Translate is a web-based tool for practicing language translation (specifically English <-> Chinese) using the **back-translation** method. Users translate a source text, and the system (or AI) translates it back to verify accuracy. The app features a modern, immersive UI with glassmorphism effects and utilizes Google's Gemini API for Text-to-Speech (TTS) and feedback.

## Tech Stack
*   **Frontend Framework**: React 19 (TypeScript)
*   **Build Tool**: Vite 6.2.0
*   **Styling**: Tailwind CSS (via CDN), CSS Variables for theming (Light/Dark).
*   **Runtime**: Node.js
*   **Backend (Dev)**: Custom Vite Plugin (`vite.config.ts`)
*   **Backend (Prod)**: Express (`server.js`)
*   **AI Integration**: @google/genai (v1.33.0)
*   **State Management**: React Hooks (locla state)

## Project Structure
*   **Root-Level Source**: Note that source code (`views`, `components`, `utils`) resides in the project root, not a `src` directory.
```
d:\back-translation-app\
├── components/           # Reusable UI components (Modals, Icons, etc.)
├── feature-implementation/ # Feature documentation
├── public/
│   └── articles/         # Data storage (JSON/Markdown files)
├── services/             # External services (geminiService.ts)
├── utils/                # Utility functions
├── views/                # Main page views (PracticeSession.tsx)
├── index.html            # Entry point (Tailwind CDN, CSS Variables)
├── index.tsx             # Main React entry
├── server.js             # Production Express server
├── vite.config.ts        # Vite config & Dev backend plugin
├── tailwind.config.js    # (Optional/Virtual) Tailwind config
└── GEMINI.md             # This context file
```

## Development Workflow

### Installation
```bash
npm install
```

### Running Locally (Dev)
```bash
npm run dev
```
*   Starts Vite server on port 3000.
*   **Note**: Backend API endpoints (`/api/articles`) are handled by the `articleServerPlugin` in `vite.config.ts`. Changes to API logic must be mirrored in `server.js` for production.

### Building for Production
```bash
npm run build
node server.js
```
*   `npm run build` compiles the frontend to `dist/`.
*   `node server.js` serves the static assets and handles API requests.

### Running Tests
*   *No automated testing framework is currently configured.*

## Coding Standards

### Naming Conventions
*   **Files**: PascalCase for React components (e.g., `PracticeSession.tsx`), camelCase for utilities/functions (e.g., `geminiService.ts`).
*   **Variables/Functions**: camelCase.
*   **Directories**: lowercase/kebab-case (e.g., `feature-implementation`, `components`).

### Component Structure
*   Use **Functional Components** with React Hooks (`useState`, `useEffect`, custom hooks).
*   Avoid class components.
*   Keep components modular. Extract logical chunks into `components/` or `views/`.

### Styling
*   **Tailwind CSS**: Use utility classes for layout, spacing, and standard styling.
*   **CSS Variables**: Use the variables defined in `index.html` for specific theme colors and effects (e.g., `var(--glass-bg)`, `var(--text-main)`).
*   **Glassmorphism**: Use the `.glass-panel` class or `backdrop-filter` utilities combined with variables.

### Architecture & Data Flow
*   **"Backend" Parity**: The project uses a dual-backend strategy.
    *   **Dev**: `vite.config.ts` intercepts requests.
    *   **Prod**: `server.js` handles requests.
    *   **Rule**: Any logic change to the API **MUST** be applied to BOTH files.
*   **Data Storage**: `public/articles` is the source of truth. The backend syncs this with `dist/articles` to ensure data persistence across builds.

### Error Handling
*   Wrap AI and File I/O operations in try/catch blocks.
*   Log errors to console in dev; return clear 500/400 JSON responses from API endpoints.
