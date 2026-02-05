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
  practiceGranularity: 'sentence' | 'paragraph';  // Default: 'sentence'
}

// --- Storage Keys ---
export const STORAGE_KEYS = {
  UPLOADS: 'aether_uploads_v1',
  DELETED_STATIC: 'aether_deleted_static_v1',
  PROGRESS: 'aether_progress_v1',
};

// === Sentence Mode Types ===

/**
 * 回译对 - 系统的基本单元
 * A sentence pair is the fundamental unit for translation practice
 */
export interface SentencePair {
  id: string;                    // Unique ID, format: {articleId}_{paragraphId}_s{index} or manual_{timestamp}_{suffix}
  en: string;                    // English text
  zh: string;                    // Chinese text

  // Source information
  sourceType: string;            // Source identifier: articleId | 'manual' | custom tag
  sourceIndex?: number;          // Order index in original text (only for article-derived)
  paragraphId?: string;          // Parent paragraph ID (only for article-derived)

  // User practice data
  userTranslationZh?: UserTranslation;  // EN->ZH mode user translation
  userTranslationEn?: UserTranslation;  // ZH->EN mode user translation

  // Metadata
  createdAt: number;             // Creation timestamp
  lastPracticed?: number;        // Last practice timestamp
  tags?: string[];               // User-defined tags (optional, for future extension)
}

/**
 * Sentence store structure for persistence
 */
export interface SentenceStore {
  version: number;               // Data version for migrations
  sentences: SentencePair[];     // All sentence pairs
  lastModified: number;          // Last modification timestamp
}

/**
 * Filter/grouping options for sentences
 */
export type SentenceFilterType =
  | { type: 'article'; articleId: string }   // Filter by article
  | { type: 'time'; order: 'asc' | 'desc' }  // Sort by time
  | { type: 'random'; count?: number }       // Random selection
  | { type: 'tag'; tag: string };            // Filter by tag (reserved)
