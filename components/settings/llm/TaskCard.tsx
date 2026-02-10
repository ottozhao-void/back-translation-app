/**
 * Task Card Component
 *
 * Displays a single task with its configuration status.
 */

import React from 'react';
import { LLMSettings } from '../../../types';
import { TaskDefinition } from './taskMetadata';

interface TaskCardProps {
  task: TaskDefinition;
  settings: LLMSettings;
  allModels: Array<{ providerId: string; providerName: string; modelId: string }>;
  onConfigure: (task: TaskDefinition) => void;
}

/**
 * Card displaying task info and current model configuration
 */
export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  settings,
  allModels,
  onConfigure,
}) => {
  const taskConfig = settings.taskModels[task.id];
  const hasCustomConfig = !!taskConfig;
  const hasCustomParams =
    taskConfig?.params && Object.keys(taskConfig.params).length > 0;

  // Get display model name
  const getModelDisplay = () => {
    if (!taskConfig) {
      return 'Using Default Model';
    }
    const modelInfo = allModels.find(
      (m) =>
        m.providerId === taskConfig.providerId && m.modelId === taskConfig.modelId
    );
    if (modelInfo) {
      return modelInfo.modelId;
    }
    return 'Custom Model';
  };

  return (
    <button
      onClick={() => onConfigure(task)}
      className="w-full p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10 hover:bg-[var(--surface-hover)]/20 text-left transition-all group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-sm font-medium"
              style={{ color: 'var(--text-main)' }}
            >
              {task.label}
            </span>
            {task.isExperimental && (
              <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">
                Beta
              </span>
            )}
            {hasCustomParams && (
              <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                Custom Params
              </span>
            )}
          </div>
          <p
            className="text-xs line-clamp-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            {task.description}
          </p>
        </div>

        <div className="flex-shrink-0">
          <span
            className={`text-xs font-mono px-2 py-1 rounded ${
              hasCustomConfig
                ? 'bg-[var(--surface-active)]'
                : 'bg-[var(--surface-hover)]/50'
            }`}
            style={{ color: 'var(--text-secondary)' }}
          >
            {getModelDisplay()}
          </span>
        </div>
      </div>
    </button>
  );
};
