/**
 * Default Task Parameters
 *
 * Recommended parameters for each task type.
 * These are auto-applied when a task is first configured.
 */

import { LLMTaskType, LLMModelParams, DEFAULT_MODEL_PARAMS } from '../../../types';

/**
 * Recommended parameters for each task type
 *
 * Lower temperature = more deterministic output
 * Higher temperature = more creative/variable output
 */
export const DEFAULT_TASK_PARAMS: Record<LLMTaskType, Partial<LLMModelParams>> = {
  // Segmentation tasks need deterministic output
  segment: {
    temperature: 0,
    topP: 1,
  },
  'segment-align': {
    temperature: 0,
    topP: 1,
  },

  // Translation needs slight creativity but should be consistent
  translate: {
    temperature: 0.3,
    topP: 0.9,
  },

  // Scoring should be consistent and objective
  score: {
    temperature: 0.2,
    topP: 1,
  },

  // Greetings should be creative and varied
  greeting: {
    temperature: 0.8,
    topP: 0.95,
  },

  // Vocab definitions should be consistent
  'enrich-vocab': {
    temperature: 0.3,
    topP: 1,
  },

  // Pattern extraction needs precision
  'suggest-pattern': {
    temperature: 0.2,
    topP: 1,
  },

  // Analysis should be deterministic
  'analyze-sentence': {
    temperature: 0,
    topP: 1,
  },

  // Custom tasks balanced for general use
  custom: {
    temperature: 0.7,
    topP: 0.9,
  },
} as const;

/**
 * Get recommended params for a task, falling back to defaults
 */
export function getRecommendedParams(taskType: LLMTaskType): Partial<LLMModelParams> {
  return {
    ...DEFAULT_MODEL_PARAMS,
    ...DEFAULT_TASK_PARAMS[taskType],
  };
}

/**
 * Merge user params with recommended params (user takes precedence)
 */
export function mergeWithRecommended(
  taskType: LLMTaskType,
  userParams?: Partial<LLMModelParams>
): Partial<LLMModelParams> {
  const recommended = getRecommendedParams(taskType);
  return {
    ...recommended,
    ...userParams,
  };
}

/**
 * Get the effective params for a task with fallback hierarchy
 */
export function getEffectiveParams(
  taskType: LLMTaskType,
  taskParams?: Partial<LLMModelParams>,
  globalDefaultParams?: Partial<LLMModelParams>
): LLMModelParams {
  const recommended = getRecommendedParams(taskType);
  return {
    ...DEFAULT_MODEL_PARAMS,
    ...recommended,
    ...(globalDefaultParams || {}),
    ...(taskParams || {}),
  };
}
