/**
 * Task Grid Component
 *
 * Grid container for task cards.
 */

import React from 'react';
import { LLMSettings } from '../../../types';
import { TaskDefinition } from './taskMetadata';
import { TaskCard } from './TaskCard';

interface TaskGridProps {
  tasks: TaskDefinition[];
  settings: LLMSettings;
  allModels: Array<{ providerId: string; providerName: string; modelId: string }>;
  onConfigureTask: (task: TaskDefinition) => void;
}

/**
 * Grid of task cards for a category
 */
export const TaskGrid: React.FC<TaskGridProps> = ({
  tasks,
  settings,
  allModels,
  onConfigureTask,
}) => {
  if (tasks.length === 0) {
    return (
      <div
        className="p-8 text-center rounded-xl border border-dashed border-[var(--glass-border)]"
        style={{ color: 'var(--text-secondary)' }}
      >
        <p className="text-sm">No tasks in this category</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          settings={settings}
          allModels={allModels}
          onConfigure={onConfigureTask}
        />
      ))}
    </div>
  );
};
