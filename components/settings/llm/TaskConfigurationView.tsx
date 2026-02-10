/**
 * Task Configuration View Component
 *
 * Main task configuration interface with tabbed categories.
 * Composes tabs, grid, and modal for complete task configuration.
 */

import React, { useState } from 'react';
import { LLMSettings, LLMTaskType, LLMModelParams } from '../../../types';
import { TaskCategory, TaskDefinition, getTasksByCategory } from './taskMetadata';
import { TaskCategoryTabs } from './TaskCategoryTabs';
import { TaskGrid } from './TaskGrid';
import { TaskConfigModal } from './TaskConfigModal';

interface TaskConfigurationViewProps {
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

/**
 * Main task configuration interface with tabbed categories
 */
export const TaskConfigurationView: React.FC<TaskConfigurationViewProps> = ({
  settings,
  allModels,
  onSaveTask,
  onClearTask,
}) => {
  const [activeCategory, setActiveCategory] = useState<TaskCategory>('segmentation');
  const [selectedTask, setSelectedTask] = useState<TaskDefinition | null>(null);

  const currentTasks = getTasksByCategory(activeCategory);

  return (
    <div className="p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10 space-y-4">
      <div className="space-y-1">
        <h4
          className="text-sm font-medium"
          style={{ color: 'var(--text-main)' }}
        >
          Task Configuration
        </h4>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Configure models and parameters for specific AI tasks
        </p>
      </div>

      <TaskCategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      <div className="pt-2">
        <TaskGrid
          tasks={currentTasks}
          settings={settings}
          allModels={allModels}
          onConfigureTask={setSelectedTask}
        />
      </div>

      {selectedTask && (
        <TaskConfigModal
          task={selectedTask}
          settings={settings}
          allModels={allModels}
          onSave={onSaveTask}
          onClear={onClearTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
};
