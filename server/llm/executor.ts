/**
 * LLM Task Executor
 *
 * Core logic for executing LLM tasks via OpenAI and Anthropic APIs
 */

import type { LLMTaskRequest, LLMTaskResponse, LLMModelParams } from '../../types';
import { getProviderConfig, getEffectiveParams } from './providers';
import { buildSystemPrompt, buildUserMessage, parseTaskResponse } from './prompts';
import { validateProviderUrl, sanitizeErrorMessage } from '../../utils/security';

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
 * Execute an LLM task via Anthropic API
 */
async function executeAnthropicRequest(
  provider: { baseUrl: string; apiKey: string },
  modelId: string,
  systemPrompt: string,
  userMessage: string,
  params: LLMModelParams
): Promise<{ success: true; content: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } } | { success: false; error: string }> {
  const apiUrl = `${provider.baseUrl.replace(/\/$/, '')}/v1/messages`;

  // Anthropic API format
  const requestBody: Record<string, unknown> = {
    model: modelId,
    max_tokens: params.maxTokens ?? 4096,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userMessage },
    ],
    temperature: params.temperature,
    top_p: params.topP,
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': provider.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      success: false,
      error: sanitizeErrorMessage(`Anthropic API error (${response.status})`),
    };
  }

  const data = await response.json() as {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const textBlock = data.content?.find((block: { type: string }) => block.type === 'text');
  const content = textBlock?.text;

  if (!content) {
    return {
      success: false,
      error: 'No content in Anthropic response',
    };
  }

  return {
    success: true,
    content,
    usage: data.usage ? {
      promptTokens: data.usage.input_tokens || 0,
      completionTokens: data.usage.output_tokens || 0,
      totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
    } : undefined,
  };
}

/**
 * Execute an LLM task via OpenAI-compatible API
 */
async function executeOpenAIRequest(
  provider: { baseUrl: string; apiKey: string },
  modelId: string,
  systemPrompt: string,
  userMessage: string,
  params: LLMModelParams
): Promise<{ success: true; content: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } } | { success: false; error: string }> {
  const apiUrl = `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`;

  // OpenAI API format
  const requestBody: Record<string, unknown> = {
    model: modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: params.temperature,
    top_p: params.topP,
    frequency_penalty: params.frequencyPenalty,
    presence_penalty: params.presencePenalty,
  };

  // Add optional parameters
  if (params.maxTokens !== undefined) {
    requestBody.max_tokens = params.maxTokens;
  }
  if (params.seed !== undefined) {
    requestBody.seed = params.seed;
  }

  // Request JSON response format if supported
  requestBody.response_format = { type: 'json_object' };

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
      error: sanitizeErrorMessage(`API error (${response.status})`),
    };
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return {
      success: false,
      error: 'No content in LLM response',
    };
  }

  return {
    success: true,
    content,
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens || 0,
      completionTokens: data.usage.completion_tokens || 0,
      totalTokens: data.usage.total_tokens || 0,
    } : undefined,
  };
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

  // 4. Validate provider URL (SSRF protection)
  const urlValidation = validateProviderUrl(provider.baseUrl);
  if (!urlValidation.valid) {
    return {
      success: false,
      error: urlValidation.error || 'Invalid provider URL',
    };
  }

  // 5. Execute request based on provider type
  let result: { success: true; content: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } } | { success: false; error: string };

  if (provider.providerType === 'anthropic') {
    result = await executeAnthropicRequest(provider, modelId, systemPrompt, userMessage, finalParams);
  } else {
    // Default to OpenAI format
    result = await executeOpenAIRequest(provider, modelId, systemPrompt, userMessage, finalParams);
  }

  if (!result.success) {
    return result;
  }

  // 6. Parse JSON response (strip markdown code fences if present)
  let parsedContent: unknown;
  try {
    const cleanedContent = stripMarkdownCodeFences(result.content);
    parsedContent = JSON.parse(cleanedContent);
  } catch {
    return {
      success: false,
      error: `Failed to parse LLM response as JSON: ${result.content.substring(0, 200)}`,
    };
  }

  // 7. Apply task-specific parsing
  const taskData = parseTaskResponse(taskType, parsedContent);

  return {
    success: true,
    data: taskData,
    usage: result.usage,
  };
}

/**
 * Fetch available models from a provider
 */
export async function fetchModels(
  baseUrl: string,
  apiKey: string,
  providerType: 'openai' | 'anthropic' = 'openai'
): Promise<{ success: boolean; models?: string[]; error?: string }> {
  // Validate provider URL (SSRF protection)
  const urlValidation = validateProviderUrl(baseUrl);
  if (!urlValidation.valid) {
    return {
      success: false,
      error: urlValidation.error || 'Invalid provider URL',
    };
  }

  // Anthropic doesn't have a /models endpoint, return known models
  if (providerType === 'anthropic') {
    // Verify API key by making a minimal request
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: sanitizeErrorMessage(`Anthropic API error (${response.status})`),
        };
      }

      // Return known Anthropic models
      return {
        success: true,
        models: [
          'claude-sonnet-4-20250514',
          'claude-3-7-sonnet-20250219',
          'claude-3-5-sonnet-20241022',
          'claude-3-5-sonnet-20240620',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // OpenAI-compatible /models endpoint
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
        error: sanitizeErrorMessage(`API error (${response.status})`),
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
