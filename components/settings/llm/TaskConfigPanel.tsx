/**
 * Task Configuration Panel Component
 *
 * Second tab in AI Models settings.
 * Contains a task selector dropdown in the header and configuration UI for the selected task.
 */

import React, { useState, useEffect } from 'react';
import { LLMSettings, LLMTaskType, LLMModelParams } from '../../../types';
import { ModelSelector } from '../ModelSelector';
import { ParameterEditor } from './ParameterEditor';
import { TaskDefinition, getAllTasks } from './taskMetadata';
import { getRecommendedParams, mergeWithRecommended } from './defaultTaskParams';
import { ChevronDownIcon } from '../../Icons';

interface TaskConfigPanelProps {
  settings: LLMSettings;
  allModels: Array<{ providerId: string; providerName: string; modelId: string }>;
  onSaveTask: (
    taskType: LLMTaskType,
    config: {
      providerId: string;
      modelId: string;
      params?: Partial<LLMModelParams>;
    }
  ) => void;
  onClearTask: (taskType: LLMTaskType) => void;
}

export const TaskConfigPanel: React.FC<TaskConfigPanelProps> = ({
  settings,
  allModels,
  onSaveTask,
  onClearTask,
}) => {
  const allTasks = getAllTasks();
  const [selectedTaskId, setSelectedTaskId] = useState<string>(allTasks[0]?.id || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get current task definition
  const currentTask = allTasks.find((t) => t.id === selectedTaskId);
  const existingConfig = currentTask ? settings.taskModels[currentTask.id as LLMTaskType] : undefined;

  // Model selection state - initialized from existing config or global defaults
  const [providerId, setProviderId] = useState<string>(
    existingConfig?.providerId || settings.defaultProvider || ''
  );
  const [modelId, setModelId] = useState<string>(
    existingConfig?.modelId || settings.defaultModel || ''
  );

  // Parameters state - auto-apply recommended params on first load
  const [params, setParams] = useState<Partial<LLMModelParams>>(() => {
    if (!currentTask) return {};
    return mergeWithRecommended(currentTask.id as LLMTaskType, existingConfig?.params);
  });

  // Update state when task changes
  useEffect(() => {
    if (!currentTask) return;
    const config = settings.taskModels[currentTask.id as LLMTaskType];
    setProviderId(config?.providerId || settings.defaultProvider || '');
    setModelId(config?.modelId || settings.defaultModel || '');
    setParams(mergeWithRecommended(currentTask.id as LLMTaskType, config?.params));
    setShowAdvanced(false);
  }, [selectedTaskId, settings.taskModels, settings.defaultProvider, settings.defaultModel, currentTask]);

  const handleSave = () => {
    if (!currentTask || !providerId || !modelId) return;
    onSaveTask(currentTask.id as LLMTaskType, { providerId, modelId, params });
  };

  const handleClear = () => {
    if (!currentTask) return;
    onClearTask(currentTask.id as LLMTaskType);
    // Reset to defaults after clearing
    setProviderId(settings.defaultProvider || '');
    setModelId(settings.defaultModel || '');
    setParams(mergeWithRecommended(currentTask.id as LLMTaskType, undefined));
  };

  const handleResetToRecommended = () => {
    if (!currentTask) return;
    setParams(getRecommendedParams(currentTask.id as LLMTaskType));
  };

  const canClear = !!existingConfig;
  const isUsingDefaultModel =
    providerId === settings.defaultProvider && modelId === settings.defaultModel;

  if (!currentTask) {
    return (
      <div className="p-6 rounded-xl border border-dashed border-[var(--glass-border)] text-center">
        <p style={{ color: 'var(--text-secondary)' }}>No tasks available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Task Selector Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-sm">
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Select AI Task
          </label>
          <div className="relative">
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full appearance-none px-4 py-2.5 pr-10 rounded-lg text-sm font-medium
                transition-all cursor-pointer
                hover:border-[var(--text-secondary)]/50"
              style={{
                backgroundColor: 'var(--surface-hover)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-main)',
              }}
            >
              {allTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronDownIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </div>
          </div>
        </div>

        {currentTask.isExperimental && (
          <span className="px-2 py-1 rounded text-xs bg-amber-500/20 text-amber-400">
            Beta
          </span>
        )}
      </div>

      {/* Task Description */}
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--surface-hover)', border: '1px solid var(--glass-border)' }}>
        <h4 className="text-sm font-medium mb-1" style={{ color: 'var(--text-main)' }}>
          {currentTask.label}
        </h4>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {currentTask.description}
        </p>
      </div>

      {/* Model Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
          Model
        </label>
        <ModelSelector
          value={providerId && modelId ? `${providerId}:${modelId}` : ''}
          options={allModels}
          onChange={(pid, mid) => {
            setProviderId(pid);
            setModelId(mid);
          }}
          placeholder="Select a model"
          allowClear={false}
        />
        {isUsingDefaultModel && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Using default model ({settings.defaultModel})
          </p>
        )}
      </div>

      {/* Parameters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
            Parameters
          </label>
          <button
            onClick={handleResetToRecommended}
            className="text-xs hover:underline transition-colors"
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
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
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
          onClick={handleSave}
          disabled={!providerId || !modelId}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--text-main)] text-white
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all shadow-lg hover:shadow-xl
            hover:scale-105 active:scale-95"
        >
          Save Configuration
        </button>
        {canClear && (
          <span className="ml-auto text-xs flex items-center gap-1.5" style={{ color: 'var(--text-emerald)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Configuration saved
          </span>
        )}
      </div>
    </div>
  );
};
