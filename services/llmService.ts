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
  apiKey: string
): Promise<{ success: boolean; models?: string[]; error?: string }> {
  try {
    const response = await fetch('/api/llm/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl, apiKey }),
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
