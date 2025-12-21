# Aether Translate (Back Translation App)

Aether Translate is a modern, immersive web application designed to help users practice translation (English <-> Chinese) using the **back-translation** method. It provides a focused environment for sentence-by-sentence translation, comparison, and feedback.

## ✨ Features

### 📝 Article Management
- **Upload & Create**: Easily upload existing Markdown/Text files or create new articles directly within the app.
- **Management**: List, rename, and delete articles.
- **Format Support**: Articles are stored and processed as JSON, preserving translation history and metadata.

### 🔄 Translation Practice
- **Dual Modes**: Support for both **English-to-Chinese** and **Chinese-to-English** translation practice.
- **Sentence-by-Sentence**: Focus on one sentence at a time to improve precision.
- **Progress Tracking**: Visual indicators for completed sentences and scores.

### 💡 Feedback Systems
The app offers two distinct modes for evaluating your translations:

1.  **Diff Mode (Traditional)**:
    - Compare your translation directly with the reference translation.
    - Visual diff highlighting to spot differences instantly.
    - **Sentence Compare Modal**: A detailed view to compare your work against multiple reference translations.

2.  **LLM Mode (AI-Powered)**:
    - Evaluate your translation using an external Large Language Model (LLM).
    - **Prompt Generation**: Automatically generates a structured prompt containing the original text, reference translation, and your translation.
    - **Scoring**: Copy the prompt to an LLM (like ChatGPT, Claude, or Gemini), get feedback, and record your score (1-100) in the app.

### 🎨 Immersive UI/UX
- **Modern Design**: Glassmorphism effects, particle backgrounds, and smooth animations.
- **Theme Support**: Toggle between Light and Dark modes.
- **Customizable Hotkeys**: extensive keyboard shortcuts for power users (e.g., `Ctrl+S` to save, `Enter` to check).
- **Text-to-Speech**: Listen to the original text for better understanding.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express (Production), Custom Vite Plugin (Development)
- **Data Storage**: Local JSON file storage
- **AI Integration**: Google GenAI SDK (Gemini) integration ready

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher recommended)
- npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd back-translation-app
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the Application

#### Development Mode
Start the Vite development server. The custom Vite plugin handles API requests locally.
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Production Mode
Build the application and run the production server.
```bash
npm run build
node server.js
```

## 📂 Project Structure

```
├── components/         # React components (Modals, UI elements)
├── features/           # Feature documentation and planning
├── public/
│   └── articles/       # Storage for article data (JSON/MD)
├── services/           # External services (Gemini AI)
├── utils/              # Utility functions (Text processing, File I/O)
├── index.tsx           # Main application entry point
├── server.js           # Production Express server
├── vite.config.ts      # Vite configuration & Dev server middleware
└── package.json        # Project dependencies and scripts
```

## ⌨️ Default Hotkeys

| Action | Shortcut |
|--------|----------|
| Next Sentence | `ArrowRight` |
| Previous Sentence | `ArrowLeft` |
| Toggle Hint | `Tab` |
| Submit / Check | `Enter` |
| Edit Translation | `E` |
| Open Compare Modal | `C` |
| Play Audio | `Alt+P` |
| Trigger Auto Save | `Ctrl+S` |

*Hotkeys can be customized in the Settings menu.*

## 📄 License

[MIT](LICENSE)
