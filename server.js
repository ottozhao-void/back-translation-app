import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { safeJsonParse, validateFilename, sanitizeErrorMessage, SENTENCE_STORE_SCHEMA, TAG_STORE_SCHEMA, VOCABULARY_STORE_SCHEMA } from './utils/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json({ limit: '50mb' }));

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

const articlesDir = path.join(__dirname, 'public', 'articles');
const distArticlesDir = path.join(__dirname, 'dist', 'articles');
const dataDir = path.join(__dirname, 'public', 'data');
const distDataDir = path.join(__dirname, 'dist', 'data');
const sentencesFile = path.join(dataDir, 'sentences.json');
const distSentencesFile = path.join(distDataDir, 'sentences.json');
const tagsFile = path.join(dataDir, 'tags.json');
const distTagsFile = path.join(distDataDir, 'tags.json');
const vocabularyFile = path.join(dataDir, 'vocabulary.json');
const distVocabularyFile = path.join(distDataDir, 'vocabulary.json');
const llmConfigDir = path.join(__dirname, 'data');
const llmConfigFile = path.join(llmConfigDir, 'llm-config.json');

// Ensure directories exist
if (!fs.existsSync(articlesDir)) fs.mkdirSync(articlesDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(llmConfigDir)) fs.mkdirSync(llmConfigDir, { recursive: true });

// === LLM Helper Functions ===

const DEFAULT_MODEL_PARAMS = {
  temperature: 0,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

const DEFAULT_LLM_SETTINGS = {
  providers: [],
  defaultParams: DEFAULT_MODEL_PARAMS,
  taskModels: {},
};

function loadLLMSettings() {
  try {
    if (fs.existsSync(llmConfigFile)) {
      const content = fs.readFileSync(llmConfigFile, 'utf-8');
      const parsed = safeJsonParse(content);
      if (!parsed) {
        console.error('Failed to parse LLM settings: invalid JSON');
        return { ...DEFAULT_LLM_SETTINGS };
      }
      return { ...DEFAULT_LLM_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load LLM settings:', e);
  }
  return { ...DEFAULT_LLM_SETTINGS };
}

function saveLLMSettings(settings) {
  try {
    fs.writeFileSync(llmConfigFile, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Failed to save LLM settings:', e);
    return false;
  }
}

// === LLM API Routes ===

// POST /api/llm/models - Fetch available models from a provider
app.post('/api/llm/models', async (req, res) => {
  try {
    const { baseUrl, apiKey, providerType } = req.body;
    if (!baseUrl || !apiKey) {
      return res.status(400).json({ success: false, error: 'Missing baseUrl or apiKey' });
    }

    // Anthropic doesn't have a /models endpoint
    if (providerType === 'anthropic') {
      // Verify API key with a minimal request
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
          return res.status(400).json({ success: false, error: `Anthropic API error (${response.status})` });
        }

        // Return known Anthropic models
        return res.json({
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
        });
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
      }
    }

    // OpenAI-compatible /models endpoint
    const apiUrl = `${baseUrl.replace(/\/$/, '')}/models`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(400).json({ success: false, error: `API error (${response.status}): ${errorText}` });
    }

    const data = await response.json();
    if (!data.data || !Array.isArray(data.data)) {
      return res.status(400).json({ success: false, error: 'Invalid response format' });
    }

    const textModels = data.data
      .map(m => m.id)
      .filter(id => {
        const lower = id.toLowerCase();
        return !lower.includes('dall-e') && !lower.includes('whisper') &&
               !lower.includes('tts') && !lower.includes('embedding') &&
               !lower.includes('moderation');
      })
      .sort();

    res.json({ success: true, models: textModels });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/llm/execute - Execute an LLM task
app.post('/api/llm/execute', async (req, res) => {
  try {
    const { taskType, providerId, modelId, params, modelParams } = req.body;
    if (!taskType || !providerId || !modelId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const settings = loadLLMSettings();
    const provider = settings.providers.find(p => p.id === providerId);
    if (!provider) {
      return res.status(400).json({ success: false, error: `Provider not found: ${providerId}` });
    }

    // Migrate old provider configs without providerType
    const providerType = provider.providerType ||
      (provider.baseUrl?.includes('anthropic.com') ? 'anthropic' : 'openai');

    // Build prompts based on task type
    let systemPrompt, userMessage;
    if (taskType === 'segment') {
      const lang = params.language === 'en' ? 'English' : 'Chinese';
      systemPrompt = `You are a precise text segmentation assistant. Split the following ${lang} text into individual sentences.
Rules:
1. Keep abbreviations intact (Mr., Dr., U.S., etc.)
2. Keep decimal numbers intact (3.14, 2.0, etc.)
3. Keep quoted speech as single units when appropriate
4. Preserve the original text exactly
5. Return JSON: { "segments": ["sentence1", "sentence2", ...] }`;
      userMessage = params.text || '';
    } else if (taskType === 'segment-align') {
      systemPrompt = `You are a bilingual text alignment assistant. Split parallel English and Chinese texts into aligned sentence pairs.
Rules:
1. Each pair should contain semantically equivalent content
2. Handle 1:N and N:1 mappings
3. Preserve original text exactly
4. Return JSON: { "pairs": [{ "en": "...", "zh": "..." }, ...] }`;
      userMessage = `English text:\n${params.enText || ''}\n\nChinese text:\n${params.zhText || ''}`;
    } else {
      return res.status(400).json({ success: false, error: `Unknown task type: ${taskType}` });
    }

    // Merge model parameters
    const finalParams = {
      ...DEFAULT_MODEL_PARAMS,
      ...settings.defaultParams,
      ...(modelParams || {}),
    };

    let content, usage;

    if (providerType === 'anthropic') {
      // Anthropic API format
      const requestBody = {
        model: modelId,
        max_tokens: finalParams.maxTokens || 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        temperature: finalParams.temperature,
        top_p: finalParams.topP,
      };

      const apiUrl = `${provider.baseUrl.replace(/\/$/, '')}/v1/messages`;
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
        return res.status(400).json({ success: false, error: `API error: ${errorText}` });
      }

      const data = await response.json();
      const textBlock = data.content?.find(b => b.type === 'text');
      content = textBlock?.text;
      usage = data.usage ? {
        promptTokens: data.usage.input_tokens || 0,
        completionTokens: data.usage.output_tokens || 0,
        totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
      } : undefined;
    } else {
      // OpenAI-compatible API format
      const requestBody = {
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: finalParams.temperature,
        top_p: finalParams.topP,
        frequency_penalty: finalParams.frequencyPenalty,
        presence_penalty: finalParams.presencePenalty,
        response_format: { type: 'json_object' },
      };

      if (finalParams.maxTokens) requestBody.max_tokens = finalParams.maxTokens;
      if (finalParams.seed) requestBody.seed = finalParams.seed;

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
        return res.status(400).json({ success: false, error: `API error: ${errorText}` });
      }

      const data = await response.json();
      content = data.choices?.[0]?.message?.content;
      usage = data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      } : undefined;
    }

    if (!content) {
      return res.status(400).json({ success: false, error: 'No content in response' });
    }

    // Strip markdown code fences if present
    let cleanedContent = content.trim();
    const fenceMatch = cleanedContent.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
    if (fenceMatch) cleanedContent = fenceMatch[1].trim();

    const parsedContent = JSON.parse(cleanedContent);
    res.json({
      success: true,
      data: parsedContent,
      usage,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/llm/config - Get LLM configuration
app.get('/api/llm/config', (req, res) => {
  try {
    const settings = loadLLMSettings();
    // Mask API keys
    const maskedSettings = {
      ...settings,
      providers: settings.providers.map(p => ({
        ...p,
        apiKey: p.apiKey ? '***' + p.apiKey.slice(-4) : '',
      })),
    };
    res.json({ success: true, config: maskedSettings });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/llm/config - Save LLM configuration
app.post('/api/llm/config', (req, res) => {
  try {
    const { config } = req.body;
    if (!config) {
      return res.status(400).json({ success: false, error: 'Missing config' });
    }
    const success = saveLLMSettings(config);
    res.json({ success, error: success ? undefined : 'Failed to save' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/llm/provider - Save a provider
app.post('/api/llm/provider', (req, res) => {
  try {
    const { provider } = req.body;
    if (!provider || !provider.id) {
      return res.status(400).json({ success: false, error: 'Missing provider' });
    }
    const settings = loadLLMSettings();
    const idx = settings.providers.findIndex(p => p.id === provider.id);
    if (idx >= 0) {
      settings.providers[idx] = provider;
    } else {
      settings.providers.push(provider);
    }
    const success = saveLLMSettings(settings);
    res.json({ success });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/llm/provider - Delete a provider
app.delete('/api/llm/provider', (req, res) => {
  try {
    const providerId = req.query.id;
    if (!providerId) {
      return res.status(400).json({ success: false, error: 'Missing id' });
    }
    const settings = loadLLMSettings();
    settings.providers = settings.providers.filter(p => p.id !== providerId);
    const success = saveLLMSettings(settings);
    res.json({ success });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// === Tag API Routes ===

const DEFAULT_TAG_STORE = { version: 1, userTags: [], lastModified: Date.now() };

function loadTagStore() {
  try {
    if (fs.existsSync(tagsFile)) {
      const content = fs.readFileSync(tagsFile, 'utf-8');
      const parsed = safeJsonParse(content);
      return parsed || { ...DEFAULT_TAG_STORE };
    }
  } catch (e) {
    console.error('Failed to load tags:', e);
  }
  return { ...DEFAULT_TAG_STORE };
}

function saveTagStore(store) {
  const content = JSON.stringify(store, null, 2);
  fs.writeFileSync(tagsFile, content);
  if (fs.existsSync(distDataDir)) {
    fs.writeFileSync(distTagsFile, content);
  }
}

// GET /api/tags - Get all user tags
app.get('/api/tags', (req, res) => {
  try {
    const store = loadTagStore();
    res.json({ success: true, data: store.userTags || [] });
  } catch (e) {
    console.error('Failed to get tags:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/tags - Create new user tag
app.post('/api/tags', (req, res) => {
  try {
    const { label, color } = req.body;

    if (!label || typeof label !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid label' });
    }

    const store = loadTagStore();
    const newTag = {
      id: `tag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: label.trim(),
      color: color || '#3b82f6',
      isSystem: false,
      createdAt: Date.now(),
    };

    store.userTags = store.userTags || [];
    store.userTags.push(newTag);
    store.lastModified = Date.now();
    saveTagStore(store);

    res.json({ success: true, data: newTag });
  } catch (e) {
    console.error('Failed to create tag:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/tags - Delete user tag
app.delete('/api/tags', (req, res) => {
  try {
    const tagId = req.query.id;
    if (!tagId) {
      return res.status(400).json({ success: false, error: 'Missing tag id' });
    }

    // Prevent deleting system tags
    if (tagId.startsWith('_')) {
      return res.status(400).json({ success: false, error: 'Cannot delete system tags' });
    }

    const store = loadTagStore();
    const initialLength = store.userTags?.length || 0;
    store.userTags = (store.userTags || []).filter(t => t.id !== tagId);

    if (store.userTags.length === initialLength) {
      return res.status(404).json({ success: false, error: 'Tag not found' });
    }

    store.lastModified = Date.now();
    saveTagStore(store);

    res.json({ success: true });
  } catch (e) {
    console.error('Failed to delete tag:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// PATCH /api/tags/:id - Update user tag
app.patch('/api/tags/:id', (req, res) => {
  try {
    const tagId = req.params.id;

    // Prevent updating system tags
    if (tagId.startsWith('_')) {
      return res.status(400).json({ success: false, error: 'Cannot update system tags' });
    }

    const store = loadTagStore();
    const index = (store.userTags || []).findIndex(t => t.id === tagId);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Tag not found' });
    }

    const updates = req.body;
    // Only allow updating label and color
    if (updates.label) store.userTags[index].label = updates.label.trim();
    if (updates.color) store.userTags[index].color = updates.color;

    store.lastModified = Date.now();
    saveTagStore(store);

    res.json({ success: true, data: store.userTags[index] });
  } catch (e) {
    console.error('Failed to update tag:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// === Vocabulary API Routes ===

const DEFAULT_VOCABULARY_STORE = { version: 1, items: [], lastModified: Date.now() };

function loadVocabularyStore() {
  try {
    if (fs.existsSync(vocabularyFile)) {
      const content = fs.readFileSync(vocabularyFile, 'utf-8');
      const parsed = safeJsonParse(content);
      return parsed || { ...DEFAULT_VOCABULARY_STORE };
    }
  } catch (e) {
    console.error('Failed to load vocabulary:', e);
  }
  return { ...DEFAULT_VOCABULARY_STORE };
}

function saveVocabularyStore(store) {
  const content = JSON.stringify(store, null, 2);
  fs.writeFileSync(vocabularyFile, content);
  if (fs.existsSync(distDataDir)) {
    fs.writeFileSync(distVocabularyFile, content);
  }
}

// GET /api/vocabulary - Get all vocabulary items
app.get('/api/vocabulary', (req, res) => {
  try {
    const store = loadVocabularyStore();
    res.json({ success: true, data: store });
  } catch (e) {
    console.error('Failed to get vocabulary:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/vocabulary - Save full vocabulary store
app.post('/api/vocabulary', (req, res) => {
  try {
    const store = req.body;
    if (!store || !Array.isArray(store.items)) {
      return res.status(400).json({ success: false, error: 'Invalid vocabulary store format' });
    }
    store.lastModified = Date.now();
    saveVocabularyStore(store);
    res.json({ success: true, count: store.items.length });
  } catch (e) {
    console.error('Failed to save vocabulary:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/vocabulary/:id - Get single vocabulary item
app.get('/api/vocabulary/:id', (req, res) => {
  try {
    const { id } = req.params;
    const store = loadVocabularyStore();
    const item = (store.items || []).find(v => v.id === id);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Vocabulary item not found' });
    }

    res.json({ success: true, data: item });
  } catch (e) {
    console.error('Failed to get vocabulary item:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// PATCH /api/vocabulary/:id - Update single vocabulary item
app.patch('/api/vocabulary/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const store = loadVocabularyStore();
    const index = (store.items || []).findIndex(v => v.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Vocabulary item not found' });
    }

    // Merge updates into existing item
    store.items[index] = { ...store.items[index], ...updates, updatedAt: Date.now() };
    store.lastModified = Date.now();
    saveVocabularyStore(store);

    res.json({ success: true, data: store.items[index] });
  } catch (e) {
    console.error('Failed to patch vocabulary item:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/vocabulary/:id - Delete single vocabulary item
app.delete('/api/vocabulary/:id', (req, res) => {
  try {
    const { id } = req.params;

    const store = loadVocabularyStore();
    const initialLength = store.items?.length || 0;
    store.items = (store.items || []).filter(v => v.id !== id);

    if (store.items.length === initialLength) {
      return res.status(404).json({ success: false, error: 'Vocabulary item not found' });
    }

    store.lastModified = Date.now();
    saveVocabularyStore(store);

    res.json({ success: true });
  } catch (e) {
    console.error('Failed to delete vocabulary item:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// API Routes
app.get('/api/articles', (req, res) => {
    try {
        const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.md') || f.endsWith('.txt') || f.endsWith('.json'));
        res.json(files);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/articles', (req, res) => {
    try {
        const { filename, content } = req.body;
        if (!filename || !content) return res.status(400).json({ error: 'Missing filename or content' });

        // Validate filename for security
        const validation = validateFilename(filename);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        const safeFilename = path.basename(filename);

        // Update public (Source of Truth)
        fs.writeFileSync(path.join(articlesDir, safeFilename), content);

        // Update dist (Build Output) if it exists
        if (fs.existsSync(distArticlesDir)) {
            fs.writeFileSync(path.join(distArticlesDir, safeFilename), content);
        }

        res.json({ success: true, filename: safeFilename });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to save file' });
    }
});

app.post('/api/articles/rename', (req, res) => {
    try {
        const { oldFilename, newFilename } = req.body;
        if (!oldFilename || !newFilename) return res.status(400).json({ error: 'Missing filenames' });

        // Validate both filenames for security
        const oldValidation = validateFilename(oldFilename);
        if (!oldValidation.valid) {
            return res.status(400).json({ error: `Old filename: ${oldValidation.error}` });
        }
        const newValidation = validateFilename(newFilename);
        if (!newValidation.valid) {
            return res.status(400).json({ error: `New filename: ${newValidation.error}` });
        }

        const safeOldFilename = path.basename(oldFilename);
        const safeNewFilename = path.basename(newFilename);

        const oldPath = path.join(articlesDir, safeOldFilename);
        const newPath = path.join(articlesDir, safeNewFilename);

        if (!fs.existsSync(oldPath)) return res.status(404).json({ error: 'File not found' });
        if (fs.existsSync(newPath)) return res.status(409).json({ error: 'New filename already exists' });

        fs.renameSync(oldPath, newPath);

        // Also rename in dist if it exists
        const oldDistPath = path.join(distArticlesDir, safeOldFilename);
        const newDistPath = path.join(distArticlesDir, safeNewFilename);
        if (fs.existsSync(oldDistPath)) {
             fs.renameSync(oldDistPath, newDistPath);
        }

        res.json({ success: true, newFilename: safeNewFilename });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to rename file' });
    }
});

app.delete('/api/articles', (req, res) => {
    try {
        const filename = req.query.filename;
        if (!filename) return res.status(400).json({ error: 'Missing filename' });

        // Validate filename for security
        const validation = validateFilename(filename);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        const safeFilename = path.basename(filename);
        const filePath = path.join(articlesDir, safeFilename);

        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        const distFilePath = path.join(distArticlesDir, safeFilename);
        if (fs.existsSync(distFilePath)) fs.unlinkSync(distFilePath);

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Intercept /articles/* requests to serve fresh content from public
// This ensures that even if dist/ has an old version, we serve the new one
app.get('/articles/:filename', (req, res, next) => {
    const filename = req.params.filename;

    // Validate filename for security
    const validation = validateFilename(filename);
    if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
    }

    const filePath = path.join(articlesDir, filename);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        next();
    }
});

// === Sentence API Routes ===

// GET /api/sentences/summary - Mobile-optimized list (truncated, no full history)
app.get('/api/sentences/summary', (req, res) => {
    try {
        if (!fs.existsSync(sentencesFile)) {
            return res.json({ success: true, data: [], total: 0 });
        }

        const content = fs.readFileSync(sentencesFile, 'utf-8');
        const store = safeJsonParse(content);
        if (!store || !Array.isArray(store.sentences)) {
            return res.status(500).json({ success: false, error: 'Invalid sentence store format' });
        }

        const summary = (store.sentences || []).map(s => ({
            id: s.id,
            en: s.en ? (s.en.substring(0, 50) + (s.en.length > 50 ? '...' : '')) : '',
            zh: s.zh ? (s.zh.substring(0, 50) + (s.zh.length > 50 ? '...' : '')) : '',
            sourceType: s.sourceType,
            articleId: s.articleId,
            paragraphId: s.paragraphId,
            hasUserTranslation: !!(s.userTranslationZh || s.userTranslationEn),
            lastPracticed: s.lastPracticed,
            createdAt: s.createdAt,
            tags: s.tags || [],
        }));

        res.json({ success: true, data: summary, total: summary.length });
    } catch (e) {
        console.error('Failed to get sentence summary:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/sentences/:id - Get single sentence details
app.get('/api/sentences/:id', (req, res) => {
    try {
        const { id } = req.params;

        if (!fs.existsSync(sentencesFile)) {
            return res.status(404).json({ success: false, error: 'Sentence not found' });
        }

        const content = fs.readFileSync(sentencesFile, 'utf-8');
        const store = safeJsonParse(content);
        if (!store || !Array.isArray(store.sentences)) {
            return res.status(500).json({ success: false, error: 'Invalid sentence store format' });
        }
        const sentence = (store.sentences || []).find(s => s.id === id);

        if (!sentence) {
            return res.status(404).json({ success: false, error: 'Sentence not found' });
        }

        res.json({ success: true, data: sentence });
    } catch (e) {
        console.error('Failed to get sentence:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// PATCH /api/sentences/:id - Incremental update for single sentence
app.patch('/api/sentences/:id', (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!fs.existsSync(sentencesFile)) {
            return res.status(404).json({ success: false, error: 'Sentence not found' });
        }

        const content = fs.readFileSync(sentencesFile, 'utf-8');
        const store = safeJsonParse(content);
        if (!store || !Array.isArray(store.sentences)) {
            return res.status(500).json({ success: false, error: 'Invalid sentence store format' });
        }
        const index = (store.sentences || []).findIndex(s => s.id === id);

        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Sentence not found' });
        }

        // Merge updates into existing sentence
        store.sentences[index] = { ...store.sentences[index], ...updates };
        store.lastModified = Date.now();

        const updatedContent = JSON.stringify(store, null, 2);

        // Update public (Source of Truth)
        fs.writeFileSync(sentencesFile, updatedContent);

        // Update dist if it exists
        if (fs.existsSync(distDataDir)) {
            fs.writeFileSync(distSentencesFile, updatedContent);
        }

        res.json({ success: true, data: store.sentences[index] });
    } catch (e) {
        console.error('Failed to patch sentence:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/sentences - Fetch all sentences
app.get('/api/sentences', (req, res) => {
    try {
        if (fs.existsSync(sentencesFile)) {
            const content = fs.readFileSync(sentencesFile, 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.send(content);
        } else {
            // Return empty store if file doesn't exist
            res.json({ version: 1, sentences: [], lastModified: Date.now() });
        }
    } catch (e) {
        console.error('Failed to read sentences:', e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/sentences - Save sentence store
app.post('/api/sentences', (req, res) => {
    try {
        const store = req.body;
        if (!store || !Array.isArray(store.sentences)) {
            return res.status(400).json({ error: 'Invalid sentence store format' });
        }

        const content = JSON.stringify(store, null, 2);

        // Update public (Source of Truth)
        fs.writeFileSync(sentencesFile, content);

        // Update dist if it exists
        if (fs.existsSync(distDataDir)) {
            fs.writeFileSync(distSentencesFile, content);
        }

        res.json({ success: true, count: store.sentences.length });
    } catch (e) {
        console.error('Failed to save sentences:', e);
        res.status(500).json({ error: 'Failed to save sentences' });
    }
});

// Fallback for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
