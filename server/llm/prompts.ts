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

  // ============ Personalized Greeting ============
  greeting: {
    systemPrompt: (params) => {
      // Use custom prompt if provided, otherwise use default
      if (params.customPrompt) {
        return String(params.customPrompt);
      }
      return `
You are a friendly language learning companion. Generate warm, encouraging greetings for a user practicing English-Chinese translation.

Rules:
1. Create exactly ${params.count || 5} unique greeting messages
2. Each greeting should be 1-2 sentences, friendly and motivating
3. Vary the style: some can be inspiring, some casual, some curious about their progress
4. If the user's name is provided, use it naturally (don't force it into every greeting)
5. IMPORTANT: Each greeting must be in ONE language only - either all English OR all Chinese. Do NOT mix languages within a single greeting.
6. Mix up the languages across greetings (some in English, some in Chinese), but never within the same greeting
7. Reference language learning, translation practice, or bilingual skills
8. Make greetings feel personal and warm, not generic

Return JSON: { "greetings": ["greeting1", "greeting2", ...] }

Important: Only return valid JSON, no additional text.
`.trim();
    },
    buildUserMessage: (params) => {
      const name = params.name ? `User's name: ${params.name}` : 'User has not set a name';
      const time = new Date().getHours();
      let timeOfDay = 'day';
      if (time >= 5 && time < 12) timeOfDay = 'morning';
      else if (time >= 12 && time < 17) timeOfDay = 'afternoon';
      else if (time >= 17 && time < 21) timeOfDay = 'evening';
      else timeOfDay = 'night';

      return `${name}\nTime of day: ${timeOfDay}\nGenerate ${params.count || 5} unique greetings.`;
    },
    parseResponse: (raw: unknown) => {
      const data = raw as { greetings?: string[] };
      return { greetings: Array.isArray(data?.greetings) ? data.greetings : [] };
    }
  },

  // ============ Custom Task ============
  custom: {
    systemPrompt: (params) => String(params.systemPrompt || 'You are a helpful assistant. Return your response as valid JSON.'),
    buildUserMessage: (params) => String(params.userMessage || ''),
    parseResponse: (raw: unknown) => raw
  },

  // ============ Vocabulary Enrichment ============
  'enrich-vocab': {
    systemPrompt: `
You are a bilingual dictionary assistant specializing in English-Chinese language learning.
Given a word or phrase and its context sentence, provide:
1. A clear, learner-friendly English definition
2. A Chinese translation/explanation
3. 2-3 example sentences showing natural usage (with Chinese translations)

Rules:
- Definition should explain meaning AND usage
- Examples should be at intermediate English level
- For collocations, explain what makes this combination special
- Return JSON: {
    "definition": "...",
    "definitionZh": "...",
    "examples": [{ "en": "...", "zh": "..." }, ...]
  }

Important: Only return valid JSON, no additional text.
`.trim(),
    buildUserMessage: (params) => `
Word/Phrase: ${params.text || ''}
Type: ${params.type || 'word'}
Context sentence: ${params.contextSentence || ''}
`.trim(),
    parseResponse: (raw: unknown) => {
      const data = raw as {
        definition?: string;
        definitionZh?: string;
        examples?: Array<{ en: string; zh: string }>;
      };
      return {
        definition: data?.definition || '',
        definitionZh: data?.definitionZh,
        examples: Array.isArray(data?.examples) ? data.examples : [],
      };
    }
  },

  // ============ Pattern Suggestion ============
  'suggest-pattern': {
    systemPrompt: `
You are a grammar pattern expert for English-Chinese language learning.
Analyze the given sentence and identify grammatical patterns worth learning.

For each pattern:
1. Extract the template with slots (use ... for variable parts)
2. Explain how the pattern works
3. Provide the pattern as it appears in the sentence

Rules:
- Focus on useful, common patterns
- Patterns should be transferable to other contexts
- Limit to 1-3 most valuable patterns
- Return JSON: {
    "patterns": [{
      "text": "the original text in sentence",
      "template": "pattern with ... slots",
      "explanation": "how to use this pattern"
    }, ...]
  }

Important: Only return valid JSON, no additional text.
`.trim(),
    buildUserMessage: (params) => `
Sentence (English): ${params.sentenceEn || ''}
Sentence (Chinese): ${params.sentenceZh || ''}
`.trim(),
    parseResponse: (raw: unknown) => {
      const data = raw as {
        patterns?: Array<{
          text: string;
          template: string;
          explanation: string;
        }>;
      };
      return {
        patterns: Array.isArray(data?.patterns) ? data.patterns : [],
      };
    }
  },

  // ============ Quick Word Definition ============
  'define-word': {
    systemPrompt: (params) => {
      const lang = params.language === 'en' ? 'English' : 'Chinese';
      const targetLang = params.language === 'en' ? 'Chinese' : 'English';
      return `You are a concise bilingual dictionary. Given a ${lang} word/character and its sentence context, return:
1. "general": Brief general meaning in English (1 line, under 20 words)
2. "contextual": What it means specifically in this sentence in English (1 line, under 20 words)

For Chinese characters, first identify the full word/phrase the character belongs to, then define that word.

Return JSON: { "general": "...", "contextual": "..." }
Keep responses extremely short. Only return valid JSON, no additional text.`;
    },
    buildUserMessage: (params) => `Word: ${params.word || ''}\nSentence: ${params.sentence || ''}\nLanguage: ${params.language || 'en'}`,
    parseResponse: (raw: unknown) => {
      const data = raw as { general?: string; contextual?: string };
      return {
        general: data?.general || '',
        contextual: data?.contextual || '',
      };
    }
  },

  // ============ Semantic Sentence Analysis ============
  'analyze-sentence': {
    systemPrompt: `
You are a semantic sentence analyzer for English-Chinese language learning.

Analyze the given English sentence and extract:
1. Tokens - individual words with position info
2. Chunks - meaningful multi-word units (collocations, idioms, phrasal verbs)
3. Patterns - reusable grammatical structures

Rules:
- Filter basic stopwords (a, an, the, is, are, was, were, am, be, been, being, he, him, his, she, her, hers, it, its, they, them, their, I, me, my, we, us, our, you, your)
- KEEP prepositions (with, as, for, in, on, at, by, from, to, of) - these are valuable for learners
- For chunks: focus on 2-4 word combinations that have special meaning
- For patterns: extract templates with English explanations AND 2-3 bilingual example sentences
- Only analyze the English text
- Use accurate character positions for tokens (index is the start character position in the original sentence)

Return JSON: {
  "tokens": [
    { "text": "word", "index": 0, "length": 4, "lemma": "word", "isStopword": false }
  ],
  "chunks": [
    { "text": "take for granted", "indices": [3, 4, 5], "type": "idiom" }
  ],
  "patterns": [
    {
      "id": "pattern-1",
      "template": "so ... that ...",
      "explanation": "Used to express cause and effect - 'so' indicates the cause, 'that' introduces the result",
      "examples": [
        { "en": "The book was so interesting that I read it in one day.", "zh": "这本书太有趣了，我一天就读完了。" },
        { "en": "He was so tired that he fell asleep immediately.", "zh": "他太累了，立刻就睡着了。" }
      ],
      "anchors": [
        { "text": "so", "index": 2 },
        { "text": "that", "index": 8 }
      ],
      "matchedText": "so expensive that"
    }
  ]
}

Important: Only return valid JSON, no additional text.
`.trim(),

    buildUserMessage: (params) => {
      const sentence = params.sentence || '';
      const translation = params.translation || '';
      return `English sentence: ${sentence}\nChinese translation (for context): ${translation}`;
    },

    parseResponse: (raw: unknown) => {
      const data = raw as {
        tokens?: Array<{ text: string; index: number; length: number; lemma?: string; isStopword?: boolean }>;
        chunks?: Array<{ text: string; indices: number[]; type: string }>;
        patterns?: Array<{
          id?: string;
          template: string;
          explanation: string;
          examples?: Array<{ en: string; zh: string }>;
          anchors: Array<{ text: string; index: number }>;
          matchedText?: string;
        }>;
      };

      // Validate and normalize tokens
      const tokens = Array.isArray(data?.tokens) ? data.tokens.map(t => ({
        ...t,
        isStopword: t.isStopword ?? false
      })) : [];

      // Validate chunks
      const chunks = Array.isArray(data?.chunks) ? data.chunks.filter(c =>
        ['idiom', 'collocation', 'phrasal_verb'].includes(c.type)
      ) : [];

      // Validate patterns
      const patterns = Array.isArray(data?.patterns) ? data.patterns.map((p, i) => ({
        id: p.id || `pattern-${Date.now()}-${i}`,
        template: p.template,
        explanation: p.explanation,
        examples: Array.isArray(p.examples) ? p.examples : [],
        anchors: p.anchors || [],
        matchedText: p.matchedText || ''
      })) : [];

      return { tokens, chunks, patterns };
    }
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
