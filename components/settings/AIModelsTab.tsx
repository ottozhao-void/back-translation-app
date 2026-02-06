import React, { useState, useEffect } from 'react';
import {
  LLMSettings,
  LLMProviderConfig,
  LLMModelParams,
  LLMTaskType,
  DEFAULT_MODEL_PARAMS,
  DEFAULT_LLM_SETTINGS,
} from '../../types';
import { getConfig, saveConfig, deleteProvider } from '../../services/llmService';
import { ProviderEditModal } from './ProviderEditModal';
import { ModelSelector } from './ModelSelector';
import { TrashIcon, PencilIcon } from '../Icons';

interface AIModelsTabProps {
  onSettingsChange?: () => void;
}

// Task type display names
const TASK_LABELS: Record<LLMTaskType, string> = {
  segment: 'Segmentation',
  'segment-align': 'Semantic Alignment',
  translate: 'Translation',
  score: 'Scoring',
  custom: 'Custom',
};

export const AIModelsTab: React.FC<AIModelsTabProps> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState<LLMSettings>(DEFAULT_LLM_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingProvider, setEditingProvider] = useState<LLMProviderConfig | null>(null);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showAdvancedParams, setShowAdvancedParams] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    const result = await getConfig();
    if (result.success && result.config) {
      setSettings(result.config);
    }
    setIsLoading(false);
  };

  const handleSaveSettings = async (newSettings: LLMSettings) => {
    setIsSaving(true);
    setError(null);
    const result = await saveConfig(newSettings);
    setIsSaving(false);

    if (result.success) {
      setSettings(newSettings);
      onSettingsChange?.();
    } else {
      setError(result.error || 'Failed to save settings');
    }
  };

  const handleProviderSaved = (provider: LLMProviderConfig) => {
    const existingIndex = settings.providers.findIndex((p) => p.id === provider.id);
    let newProviders: LLMProviderConfig[];

    if (existingIndex >= 0) {
      newProviders = [...settings.providers];
      newProviders[existingIndex] = provider;
    } else {
      newProviders = [...settings.providers, provider];
    }

    const newSettings = { ...settings, providers: newProviders };

    // Set as default if it's the first provider
    if (newProviders.length === 1) {
      newSettings.defaultProvider = provider.id;
      if (provider.models && provider.models.length > 0) {
        newSettings.defaultModel = provider.models[0];
      }
    }

    handleSaveSettings(newSettings);
  };

  const handleDeleteProvider = async (providerId: string) => {
    const result = await deleteProvider(providerId);
    if (result.success) {
      const newProviders = settings.providers.filter((p) => p.id !== providerId);
      const newSettings = { ...settings, providers: newProviders };

      // Clear defaults if deleted provider was default
      if (settings.defaultProvider === providerId) {
        newSettings.defaultProvider = newProviders[0]?.id;
        newSettings.defaultModel = newProviders[0]?.models?.[0];
      }

      handleSaveSettings(newSettings);
    }
    setPendingDelete(null);
  };

  const handleToggleProvider = (providerId: string) => {
    const newProviders = settings.providers.map((p) =>
      p.id === providerId ? { ...p, isEnabled: !p.isEnabled } : p
    );
    handleSaveSettings({ ...settings, providers: newProviders });
  };

  const handleDefaultModelChange = (providerId: string, modelId: string) => {
    handleSaveSettings({
      ...settings,
      defaultProvider: providerId,
      defaultModel: modelId,
    });
  };

  const handleTaskModelChange = (
    taskType: LLMTaskType,
    providerId: string,
    modelId: string
  ) => {
    const newTaskModels = {
      ...settings.taskModels,
      [taskType]: { providerId, modelId },
    };
    handleSaveSettings({ ...settings, taskModels: newTaskModels });
  };

  const handleParamChange = (param: keyof LLMModelParams, value: number | undefined) => {
    const newParams = { ...settings.defaultParams, [param]: value };
    handleSaveSettings({ ...settings, defaultParams: newParams });
  };

  // Get all available models across enabled providers
  const getAllModels = () => {
    const models: Array<{ providerId: string; providerName: string; modelId: string }> = [];
    settings.providers
      .filter((p) => p.isEnabled)
      .forEach((provider) => {
        provider.models?.forEach((modelId) => {
          models.push({
            providerId: provider.id,
            providerName: provider.name,
            modelId,
          });
        });
      });
    return models;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--text-main)] border-t-transparent" />
      </div>
    );
  }

  const allModels = getAllModels();

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* === Section: Providers === */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
            AI Model Providers
          </h4>
          <button
            onClick={() => setShowAddProvider(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] border border-[var(--glass-border)]"
            style={{ color: 'var(--text-main)' }}
          >
            + Add Provider
          </button>
        </div>

        {settings.providers.length === 0 ? (
          <div
            className="p-6 rounded-xl border border-dashed border-[var(--glass-border)] text-center"
            style={{ color: 'var(--text-secondary)' }}
          >
            <p className="text-sm mb-2">No providers configured</p>
            <p className="text-xs">Add an OpenAI-compatible provider to enable AI features</p>
          </div>
        ) : (
          <div className="space-y-2">
            {settings.providers.map((provider) => (
              <div
                key={provider.id}
                className="p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Enable Toggle */}
                    <button
                      onClick={() => handleToggleProvider(provider.id)}
                      className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                        provider.isEnabled ? 'bg-emerald-500' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          provider.isEnabled ? 'left-5' : 'left-0.5'
                        }`}
                      />
                    </button>

                    <div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                        {provider.name}
                      </span>
                      <p
                        className="text-xs font-mono mt-0.5 truncate max-w-xs"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {provider.baseUrl}
                      </p>
                      {provider.models && provider.models.length > 0 && (
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {provider.models.length} model{provider.models.length > 1 ? 's' : ''} available
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingProvider(provider)}
                      className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Edit"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      onClick={() => setPendingDelete(provider.id)}
                      className="p-2 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation */}
                {pendingDelete === provider.id && (
                  <div className="mt-3 pt-3 border-t border-[var(--glass-border)] flex items-center justify-between">
                    <span className="text-xs text-red-400">Delete this provider?</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPendingDelete(null)}
                        className="px-3 py-1 rounded text-xs hover:bg-[var(--surface-hover)] transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDeleteProvider(provider.id)}
                        className="px-3 py-1 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === Section: Default Model Selection === */}
      {allModels.length > 0 && (
        <div className="p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10 space-y-4">
          <h4 className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
            Default Model
          </h4>
          <ModelSelector
            value={`${settings.defaultProvider}:${settings.defaultModel}`}
            options={allModels}
            onChange={handleDefaultModelChange}
            placeholder="Select default model"
          />
        </div>
      )}

      {/* === Section: Task-Specific Models === */}
      {allModels.length > 0 && (
        <div className="p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10 space-y-4">
          <h4 className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
            Task-Specific Models
          </h4>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Override the default model for specific tasks
          </p>

          <div className="space-y-4">
            {(['segment', 'segment-align', 'translate', 'score'] as LLMTaskType[]).map((taskType) => {
              const taskConfig = settings.taskModels[taskType];
              const currentValue = taskConfig
                ? `${taskConfig.providerId}:${taskConfig.modelId}`
                : '';

              return (
                <div key={taskType} className="space-y-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                    {TASK_LABELS[taskType]}
                  </span>
                  <ModelSelector
                    value={currentValue}
                    options={allModels}
                    onChange={(providerId, modelId) => {
                      if (providerId && modelId) {
                        handleTaskModelChange(taskType, providerId, modelId);
                      } else {
                        // Clear task-specific override
                        const newTaskModels = { ...settings.taskModels };
                        delete newTaskModels[taskType];
                        handleSaveSettings({ ...settings, taskModels: newTaskModels });
                      }
                    }}
                    placeholder="Use Default"
                    allowClear={true}
                    size="compact"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* === Section: Model Parameters === */}
      <div className="p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10 space-y-4">
        <h4 className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
          Model Parameters
        </h4>

        {/* Temperature */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm" style={{ color: 'var(--text-main)' }}>
                Temperature
              </span>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Lower = more deterministic
              </p>
            </div>
            <span className="font-mono text-sm font-medium" style={{ color: 'var(--text-main)' }}>
              {settings.defaultParams.temperature.toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings.defaultParams.temperature}
            onChange={(e) => handleParamChange('temperature', parseFloat(e.target.value))}
            className="w-full accent-[var(--text-main)]"
          />
        </div>

        {/* Top P */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm" style={{ color: 'var(--text-main)' }}>
                Top P
              </span>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Nucleus sampling threshold
              </p>
            </div>
            <span className="font-mono text-sm font-medium" style={{ color: 'var(--text-main)' }}>
              {settings.defaultParams.topP.toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.defaultParams.topP}
            onChange={(e) => handleParamChange('topP', parseFloat(e.target.value))}
            className="w-full accent-[var(--text-main)]"
          />
        </div>

        {/* Max Tokens */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm" style={{ color: 'var(--text-main)' }}>
              Max Tokens
            </span>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Leave empty for no limit
            </p>
          </div>
          <input
            type="number"
            min="1"
            max="100000"
            value={settings.defaultParams.maxTokens || ''}
            onChange={(e) =>
              handleParamChange('maxTokens', e.target.value ? parseInt(e.target.value) : undefined)
            }
            placeholder="No limit"
            className="w-28 px-3 py-1.5 rounded-lg text-sm text-right transition-all"
            style={{
              backgroundColor: 'var(--surface-hover)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-main)',
            }}
          />
        </div>

        {/* Advanced Parameters Toggle */}
        <button
          onClick={() => setShowAdvancedParams(!showAdvancedParams)}
          className="text-xs font-medium flex items-center gap-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span
            className={`transform transition-transform ${showAdvancedParams ? 'rotate-90' : ''}`}
          >
            ▶
          </span>
          Advanced Parameters
        </button>

        {/* Advanced Parameters */}
        {showAdvancedParams && (
          <div className="space-y-4 pt-2 border-t border-[var(--glass-border)]">
            {/* Frequency Penalty */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-main)' }}>
                  Frequency Penalty
                </span>
                <span className="font-mono text-sm" style={{ color: 'var(--text-main)' }}>
                  {settings.defaultParams.frequencyPenalty.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="-2"
                max="2"
                step="0.1"
                value={settings.defaultParams.frequencyPenalty}
                onChange={(e) => handleParamChange('frequencyPenalty', parseFloat(e.target.value))}
                className="w-full accent-[var(--text-main)]"
              />
            </div>

            {/* Presence Penalty */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-main)' }}>
                  Presence Penalty
                </span>
                <span className="font-mono text-sm" style={{ color: 'var(--text-main)' }}>
                  {settings.defaultParams.presencePenalty.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="-2"
                max="2"
                step="0.1"
                value={settings.defaultParams.presencePenalty}
                onChange={(e) => handleParamChange('presencePenalty', parseFloat(e.target.value))}
                className="w-full accent-[var(--text-main)]"
              />
            </div>

            {/* Seed */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm" style={{ color: 'var(--text-main)' }}>
                  Seed
                </span>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  For reproducible results
                </p>
              </div>
              <input
                type="number"
                min="0"
                value={settings.defaultParams.seed || ''}
                onChange={(e) =>
                  handleParamChange('seed', e.target.value ? parseInt(e.target.value) : undefined)
                }
                placeholder="Random"
                className="w-28 px-3 py-1.5 rounded-lg text-sm text-right transition-all"
                style={{
                  backgroundColor: 'var(--surface-hover)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-main)',
                }}
              />
            </div>

            {/* Reset to Defaults */}
            <button
              onClick={() =>
                handleSaveSettings({ ...settings, defaultParams: DEFAULT_MODEL_PARAMS })
              }
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors"
            >
              Reset to defaults
            </button>
          </div>
        )}
      </div>

      {/* Saving Indicator */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 px-4 py-2 rounded-lg bg-[var(--surface-active)] shadow-lg flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--text-main)] border-t-transparent" />
          <span className="text-sm" style={{ color: 'var(--text-main)' }}>
            Saving...
          </span>
        </div>
      )}

      {/* Provider Edit/Add Modal */}
      {(editingProvider || showAddProvider) && (
        <ProviderEditModal
          provider={editingProvider || undefined}
          onSave={handleProviderSaved}
          onClose={() => {
            setEditingProvider(null);
            setShowAddProvider(false);
          }}
        />
      )}
    </div>
  );
};
