/**
 * Global Settings Tab Component
 *
 * Contains provider management, default model selection, and default parameters.
 * This is the first tab in the AI Models settings.
 */

import React from 'react';
import { LLMSettings, LLMProviderConfig } from '../../../types';
import { TrashIcon, PencilIcon } from '../../Icons';
import { ParameterEditor } from './ParameterEditor';
import { ModelSelector } from '../ModelSelector';

interface GlobalSettingsTabProps {
  settings: LLMSettings;
  allModels: Array<{ providerId: string; providerName: string; modelId: string }>;
  onProviderSaved: (provider: LLMProviderConfig) => void;
  onProviderDeleted: (providerId: string) => void;
  onProviderToggled: (providerId: string) => void;
  onDefaultModelChange: (providerId: string, modelId: string) => void;
  onDefaultParamsChange: (params: Partial<import('../../../types').LLMModelParams>) => void;
  onResetDefaultParams: () => void;
  onAddProvider: () => void;
  onEditProvider: (provider: LLMProviderConfig) => void;
  pendingDeleteProvider: string | null;
  onSetPendingDelete: (providerId: string | null) => void;
}

export const GlobalSettingsTab: React.FC<GlobalSettingsTabProps> = ({
  settings,
  allModels,
  onProviderSaved,
  onProviderDeleted,
  onProviderToggled,
  onDefaultModelChange,
  onDefaultParamsChange,
  onResetDefaultParams,
  onAddProvider,
  onEditProvider,
  pendingDeleteProvider,
  onSetPendingDelete,
}) => {
  return (
    <div className="space-y-6">
      {/* === Section: Providers === */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
            AI Model Providers
          </h4>
          <button
            onClick={onAddProvider}
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
                      onClick={() => onProviderToggled(provider.id)}
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
                      onClick={() => onEditProvider(provider)}
                      className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Edit"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      onClick={() => onSetPendingDelete(provider.id)}
                      className="p-2 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation */}
                {pendingDeleteProvider === provider.id && (
                  <div className="mt-3 pt-3 border-t border-[var(--glass-border)] flex items-center justify-between">
                    <span className="text-xs text-red-400">Delete this provider?</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onSetPendingDelete(null)}
                        className="px-3 py-1 rounded text-xs hover:bg-[var(--surface-hover)] transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => onProviderDeleted(provider.id)}
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
            onChange={onDefaultModelChange}
            placeholder="Select default model"
          />
        </div>
      )}

      {/* === Section: Default Model Parameters === */}
      <div className="p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10 space-y-4">
        <h4 className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
          Default Model Parameters
        </h4>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          These parameters apply to all tasks unless overridden
        </p>
        <ParameterEditor
          params={settings.defaultParams}
          onChange={onDefaultParamsChange}
          showResetButton
          onReset={onResetDefaultParams}
        />
      </div>
    </div>
  );
};
