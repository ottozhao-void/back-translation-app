export type FeedbackMode = 'diff' | 'llm';

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
  en: string; // English content
  zh: string; // Chinese content
  userTranslationZh?: UserTranslation; // User's Chinese translation (for EN_TO_ZH)
  userTranslationEn?: UserTranslation; // User's English translation (for ZH_TO_EN)
  lastPracticed?: number; // Timestamp
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

export enum DiffType {
  MATCH = 'MATCH',
  INSERT = 'INSERT',
  DELETE = 'DELETE',
  SUBSTITUTE = 'SUBSTITUTE'
}

export interface DiffPart {
  type: DiffType;
  value: string;
}
