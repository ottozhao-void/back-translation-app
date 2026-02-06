/**
 * LLM Task Prompt Registry
 *
 * Each task type defines:
 * - systemPrompt: The system message (can be dynamic based on params)
 * - buildUserMessage: Constructs the user message from params
 * - parseResponse: Parses the raw LLM response into structured data
 */

export interface TaskPromptConfig {
  systemPrompt: string | ((params: Record<string, unknown>) => string);
  buildUserMessage: (params: Record<string, unknown>) => string;
  parseResponse: (raw: unknown) => unknown;
}

/**
 * Registry of all supported LLM tasks and their prompts
 */
export const TASK_PROMPTS: Record<string, TaskPromptConfig> = {

  // ============ Sentence Segmentation (Single Language) ============
  segment: {
    systemPrompt: (params) => `
You are a precise text segmentation assistant. Split the following ${params.language === 'en' ? 'English' : 'Chinese'} text into individual sentences.

Rules:
1. Keep abbreviations intact (Mr., Dr., U.S., etc.)
2. Keep decimal numbers intact (3.14, 2.0, etc.)
3. Keep quoted speech as single units when appropriate
4. Preserve the original text exactly - do not translate or modify
5. Return a JSON object: { "segments": ["sentence1", "sentence2", ...] }

Important: Only return valid JSON, no additional text.
`.trim(),
    buildUserMessage: (params) => String(params.text || ''),
    parseResponse: (raw: unknown) => {
      const data = raw as { segments?: string[] };
      return { segments: Array.isArray(data?.segments) ? data.segments : [] };
    }
  },

  // ============ Semantic Alignment Segmentation (Bilingual) ============
  'segment-align': {
    systemPrompt: `
You are a bilingual text alignment assistant. Given parallel English and Chinese texts, split them into semantically aligned sentence pairs.

Rules:
1. Each pair should contain semantically equivalent content
2. Handle 1:N and N:1 mappings (one sentence in one language may correspond to multiple in the other)
3. Preserve original text exactly - do not modify or correct
4. Return JSON: { "pairs": [{ "en": "...", "zh": "..." }, ...] }

If alignment is ambiguous, prefer keeping related content together rather than splitting.
Important: Only return valid JSON, no additional text.
`.trim(),
    buildUserMessage: (params) => `
English text:
${params.enText || ''}

Chinese text:
${params.zhText || ''}
`.trim(),
    parseResponse: (raw: unknown) => {
      const data = raw as { pairs?: Array<{ en: string; zh: string }> };
      return { pairs: Array.isArray(data?.pairs) ? data.pairs : [] };
    }
  },

  // ============ Translation (Reserved) ============
  translate: {
    systemPrompt: (params) => `
You are a professional translator. Translate the following text from ${params.from || 'English'} to ${params.to || 'Chinese'}.
Maintain the original meaning, tone, and style.
Return JSON: { "translation": "..." }

Important: Only return valid JSON, no additional text.
`.trim(),
    buildUserMessage: (params) => String(params.text || ''),
    parseResponse: (raw: unknown) => {
      const data = raw as { translation?: string };
      return { translation: data?.translation || '' };
    }
  },

  // ============ Translation Scoring (Reserved) ============
  score: {
    systemPrompt: `
You are a translation quality assessor. Compare the user's translation with the reference and provide:
1. A score from 0-100
2. Specific feedback on accuracy, fluency, and style
3. Suggested improvements

Return JSON: { "score": number, "feedback": "...", "suggestions": ["..."] }

Important: Only return valid JSON, no additional text.
`.trim(),
    buildUserMessage: (params) => `
Original: ${params.original || ''}
Reference: ${params.reference || ''}
User's translation: ${params.userTranslation || ''}
`.trim(),
    parseResponse: (raw: unknown) => {
      const data = raw as { score?: number; feedback?: string; suggestions?: string[] };
      return {
        score: typeof data?.score === 'number' ? data.score : 0,
        feedback: data?.feedback || '',
        suggestions: Array.isArray(data?.suggestions) ? data.suggestions : []
      };
    }
  },

  // ============ Custom Task ============
  custom: {
    systemPrompt: (params) => String(params.systemPrompt || 'You are a helpful assistant. Return your response as valid JSON.'),
    buildUserMessage: (params) => String(params.userMessage || ''),
    parseResponse: (raw: unknown) => raw
  }
};

/**
 * Get the prompt configuration for a task type
 */
export function getTaskPromptConfig(taskType: string): TaskPromptConfig | undefined {
  return TASK_PROMPTS[taskType];
}

/**
 * Build the system prompt for a task
 */
export function buildSystemPrompt(taskType: string, params: Record<string, unknown>): string {
  const config = TASK_PROMPTS[taskType];
  if (!config) {
    throw new Error(`Unknown task type: ${taskType}`);
  }

  if (typeof config.systemPrompt === 'function') {
    return config.systemPrompt(params);
  }
  return config.systemPrompt;
}

/**
 * Build the user message for a task
 */
export function buildUserMessage(taskType: string, params: Record<string, unknown>): string {
  const config = TASK_PROMPTS[taskType];
  if (!config) {
    throw new Error(`Unknown task type: ${taskType}`);
  }
  return config.buildUserMessage(params);
}

/**
 * Parse the LLM response for a task
 */
export function parseTaskResponse(taskType: string, raw: unknown): unknown {
  const config = TASK_PROMPTS[taskType];
  if (!config) {
    throw new Error(`Unknown task type: ${taskType}`);
  }
  return config.parseResponse(raw);
}
