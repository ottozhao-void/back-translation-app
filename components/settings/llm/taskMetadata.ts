/**
 * Task Metadata Configuration
 *
 * Defines all AI task types with their display names, descriptions, and categories.
 * This is the single source of truth for task metadata in the UI.
 */

import { LLMTaskType } from '../../../types';

/**
 * Task category types
 */
export type TaskCategory =
  | 'segmentation'   // segment, segment-align
  | 'translation'    // translate, score
  | 'learning'       // greeting, enrich-vocab, suggest-pattern
  | 'analysis'       // analyze-sentence
  | 'general';       // custom

/**
 * Task category information
 */
export interface TaskCategoryInfo {
  id: TaskCategory;
  label: string;
  description: string;
  order: number;
}

/**
 * Task definition metadata
 */
export interface TaskDefinition {
  id: LLMTaskType;
  label: string;
  description: string;
  category: TaskCategory;
  isExperimental?: boolean;
}

/**
 * Category definitions with display order
 */
export const TASK_CATEGORIES: Record<TaskCategory, TaskCategoryInfo> = {
  segmentation: {
    id: 'segmentation',
    label: 'Segmentation',
    description: 'Text splitting and alignment',
    order: 1,
  },
  translation: {
    id: 'translation',
    label: 'Translation',
    description: 'Translation and scoring',
    order: 2,
  },
  learning: {
    id: 'learning',
    label: 'Learning',
    description: 'Vocabulary and patterns',
    order: 3,
  },
  analysis: {
    id: 'analysis',
    label: 'Analysis',
    description: 'Semantic analysis',
    order: 4,
  },
  general: {
    id: 'general',
    label: 'General',
    description: 'Custom tasks',
    order: 5,
  },
} as const;

/**
 * All task definitions
 */
export const TASK_DEFINITIONS: Record<LLMTaskType, TaskDefinition> = {
  segment: {
    id: 'segment',
    label: 'Sentence Segmentation',
    description: 'Split text into individual sentences',
    category: 'segmentation',
  },
  'segment-align': {
    id: 'segment-align',
    label: 'Semantic Alignment',
    description: 'Align bilingual text into sentence pairs',
    category: 'segmentation',
  },
  translate: {
    id: 'translate',
    label: 'Translation',
    description: 'Translate text between languages',
    category: 'translation',
  },
  score: {
    id: 'score',
    label: 'Translation Scoring',
    description: 'Assess translation quality',
    category: 'translation',
  },
  greeting: {
    id: 'greeting',
    label: 'Personalized Greeting',
    description: 'Generate motivational practice greetings',
    category: 'learning',
    isExperimental: true,
  },
  'enrich-vocab': {
    id: 'enrich-vocab',
    label: 'Vocabulary Enrichment',
    description: 'Generate definitions and examples',
    category: 'learning',
  },
  'suggest-pattern': {
    id: 'suggest-pattern',
    label: 'Pattern Suggestion',
    description: 'Extract grammatical patterns',
    category: 'learning',
  },
  'analyze-sentence': {
    id: 'analyze-sentence',
    label: 'Sentence Analysis',
    description: 'Semantic analysis for vocabulary',
    category: 'analysis',
  },
  custom: {
    id: 'custom',
    label: 'Custom Task',
    description: 'User-defined custom prompts',
    category: 'general',
  },
} as const;

/**
 * Get all category info sorted by order
 */
export function getAllCategories(): TaskCategoryInfo[] {
  return Object.values(TASK_CATEGORIES).sort((a, b) => a.order - b.order);
}

/**
 * Get tasks by category
 */
export function getTasksByCategory(category: TaskCategory): TaskDefinition[] {
  return Object.values(TASK_DEFINITIONS).filter(t => t.category === category);
}

/**
 * Get task definition by ID
 */
export function getTaskDefinition(taskType: LLMTaskType): TaskDefinition | undefined {
  return TASK_DEFINITIONS[taskType];
}

/**
 * Get all task definitions
 */
export function getAllTasks(): TaskDefinition[] {
  return Object.values(TASK_DEFINITIONS);
}

/**
 * Check if a task is new (not in existing config)
 */
export function isNewTask(taskType: LLMTaskType, existingConfig?: Record<string, unknown>): boolean {
  return !existingConfig?.[taskType];
}
