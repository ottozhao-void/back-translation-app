import React, { useState, useEffect } from 'react';
import { LLMProviderConfig } from '../../types';
import { fetchModels, saveProvider } from '../../services/llmService';
import { XMarkIcon, EyeIcon } from '../Icons';

interface ProviderEditModalProps {
  provider?: LLMProviderConfig;  // undefined = adding new provider
  onSave: (provider: LLMProviderConfig) => void;
  onClose: () => void;
}

// Common provider presets
const PROVIDER_PRESETS = [
  { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  { name: 'Ollama (Local)', baseUrl: 'http://localhost:11434/v1' },
  { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
  { name: 'Custom', baseUrl: '' },
];

export const ProviderEditModal: React.FC<ProviderEditModalProps> = ({
  provider,
  onSave,
  onClose,
}) => {
  const isEditing = !!provider;

  const [name, setName] = useState(provider?.name || '');
  const [baseUrl, setBaseUrl] = useState(provider?.baseUrl || '');
  const [apiKey, setApiKey] = useState(provider?.apiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [models, setModels] = useState<string[]>(provider?.models || []);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(
    new Set(provider?.models || [])
  );
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchSuccess, setFetchSuccess] = useState(false);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePresetSelect = (preset: typeof PROVIDER_PRESETS[0]) => {
    if (preset.name !== 'Custom') {
      setName(preset.name);
      setBaseUrl(preset.baseUrl);
    }
  };

  const handleFetchModels = async () => {
    if (!baseUrl.trim()) {
      setError('Please enter a Base URL');
      return;
    }

    setIsFetching(true);
    setError(null);
    setFetchSuccess(false);

    const result = await fetchModels(baseUrl, apiKey);

    setIsFetching(false);

    if (result.success && result.models) {
      setModels(result.models);
      setSelectedModels(new Set(result.models));
      setFetchSuccess(true);
    } else {
      setError(result.error || 'Failed to fetch models');
    }
  };

  const toggleModel = (modelId: string) => {
    const newSelected = new Set(selectedModels);
    if (newSelected.has(modelId)) {
      newSelected.delete(modelId);
    } else {
      newSelected.add(modelId);
    }
    setSelectedModels(newSelected);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter a provider name');
      return;
    }
    if (!baseUrl.trim()) {
      setError('Please enter a Base URL');
      return;
    }

    setIsSaving(true);
    setError(null);

    const newProvider: LLMProviderConfig = {
      id: provider?.id || `provider-${Date.now()}`,
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      isEnabled: true,
      models: Array.from(selectedModels),
      lastFetched: models.length > 0 ? Date.now() : undefined,
    };

    const result = await saveProvider(newProvider);

    setIsSaving(false);

    if (result.success) {
      onSave(newProvider);
      onClose();
    } else {
      setError(result.error || 'Failed to save provider');
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-3xl glass-panel rounded-2xl shadow-2xl animate-[float_0.3s_ease-out] overflow-hidden"
        style={{ backgroundColor: 'var(--bg-main)' }}
      >
        {/* Header */}
        <div className="h-14 border-b border-[var(--glass-border)] flex items-center justify-between px-6">
          <h3 className="text-lg font-medium" style={{ color: 'var(--text-main)' }}>
            {isEditing ? 'Edit Provider' : 'Add Provider'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--surface-hover)] transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <XMarkIcon />
          </button>
        </div>

        {/* Content - Two Column Layout */}
        <div className="flex max-h-[60vh]">
          {/* Left Panel - API Configuration */}
          <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar border-r border-[var(--glass-border)]">
            {/* Presets (only for new providers) */}
            {!isEditing && (
              <div className="flex flex-wrap gap-2 mb-4">
                {PROVIDER_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handlePresetSelect(preset)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      name === preset.name
                        ? 'bg-[var(--surface-active)] text-[var(--text-main)]'
                        : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            )}

            {/* Name Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., OpenAI, My Local Ollama"
                className="w-full px-4 py-2.5 rounded-lg text-sm transition-all input-glow"
                style={{
                  backgroundColor: 'var(--surface-hover)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-main)',
                }}
              />
            </div>

            {/* Base URL Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                Base URL
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full px-4 py-2.5 rounded-lg text-sm font-mono transition-all input-glow"
                style={{
                  backgroundColor: 'var(--surface-hover)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-main)',
                }}
              />
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-4 py-2.5 pr-12 rounded-lg text-sm font-mono transition-all input-glow"
                  style={{
                    backgroundColor: 'var(--surface-hover)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-main)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--surface-active)] transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <EyeIcon />
                </button>
              </div>
            </div>

            {/* Fetch Models Button */}
            <button
              onClick={handleFetchModels}
              disabled={isFetching || !baseUrl.trim()}
              className="w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all border border-[var(--glass-border)] hover:bg-[var(--surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: 'var(--text-main)' }}
            >
              {isFetching ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Fetching Models...
                </span>
              ) : (
                'Fetch Models'
              )}
            </button>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Right Panel - Available Models */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                Available Models
              </label>
              {models.length > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                  {selectedModels.size} / {models.length} selected
                </span>
              )}
            </div>

            {models.length > 0 ? (
              <div
                className="rounded-lg border border-[var(--glass-border)] divide-y divide-[var(--glass-border)] overflow-hidden"
                style={{ backgroundColor: 'var(--surface-hover)' }}
              >
                {models.map((modelId) => (
                  <label
                    key={modelId}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[var(--surface-active)] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedModels.has(modelId)}
                      onChange={() => toggleModel(modelId)}
                      className="w-4 h-4 rounded border-[var(--glass-border)] accent-emerald-500"
                    />
                    <span className="text-sm font-mono truncate" style={{ color: 'var(--text-main)' }}>
                      {modelId}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div
                className="h-full min-h-[200px] flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--glass-border)] text-center p-6"
              >
                <svg
                  className="w-12 h-12 mb-3 opacity-30"
                  style={{ color: 'var(--text-secondary)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  No models loaded yet
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                  Enter API credentials and click "Fetch Models"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--glass-border)] flex justify-end gap-3 bg-[var(--surface-hover)]/10">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--text-main)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !baseUrl.trim()}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-main)' }}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
