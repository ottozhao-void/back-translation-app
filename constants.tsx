// Registry of article files located in ./articles/
export const ARTICLE_FILENAMES = [
  'article-1.json',
  'article-2.json',
];

// --- Hotkey Commands ---
export const AVAILABLE_COMMANDS = [
  { id: 'next', label: 'Next Sentence', default: 'ArrowRight' },
  { id: 'prev', label: 'Previous Sentence', default: 'ArrowLeft' },
  { id: 'hint', label: 'Toggle Hint', default: 'Tab' },
  { id: 'submit', label: 'Submit / Check', default: 'Enter' },
  { id: 'edit', label: 'Edit Translation', default: 'E' },
  { id: 'compare', label: 'Open Compare Modal', default: 'C' },
  { id: 'playAudio', label: 'Play Audio', default: 'Alt+P' },
  { id: 'autoSave', label: 'Trigger Auto Save', default: 'Ctrl+S' },
];
