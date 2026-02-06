import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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
      const parsed = JSON.parse(content);
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
    const { baseUrl, apiKey } = req.body;
    if (!baseUrl || !apiKey) {
      return res.status(400).json({ success: false, error: 'Missing baseUrl or apiKey' });
    }

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
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(400).json({ success: false, error: 'No content in response' });
    }

    const parsedContent = JSON.parse(content);
    res.json({
      success: true,
      data: parsedContent,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      } : undefined,
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
    const filePath = path.join(articlesDir, filename);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        next();
    }
});

// === Sentence API Routes ===

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
