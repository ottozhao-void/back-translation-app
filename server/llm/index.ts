/**
 * LLM API Route Handlers
 *
 * Provides HTTP API endpoints for LLM operations
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { LLMTaskRequest, LLMProviderConfig, LLMSettings } from '../../types';
import { loadSettings, saveSettings, saveProviderConfig, deleteProvider } from './providers';
import { executeLLMTask, fetchModels } from './executor';

/**
 * Parse JSON body from request
 */
async function parseBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString();
        resolve(JSON.parse(body) as T);
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send JSON response
 */
function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * Handle POST /api/llm/models - Fetch available models from a provider
 */
export async function handleFetchModels(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await parseBody<{ baseUrl: string; apiKey: string }>(req);

    if (!body.baseUrl || !body.apiKey) {
      sendJson(res, 400, { success: false, error: 'Missing baseUrl or apiKey' });
      return;
    }

    const result = await fetchModels(body.baseUrl, body.apiKey);
    sendJson(res, result.success ? 200 : 400, result);

  } catch (error) {
    sendJson(res, 500, {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle POST /api/llm/execute - Execute an LLM task
 */
export async function handleExecuteTask(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await parseBody<LLMTaskRequest>(req);

    if (!body.taskType || !body.providerId || !body.modelId) {
      sendJson(res, 400, { success: false, error: 'Missing required fields: taskType, providerId, modelId' });
      return;
    }

    const result = await executeLLMTask(body);
    sendJson(res, result.success ? 200 : 400, result);

  } catch (error) {
    sendJson(res, 500, {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle GET /api/llm/config - Get current LLM configuration
 */
export async function handleGetConfig(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const settings = loadSettings();
    // Mask API keys for security
    const maskedSettings: LLMSettings = {
      ...settings,
      providers: settings.providers.map(p => ({
        ...p,
        apiKey: p.apiKey ? '***' + p.apiKey.slice(-4) : '',
      })),
    };
    sendJson(res, 200, { success: true, config: maskedSettings });

  } catch (error) {
    sendJson(res, 500, {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle POST /api/llm/config - Save LLM configuration
 */
export async function handleSaveConfig(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await parseBody<{ config: LLMSettings }>(req);

    if (!body.config) {
      sendJson(res, 400, { success: false, error: 'Missing config field' });
      return;
    }

    const success = saveSettings(body.config);
    sendJson(res, success ? 200 : 500, {
      success,
      error: success ? undefined : 'Failed to save configuration',
    });

  } catch (error) {
    sendJson(res, 500, {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle POST /api/llm/provider - Save a provider configuration
 */
export async function handleSaveProvider(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await parseBody<{ provider: LLMProviderConfig }>(req);

    if (!body.provider || !body.provider.id) {
      sendJson(res, 400, { success: false, error: 'Missing provider or provider.id' });
      return;
    }

    const success = saveProviderConfig(body.provider);
    sendJson(res, success ? 200 : 500, {
      success,
      error: success ? undefined : 'Failed to save provider',
    });

  } catch (error) {
    sendJson(res, 500, {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle DELETE /api/llm/provider?id=xxx - Delete a provider
 */
export async function handleDeleteProvider(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const url = new URL(req.url || '', 'http://localhost');
    const providerId = url.searchParams.get('id');

    if (!providerId) {
      sendJson(res, 400, { success: false, error: 'Missing provider id parameter' });
      return;
    }

    const success = deleteProvider(providerId);
    sendJson(res, success ? 200 : 404, {
      success,
      error: success ? undefined : 'Provider not found',
    });

  } catch (error) {
    sendJson(res, 500, {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Main router for /api/llm/* endpoints
 */
export async function handleLLMRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url || '';
  const method = req.method || 'GET';

  // POST /api/llm/models
  if (url === '/api/llm/models' && method === 'POST') {
    await handleFetchModels(req, res);
    return true;
  }

  // POST /api/llm/execute
  if (url === '/api/llm/execute' && method === 'POST') {
    await handleExecuteTask(req, res);
    return true;
  }

  // GET /api/llm/config
  if (url === '/api/llm/config' && method === 'GET') {
    await handleGetConfig(req, res);
    return true;
  }

  // POST /api/llm/config
  if (url === '/api/llm/config' && method === 'POST') {
    await handleSaveConfig(req, res);
    return true;
  }

  // POST /api/llm/provider
  if (url === '/api/llm/provider' && method === 'POST') {
    await handleSaveProvider(req, res);
    return true;
  }

  // DELETE /api/llm/provider?id=xxx
  if (url.startsWith('/api/llm/provider') && method === 'DELETE') {
    await handleDeleteProvider(req, res);
    return true;
  }

  return false; // Not handled
}
