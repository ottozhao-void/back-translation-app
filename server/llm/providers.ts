/**
 * LLM Provider Management
 *
 * Handles reading/writing provider configurations and LLM settings
 */

import * as fs from 'fs';
import * as path from 'path';
import type { LLMProviderConfig, LLMSettings, LLMModelParams } from '../../types';

// Configuration file path
const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'llm-config.json');

// Default model parameters
const DEFAULT_MODEL_PARAMS: LLMModelParams = {
  temperature: 0,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

// Default settings
const DEFAULT_SETTINGS: LLMSettings = {
  providers: [],
  defaultParams: DEFAULT_MODEL_PARAMS,
  taskModels: {},
};

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load LLM settings from disk
 */
export function loadSettings(): LLMSettings {
  try {
    ensureDataDir();
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(content) as LLMSettings;
      // Merge with defaults to ensure all fields exist
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        defaultParams: {
          ...DEFAULT_MODEL_PARAMS,
          ...parsed.defaultParams,
        },
      };
    }
  } catch (error) {
    console.error('Failed to load LLM settings:', error);
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Save LLM settings to disk
 */
export function saveSettings(settings: LLMSettings): boolean {
  try {
    ensureDataDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to save LLM settings:', error);
    return false;
  }
}

/**
 * Get all provider configurations
 */
export function getAllProviders(): LLMProviderConfig[] {
  const settings = loadSettings();
  return settings.providers;
}

/**
 * Get a single provider configuration by ID
 */
export function getProviderConfig(providerId: string): LLMProviderConfig | undefined {
  const settings = loadSettings();
  return settings.providers.find(p => p.id === providerId);
}

/**
 * Save or update a provider configuration
 */
export function saveProviderConfig(config: LLMProviderConfig): boolean {
  const settings = loadSettings();
  const existingIndex = settings.providers.findIndex(p => p.id === config.id);

  if (existingIndex >= 0) {
    settings.providers[existingIndex] = config;
  } else {
    settings.providers.push(config);
  }

  return saveSettings(settings);
}

/**
 * Delete a provider configuration
 */
export function deleteProvider(providerId: string): boolean {
  const settings = loadSettings();
  const originalLength = settings.providers.length;
  settings.providers = settings.providers.filter(p => p.id !== providerId);

  if (settings.providers.length === originalLength) {
    return false; // Provider not found
  }

  // Clear default provider/model if they referenced this provider
  if (settings.defaultProvider === providerId) {
    settings.defaultProvider = undefined;
    settings.defaultModel = undefined;
  }

  // Clear task models that reference this provider
  for (const taskType of Object.keys(settings.taskModels)) {
    const taskConfig = settings.taskModels[taskType as keyof typeof settings.taskModels];
    if (taskConfig?.providerId === providerId) {
      delete settings.taskModels[taskType as keyof typeof settings.taskModels];
    }
  }

  return saveSettings(settings);
}

/**
 * Get the effective model parameters for a task
 * Merges: DEFAULT < global settings < task-specific < request-level
 */
export function getEffectiveParams(
  taskType: string,
  requestParams?: Partial<LLMModelParams>
): LLMModelParams {
  const settings = loadSettings();
  const taskConfig = settings.taskModels[taskType as keyof typeof settings.taskModels];

  return {
    ...DEFAULT_MODEL_PARAMS,
    ...settings.defaultParams,
    ...(taskConfig?.params || {}),
    ...(requestParams || {}),
  };
}

/**
 * Get the default provider and model for a task
 */
export function getDefaultModelForTask(taskType: string): { providerId: string; modelId: string } | undefined {
  const settings = loadSettings();

  // Check task-specific configuration first
  const taskConfig = settings.taskModels[taskType as keyof typeof settings.taskModels];
  if (taskConfig) {
    return { providerId: taskConfig.providerId, modelId: taskConfig.modelId };
  }

  // Fall back to global default
  if (settings.defaultProvider && settings.defaultModel) {
    return { providerId: settings.defaultProvider, modelId: settings.defaultModel };
  }

  // Fall back to first enabled provider with models
  const enabledProvider = settings.providers.find(p => p.isEnabled && p.models && p.models.length > 0);
  if (enabledProvider && enabledProvider.models) {
    return { providerId: enabledProvider.id, modelId: enabledProvider.models[0] };
  }

  return undefined;
}
