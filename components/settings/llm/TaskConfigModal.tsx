/**
 * Task Configuration Modal Component
 *
 * Modal for configuring a specific task's model and parameters.
 * Auto-applies recommended params on first open.
 */

import React, { useState, useEffect } from 'react';
import { LLMSettings, LLMTaskType, LLMModelParams } from '../../../types';
import { ModelSelector } from '../ModelSelector';
import { ParameterEditor } from './ParameterEditor';
import { TaskDefinition } from './taskMetadata';
import { getRecommendedParams, mergeWithRecommended } from './defaultTaskParams';

interface TaskConfigModalProps {
  task: TaskDefinition;
  settings: LLMSettings;
  allModels: Array<{ providerId: string; providerName: string; modelId: string }>;
  onSave: (taskType: LLMTaskType, config: {
    providerId: string;
    modelId: string;
    params?: Partial<LLMModelParams>;
  }) => void;
  onClear: (taskType: LLMTaskType) => void;
  onClose: () => void;
}

/**
 * Modal for configuring a specific task's model and parameters
 */
export const TaskConfigModal: React.FC<TaskConfigModalProps> = ({
  task,
  settings,
  allModels,
  onSave,
  onClear,
  onClose,
}) => {
  const existingConfig = settings.taskModels[task.id];

  // Model selection state
  const [providerId, setProviderId] = useState<string>(
    existingConfig?.providerId || settings.defaultProvider || ''
  );
  const [modelId, setModelId] = useState<string>(
    existingConfig?.modelId || settings.defaultModel || ''
  );

  // Parameters state - on first open, auto-apply recommended params
  const [params, setParams] = useState<Partial<LLMModelParams>>(() => {
    return mergeWithRecommended(task.id, existingConfig?.params);
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update state when task changes
  useEffect(() => {
    setProviderId(existingConfig?.providerId || settings.defaultProvider || '');
    setModelId(existingConfig?.modelId || settings.defaultModel || '');
    setParams(mergeWithRecommended(task.id, existingConfig?.params));
  }, [task.id, existingConfig, settings.defaultProvider, settings.defaultModel]);

  const handleSave = () => {
    if (providerId && modelId) {
      onSave(task.id, { providerId, modelId, params });
    }
    onClose();
  };

  const handleClear = () => {
    onClear(task.id);
    onClose();
  };

  const handleResetToRecommended = () => {
    setParams(getRecommendedParams(task.id));
  };

  const canClear = !!existingConfig;
  const isUsingDefaultModel =
    providerId === settings.defaultProvider && modelId === settings.defaultModel;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-main)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)]">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3
                className="text-lg font-semibold"
                style={{ color: 'var(--text-main)' }}
              >
                {task.label}
              </h3>
              {task.isExperimental && (
                <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">
                  Beta
                </span>
              )}
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {task.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Model Selection */}
          <div className="space-y-3">
            <label
              className="text-sm font-medium"
              style={{ color: 'var(--text-main)' }}
            >
              Model
            </label>
            <ModelSelector
              value={
                providerId && modelId ? `${providerId}:${modelId}` : ''
              }
              options={allModels}
              onChange={(pid, mid) => {
                setProviderId(pid);
                setModelId(mid);
              }}
              placeholder="Select a model"
              allowClear={false}
            />
            {isUsingDefaultModel && (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Using default model
              </p>
            )}
          </div>

          {/* Parameters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                className="text-sm font-medium"
                style={{ color: 'var(--text-main)' }}
              >
                Parameters
              </label>
              <button
                onClick={handleResetToRecommended}
                className="text-xs hover:underline"
                style={{ color: 'var(--text-secondary)' }}
              >
                Reset to Recommended
              </button>
            </div>
            <ParameterEditor
              params={params}
              onChange={setParams}
              showAdvanced={showAdvanced}
              onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
              compact
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 p-6 border-t border-[var(--glass-border)]"
        >
          {canClear && (
            <button
              onClick={handleClear}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              Clear Override
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!providerId || !modelId}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--text-main)] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
