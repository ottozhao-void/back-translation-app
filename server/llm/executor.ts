/**
 * LLM Task Executor
 *
 * Core logic for executing LLM tasks via OpenAI-compatible APIs
 */

import type { LLMTaskRequest, LLMTaskResponse, LLMModelParams } from '../../types';
import { getProviderConfig, getEffectiveParams } from './providers';
import { buildSystemPrompt, buildUserMessage, parseTaskResponse } from './prompts';

/**
 * Strip markdown code fences from LLM response if present.
 * Some models wrap JSON in ```json ... ``` even with json_object response format.
 */
function stripMarkdownCodeFences(content: string): string {
  const trimmed = content.trim();
  // Match ```json or ``` at start, and ``` at end
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

/**
 * Execute an LLM task
 */
export async function executeLLMTask(request: LLMTaskRequest): Promise<LLMTaskResponse> {
  const { taskType, providerId, modelId, params, modelParams } = request;

  // 1. Get provider configuration
  const provider = getProviderConfig(providerId);
  if (!provider) {
    return {
      success: false,
      error: `Provider not found: ${providerId}`,
    };
  }

  if (!provider.isEnabled) {
    return {
      success: false,
      error: `Provider is disabled: ${provider.name}`,
    };
  }

  // 2. Build prompts
  let systemPrompt: string;
  let userMessage: string;

  try {
    systemPrompt = buildSystemPrompt(taskType, params);
    userMessage = buildUserMessage(taskType, params);
  } catch (error) {
    return {
      success: false,
      error: `Failed to build prompts: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  // 3. Get effective model parameters
  const finalParams: LLMModelParams = getEffectiveParams(taskType, modelParams);

  // 4. Build API request body
  const requestBody: Record<string, unknown> = {
    model: modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: finalParams.temperature,
    top_p: finalParams.topP,
    frequency_penalty: finalParams.frequencyPenalty,
    presence_penalty: finalParams.presencePenalty,
  };

  // Add optional parameters
  if (finalParams.maxTokens !== undefined) {
    requestBody.max_tokens = finalParams.maxTokens;
  }
  if (finalParams.seed !== undefined) {
    requestBody.seed = finalParams.seed;
  }

  // Request JSON response format if supported
  requestBody.response_format = { type: 'json_object' };

  // 5. Call OpenAI-compatible API
  try {
    const apiUrl = `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `API error (${response.status}): ${errorText}`,
      };
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    // 6. Parse response
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return {
        success: false,
        error: 'No content in LLM response',
      };
    }

    // Parse JSON response (strip markdown code fences if present)
    let parsedContent: unknown;
    try {
      const cleanedContent = stripMarkdownCodeFences(content);
      parsedContent = JSON.parse(cleanedContent);
    } catch {
      return {
        success: false,
        error: `Failed to parse LLM response as JSON: ${content.substring(0, 200)}`,
      };
    }

    // Apply task-specific parsing
    const taskData = parseTaskResponse(taskType, parsedContent);

    return {
      success: true,
      data: taskData,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      } : undefined,
    };

  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Fetch available models from a provider
 */
export async function fetchModels(baseUrl: string, apiKey: string): Promise<{ success: boolean; models?: string[]; error?: string }> {
  try {
    const apiUrl = `${baseUrl.replace(/\/$/, '')}/models`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `API error (${response.status}): ${errorText}`,
      };
    }

    const data = await response.json() as { data?: Array<{ id: string }> };

    if (!data.data || !Array.isArray(data.data)) {
      return {
        success: false,
        error: 'Invalid response format from models endpoint',
      };
    }

    // Filter to only include text models (exclude image, audio, embedding models)
    const textModels = data.data
      .map(m => m.id)
      .filter(id => {
        const lower = id.toLowerCase();
        // Exclude non-text models
        return !lower.includes('dall-e') &&
               !lower.includes('whisper') &&
               !lower.includes('tts') &&
               !lower.includes('embedding') &&
               !lower.includes('moderation');
      })
      .sort();

    return {
      success: true,
      models: textModels,
    };

  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
