export type FeedbackMode = 'diff' | 'llm' | 'draft';

export interface TranslationRecord {
  type: FeedbackMode;
  text: string;
  timestamp: number;
  score?: number;
}

export interface UserTranslation extends TranslationRecord {
  history?: TranslationRecord[];
}

export interface Paragraph {
  id: string;
  en: string[]; // English content (list of translations/versions)
  zh: string[]; // Chinese content (list of translations/versions)
  userTranslationZh?: UserTranslation; // User's Chinese translation (for EN_TO_ZH)
  userTranslationEn?: UserTranslation; // User's English translation (for ZH_TO_EN)
  lastPracticed?: number; // Timestamp
  referenceTranslations?: string[]; // Additional reference translations
}

export interface Article {
  id: string;
  title: string;
  category: string;
  date: string;
  coverImage?: string;
  content: Paragraph[];
}

export type PracticeMode = 'EN_TO_ZH' | 'ZH_TO_EN';

// --- Settings Types ---
export interface AppSettings {
  autoSave: {
    enabled: boolean;
    delay: number; // ms
  };
  llmThreshold: number;
  hotkeys: { [commandId: string]: string };
}

// --- Storage Keys ---
export const STORAGE_KEYS = {
  UPLOADS: 'aether_uploads_v1',
  DELETED_STATIC: 'aether_deleted_static_v1',
  PROGRESS: 'aether_progress_v1',
};
