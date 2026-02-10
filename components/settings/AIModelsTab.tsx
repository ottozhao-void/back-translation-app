/**
 * AI Models Settings Tab Component
 *
 * Refactored to use a simple 2-tab layout:
 * - Tab 1: Global Settings (providers, default model, default parameters)
 * - Tab 2: AI Task Configuration (task selector + model/params for selected task)
 */

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
import { GlobalSettingsTab } from './llm/GlobalSettingsTab';
import { TaskConfigPanel } from './llm/TaskConfigPanel';

interface AIModelsTabProps {
  onSettingsChange?: () => void;
}

type TabId = 'global' | 'tasks';

interface TabInfo {
  id: TabId;
  label: string;
}

const TABS: TabInfo[] = [
  { id: 'global', label: 'Global Settings' },
  { id: 'tasks', label: 'AI Tasks' },
];

export const AIModelsTab: React.FC<AIModelsTabProps> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState<LLMSettings>(DEFAULT_LLM_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('global');
  const [editingProvider, setEditingProvider] = useState<LLMProviderConfig | null>(null);
  const [showAddProvider, setShowAddProvider] = useState(false);
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

  const handleDefaultParamsChange = (params: Partial<LLMModelParams>) => {
    const newParams = { ...settings.defaultParams, ...params };
    handleSaveSettings({ ...settings, defaultParams: newParams });
  };

  const handleResetDefaultParams = () => {
    handleSaveSettings({ ...settings, defaultParams: DEFAULT_MODEL_PARAMS });
  };

  const handleTaskModelChange = (
    taskType: LLMTaskType,
    config: { providerId: string; modelId: string; params?: Partial<LLMModelParams> }
  ) => {
    const newTaskModels = {
      ...settings.taskModels,
      [taskType]: config,
    };
    handleSaveSettings({ ...settings, taskModels: newTaskModels });
  };

  const handleClearTaskModel = (taskType: LLMTaskType) => {
    const newTaskModels = { ...settings.taskModels };
    delete newTaskModels[taskType];
    handleSaveSettings({ ...settings, taskModels: newTaskModels });
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
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-[var(--text-main)] text-white shadow-lg'
                : 'bg-[var(--surface-hover)] hover:bg-[var(--surface-active)]'
            }`}
            style={
              activeTab !== tab.id
                ? { color: 'var(--text-main)' }
                : undefined
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10 min-h-[400px]">
        {activeTab === 'global' ? (
          <GlobalSettingsTab
            settings={settings}
            allModels={allModels}
            onProviderSaved={handleProviderSaved}
            onProviderDeleted={handleDeleteProvider}
            onProviderToggled={handleToggleProvider}
            onDefaultModelChange={handleDefaultModelChange}
            onDefaultParamsChange={handleDefaultParamsChange}
            onResetDefaultParams={handleResetDefaultParams}
            onAddProvider={() => setShowAddProvider(true)}
            onEditProvider={setEditingProvider}
            pendingDeleteProvider={pendingDelete}
            onSetPendingDelete={setPendingDelete}
          />
        ) : (
          <TaskConfigPanel
            settings={settings}
            allModels={allModels}
            onSaveTask={handleTaskModelChange}
            onClearTask={handleClearTaskModel}
          />
        )}
      </div>

      {/* Saving Indicator */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 px-4 py-2 rounded-lg bg-[var(--surface-active)] shadow-lg flex items-center gap-2 z-50">
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
