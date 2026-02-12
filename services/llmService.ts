/**
 * LLM Service - Frontend abstraction for LLM API calls
 *
 * Provides a clean interface for executing LLM tasks from the frontend
 */

import type {
  LLMSettings,
  LLMProviderConfig,
  LLMTaskType,
  LLMTaskRequest,
  LLMTaskResponse,
  LLMModelParams,
  DEFAULT_LLM_SETTINGS,
} from '../types';
import { splitIntoSentences } from '../utils/textUtils';

// Re-export types for convenience
export type { LLMSettings, LLMProviderConfig, LLMTaskResponse };

/**
 * Fetch available models from a provider
 */
export async function fetchModels(
  baseUrl: string,
  apiKey: string,
  providerType?: 'openai' | 'anthropic'
): Promise<{ success: boolean; models?: string[]; error?: string }> {
  try {
    const response = await fetch('/api/llm/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl, apiKey, providerType }),
    });
    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Execute an LLM task
 */
export async function executeTask<T = unknown>(
  taskType: LLMTaskType,
  providerId: string,
  modelId: string,
  params: Record<string, unknown>,
  modelParams?: Partial<LLMModelParams>
): Promise<LLMTaskResponse<T>> {
  try {
    const request: LLMTaskRequest = {
      taskType,
      providerId,
      modelId,
      params,
      modelParams,
    };

    const response = await fetch('/api/llm/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get current LLM configuration
 */
export async function getConfig(): Promise<{ success: boolean; config?: LLMSettings; error?: string }> {
  try {
    const response = await fetch('/api/llm/config');
    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Save LLM configuration
 */
export async function saveConfig(config: LLMSettings): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/llm/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    });
    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Save a provider configuration
 */
export async function saveProvider(provider: LLMProviderConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/llm/provider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });
    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Delete a provider
 */
export async function deleteProvider(providerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/llm/provider?id=${encodeURIComponent(providerId)}`, {
      method: 'DELETE',
    });
    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ============ Convenience Methods ============

export interface SegmentationResult {
  success: boolean;
  segments: string[];
  usedFallback: boolean;
  error?: string;
}

/**
 * Segment text into sentences using LLM with regex fallback
 */
export async function segmentText(
  text: string,
  language: 'en' | 'zh',
  providerId?: string,
  modelId?: string
): Promise<SegmentationResult> {
  if (!text.trim()) {
    return { success: true, segments: [], usedFallback: false };
  }

  // If no provider/model specified, try to get defaults from config
  if (!providerId || !modelId) {
    const configResult = await getConfig();
    if (configResult.success && configResult.config) {
      const config = configResult.config;
      const taskConfig = config.taskModels?.segment;
      providerId = taskConfig?.providerId || config.defaultProvider;
      modelId = taskConfig?.modelId || config.defaultModel;
    }
  }

  // If still no provider, fall back to regex
  if (!providerId || !modelId) {
    console.warn('No LLM provider configured, using regex fallback');
    return {
      success: true,
      segments: splitIntoSentences(text),
      usedFallback: true,
    };
  }

  try {
    const result = await executeTask<{ segments: string[] }>(
      'segment',
      providerId,
      modelId,
      { text, language }
    );

    if (result.success && result.data?.segments) {
      return {
        success: true,
        segments: result.data.segments,
        usedFallback: false,
      };
    } else {
      // LLM failed, use fallback
      console.warn('LLM segmentation failed, using fallback:', result.error);
      return {
        success: true,
        segments: splitIntoSentences(text),
        usedFallback: true,
        error: result.error,
      };
    }
  } catch (error) {
    console.warn('LLM segmentation error, using fallback:', error);
    return {
      success: true,
      segments: splitIntoSentences(text),
      usedFallback: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export interface AlignmentResult {
  success: boolean;
  pairs: Array<{ en: string; zh: string }>;
  usedFallback: boolean;
  error?: string;
}

/**
 * Segment and align bilingual text using LLM
 */
export async function segmentAndAlign(
  enText: string,
  zhText: string,
  providerId?: string,
  modelId?: string
): Promise<AlignmentResult> {
  if (!enText.trim() && !zhText.trim()) {
    return { success: true, pairs: [], usedFallback: false };
  }

  // Get default provider/model if not specified
  if (!providerId || !modelId) {
    const configResult = await getConfig();
    if (configResult.success && configResult.config) {
      const config = configResult.config;
      const taskConfig = config.taskModels?.['segment-align'];
      providerId = taskConfig?.providerId || config.defaultProvider;
      modelId = taskConfig?.modelId || config.defaultModel;
    }
  }

  // If no provider, fall back to independent segmentation
  if (!providerId || !modelId) {
    console.warn('No LLM provider configured, using independent segmentation fallback');
    const enSegments = splitIntoSentences(enText);
    const zhSegments = splitIntoSentences(zhText);
    const maxLen = Math.max(enSegments.length, zhSegments.length);
    const pairs: Array<{ en: string; zh: string }> = [];
    for (let i = 0; i < maxLen; i++) {
      pairs.push({
        en: enSegments[i] || '',
        zh: zhSegments[i] || '',
      });
    }
    return { success: true, pairs, usedFallback: true };
  }

  try {
    const result = await executeTask<{ pairs: Array<{ en: string; zh: string }> }>(
      'segment-align',
      providerId,
      modelId,
      { enText, zhText }
    );

    if (result.success && result.data?.pairs) {
      return {
        success: true,
        pairs: result.data.pairs,
        usedFallback: false,
      };
    } else {
      // Fall back to independent segmentation
      console.warn('LLM alignment failed, using fallback:', result.error);
      const enSegments = splitIntoSentences(enText);
      const zhSegments = splitIntoSentences(zhText);
      const maxLen = Math.max(enSegments.length, zhSegments.length);
      const pairs: Array<{ en: string; zh: string }> = [];
      for (let i = 0; i < maxLen; i++) {
        pairs.push({
          en: enSegments[i] || '',
          zh: zhSegments[i] || '',
        });
      }
      return {
        success: true,
        pairs,
        usedFallback: true,
        error: result.error,
      };
    }
  } catch (error) {
    console.warn('LLM alignment error, using fallback:', error);
    const enSegments = splitIntoSentences(enText);
    const zhSegments = splitIntoSentences(zhText);
    const maxLen = Math.max(enSegments.length, zhSegments.length);
    const pairs: Array<{ en: string; zh: string }> = [];
    for (let i = 0; i < maxLen; i++) {
      pairs.push({
        en: enSegments[i] || '',
        zh: zhSegments[i] || '',
      });
    }
    return {
      success: true,
      pairs,
      usedFallback: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Segment both EN and ZH texts independently in parallel
 */
export async function segmentBothTexts(
  enText: string,
  zhText: string,
  providerId?: string,
  modelId?: string
): Promise<{ en: SegmentationResult; zh: SegmentationResult }> {
  const [en, zh] = await Promise.all([
    segmentText(enText, 'en', providerId, modelId),
    segmentText(zhText, 'zh', providerId, modelId),
  ]);
  return { en, zh };
}

// ============ Translation ============

export interface TranslationResult {
  success: boolean;
  translation: string;
  error?: string;
}

/**
 * Translate text using LLM
 * @param text - Text to translate
 * @param from - Source language ('en' or 'zh')
 * @param to - Target language ('en' or 'zh')
 */
export async function translateText(
  text: string,
  from: 'en' | 'zh',
  to: 'en' | 'zh',
  providerId?: string,
  modelId?: string
): Promise<TranslationResult> {
  if (!text.trim()) {
    return { success: true, translation: '' };
  }

  // Get default provider/model if not specified
  if (!providerId || !modelId) {
    const configResult = await getConfig();
    if (configResult.success && configResult.config) {
      const config = configResult.config;
      const taskConfig = config.taskModels?.translate;
      providerId = taskConfig?.providerId || config.defaultProvider;
      modelId = taskConfig?.modelId || config.defaultModel;
    }
  }

  // If no provider configured, return error
  if (!providerId || !modelId) {
    return {
      success: false,
      translation: '',
      error: 'No LLM provider configured. Please configure one in Settings → AI Models.',
    };
  }

  try {
    const fromLang = from === 'en' ? 'English' : 'Chinese';
    const toLang = to === 'en' ? 'English' : 'Chinese';

    const result = await executeTask<{ translation: string }>(
      'translate',
      providerId,
      modelId,
      { text, from: fromLang, to: toLang }
    );

    if (result.success && result.data?.translation) {
      return {
        success: true,
        translation: result.data.translation,
      };
    } else {
      return {
        success: false,
        translation: '',
        error: result.error || 'Translation failed',
      };
    }
  } catch (error) {
    return {
      success: false,
      translation: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============ Greeting Generation ============

export interface GreetingResult {
  success: boolean;
  greetings: string[];
  usedFallback: boolean;
  error?: string;
}

const DEFAULT_GREETINGS = [
  "Ready to sharpen your translation skills today?",
  "Welcome back! Every sentence you practice makes you stronger.",
  "Good to see you! Let's bridge languages together.",
  "Translation is an art. Ready to create today?",
  "每一次练习都是进步 — Let's begin!",
];

/**
 * Generate personalized greetings using LLM with fallback defaults
 */
export async function generateGreetings(
  userName?: string,
  customPrompt?: string,
  count: number = 5,
  providerId?: string,
  modelId?: string
): Promise<GreetingResult> {
  // If no provider/model specified, try to get defaults from config
  if (!providerId || !modelId) {
    const configResult = await getConfig();
    if (configResult.success && configResult.config) {
      const config = configResult.config;
      const taskConfig = config.taskModels?.greeting;
      providerId = taskConfig?.providerId || config.defaultProvider;
      modelId = taskConfig?.modelId || config.defaultModel;
    }
  }

  // If still no provider, use default greetings
  if (!providerId || !modelId) {
    console.warn('No LLM provider configured, using default greetings');
    return {
      success: true,
      greetings: DEFAULT_GREETINGS,
      usedFallback: true,
    };
  }

  try {
    // Replace {{name}} placeholder in custom prompt if provided
    const processedPrompt = customPrompt
      ? customPrompt.replace(/\{\{name\}\}/g, userName || 'the user')
      : undefined;

    const result = await executeTask<{ greetings: string[] }>(
      'greeting',
      providerId,
      modelId,
      {
        name: userName,
        customPrompt: processedPrompt,
        count,
      }
    );

    if (result.success && result.data?.greetings && result.data.greetings.length > 0) {
      return {
        success: true,
        greetings: result.data.greetings,
        usedFallback: false,
      };
    } else {
      console.warn('LLM greeting generation failed, using defaults:', result.error);
      return {
        success: true,
        greetings: DEFAULT_GREETINGS,
        usedFallback: true,
        error: result.error,
      };
    }
  } catch (error) {
    console.warn('LLM greeting error, using defaults:', error);
    return {
      success: true,
      greetings: DEFAULT_GREETINGS,
      usedFallback: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============ Translation Feedback ============

export interface FeedbackResult {
  success: boolean;
  data?: {
    score: number;
    feedback: string;
    suggestions: string[];
  };
  error?: string;
}

/**
 * Get LLM feedback on a user's translation
 * Uses the 'score' task type to evaluate translation quality
 *
 * @param original - The original text (source language)
 * @param reference - The reference translation
 * @param userTranslation - The user's translation attempt
 */
export async function getTranslationFeedback(
  original: string,
  reference: string,
  userTranslation: string,
  providerId?: string,
  modelId?: string
): Promise<FeedbackResult> {
  if (!userTranslation.trim()) {
    return {
      success: false,
      error: 'No translation provided',
    };
  }

  // Get default provider/model if not specified
  if (!providerId || !modelId) {
    const configResult = await getConfig();
    if (configResult.success && configResult.config) {
      const config = configResult.config;
      const taskConfig = config.taskModels?.score;
      providerId = taskConfig?.providerId || config.defaultProvider;
      modelId = taskConfig?.modelId || config.defaultModel;
    }
  }

  // If no provider configured, return error
  if (!providerId || !modelId) {
    return {
      success: false,
      error: 'No LLM provider configured. Please configure one in Settings → AI Models.',
    };
  }

  try {
    const result = await executeTask<{ score: number; feedback: string; suggestions: string[] }>(
      'score',
      providerId,
      modelId,
      { original, reference, userTranslation }
    );

    if (result.success && result.data) {
      return {
        success: true,
        data: {
          score: typeof result.data.score === 'number' ? result.data.score : 0,
          feedback: result.data.feedback || '',
          suggestions: Array.isArray(result.data.suggestions) ? result.data.suggestions : [],
        },
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to get feedback',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============ Quick Word Definition ============

export interface DefineWordResult {
  success: boolean;
  data?: { general: string; contextual: string };
  error?: string;
}

/**
 * Quick word definition lookup during practice
 * @param word - The word or character to define
 * @param sentence - The sentence context
 * @param language - 'en' or 'zh'
 */
export async function defineWord(
  word: string,
  sentence: string,
  language: 'en' | 'zh',
  providerId?: string,
  modelId?: string
): Promise<DefineWordResult> {
  if (!word.trim()) {
    return { success: false, error: 'No word provided' };
  }

  // Get default provider/model if not specified
  if (!providerId || !modelId) {
    const configResult = await getConfig();
    if (configResult.success && configResult.config) {
      const config = configResult.config;
      const taskConfig = config.taskModels?.['define-word'];
      providerId = taskConfig?.providerId || config.defaultProvider;
      modelId = taskConfig?.modelId || config.defaultModel;
    }
  }

  if (!providerId || !modelId) {
    return {
      success: false,
      error: 'No LLM provider configured. Please configure one in Settings → AI Models.',
    };
  }

  try {
    const result = await executeTask<{ general: string; contextual: string }>(
      'define-word',
      providerId,
      modelId,
      { word, sentence, language }
    );

    if (result.success && result.data) {
      return {
        success: true,
        data: {
          general: result.data.general || '',
          contextual: result.data.contextual || '',
        },
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to define word',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============ Vocabulary Enrichment ============

export interface EnrichVocabResult {
  success: boolean;
  data?: {
    definition: string;
    definitionZh?: string;
    examples: Array<{ en: string; zh: string }>;
  };
  error?: string;
}

/**
 * Enrich a vocabulary item with LLM-generated definition and examples
 * @param text - The word or phrase to define
 * @param type - 'word' | 'collocation' | 'pattern'
 * @param contextSentence - The sentence where this vocabulary was found
 */
export async function enrichVocabulary(
  text: string,
  type: 'word' | 'collocation' | 'pattern',
  contextSentence: string,
  providerId?: string,
  modelId?: string
): Promise<EnrichVocabResult> {
  if (!text.trim()) {
    return { success: false, error: 'No text provided' };
  }

  // Get default provider/model if not specified
  if (!providerId || !modelId) {
    const configResult = await getConfig();
    if (configResult.success && configResult.config) {
      const config = configResult.config;
      const taskConfig = config.taskModels?.['enrich-vocab'];
      providerId = taskConfig?.providerId || config.defaultProvider;
      modelId = taskConfig?.modelId || config.defaultModel;
    }
  }

  // If no provider configured, return error
  if (!providerId || !modelId) {
    return {
      success: false,
      error: 'No LLM provider configured. Please configure one in Settings → AI Models.',
    };
  }

  try {
    const result = await executeTask<{
      definition: string;
      definitionZh?: string;
      examples: Array<{ en: string; zh: string }>;
    }>('enrich-vocab', providerId, modelId, { text, type, contextSentence });

    if (result.success && result.data) {
      return {
        success: true,
        data: {
          definition: result.data.definition || '',
          definitionZh: result.data.definitionZh,
          examples: Array.isArray(result.data.examples) ? result.data.examples : [],
        },
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to enrich vocabulary',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============ Pattern Suggestion ============

export interface SuggestPatternResult {
  success: boolean;
  patterns?: Array<{
    text: string;
    template: string;
    explanation: string;
  }>;
  error?: string;
}

/**
 * Suggest grammatical patterns from a sentence using LLM
 * @param sentenceEn - The English sentence to analyze
 * @param sentenceZh - The Chinese translation for context
 */
export async function suggestPatterns(
  sentenceEn: string,
  sentenceZh: string,
  providerId?: string,
  modelId?: string
): Promise<SuggestPatternResult> {
  if (!sentenceEn.trim()) {
    return { success: false, error: 'No sentence provided' };
  }

  // Get default provider/model if not specified
  if (!providerId || !modelId) {
    const configResult = await getConfig();
    if (configResult.success && configResult.config) {
      const config = configResult.config;
      const taskConfig = config.taskModels?.['suggest-pattern'];
      providerId = taskConfig?.providerId || config.defaultProvider;
      modelId = taskConfig?.modelId || config.defaultModel;
    }
  }

  // If no provider configured, return error
  if (!providerId || !modelId) {
    return {
      success: false,
      error: 'No LLM provider configured. Please configure one in Settings → AI Models.',
    };
  }

  try {
    const result = await executeTask<{
      patterns: Array<{
        text: string;
        template: string;
        explanation: string;
      }>;
    }>('suggest-pattern', providerId, modelId, { sentenceEn, sentenceZh });

    if (result.success && result.data) {
      return {
        success: true,
        patterns: Array.isArray(result.data.patterns) ? result.data.patterns : [],
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to suggest patterns',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============ Semantic Sentence Analysis ============

export interface AnalyzeSentenceResult {
  success: boolean;
  data?: {
    tokens: Array<{
      text: string;
      index: number;
      length: number;
      lemma?: string;
      isStopword: boolean;
    }>;
    chunks: Array<{
      text: string;
      indices: number[];
      type: 'idiom' | 'collocation' | 'phrasal_verb';
    }>;
    patterns: Array<{
      id: string;
      template: string;
      explanation: string;
      examples: Array<{ en: string; zh: string }>;
      anchors: Array<{ text: string; index: number }>;
      matchedText: string;
    }>;
  };
  error?: string;
}

/**
 * Analyze a sentence to extract semantic units (tokens, chunks, patterns)
 * @param sentenceEn - The English sentence to analyze
 * @param sentenceZh - The Chinese translation for context
 */
export async function analyzeSentence(
  sentenceEn: string,
  sentenceZh: string,
  providerId?: string,
  modelId?: string
): Promise<AnalyzeSentenceResult> {
  if (!sentenceEn.trim()) {
    return { success: false, error: 'No sentence provided' };
  }

  // Get default provider/model if not specified
  if (!providerId || !modelId) {
    const configResult = await getConfig();
    if (configResult.success && configResult.config) {
      const config = configResult.config;
      const taskConfig = config.taskModels?.['analyze-sentence'];
      providerId = taskConfig?.providerId || config.defaultProvider;
      modelId = taskConfig?.modelId || config.defaultModel;
    }
  }

  // If no provider configured, return error
  if (!providerId || !modelId) {
    return {
      success: false,
      error: 'No LLM provider configured. Please configure one in Settings → AI Models.',
    };
  }

  try {
    const result = await executeTask<{
      tokens: Array<{
        text: string;
        index: number;
        length: number;
        lemma?: string;
        isStopword: boolean;
      }>;
      chunks: Array<{
        text: string;
        indices: number[];
        type: 'idiom' | 'collocation' | 'phrasal_verb';
      }>;
      patterns: Array<{
        id: string;
        template: string;
        explanation: string;
        examples: Array<{ en: string; zh: string }>;
        anchors: Array<{ text: string; index: number }>;
        matchedText: string;
      }>;
    }>('analyze-sentence', providerId, modelId, { sentence: sentenceEn, translation: sentenceZh });

    if (result.success && result.data) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to analyze sentence',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
