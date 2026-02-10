/**
 * Task Category Tabs Component
 *
 * Tab navigation for task categories.
 */

import React from 'react';
import { TaskCategory, getAllCategories } from './taskMetadata';

interface TaskCategoryTabsProps {
  activeCategory: TaskCategory;
  onCategoryChange: (category: TaskCategory) => void;
}

/**
 * Tab navigation for task categories
 */
export const TaskCategoryTabs: React.FC<TaskCategoryTabsProps> = ({
  activeCategory,
  onCategoryChange,
}) => {
  const categories = getAllCategories();

  return (
    <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
            activeCategory === category.id
              ? 'bg-[var(--text-main)] text-white shadow-lg'
              : 'bg-[var(--surface-hover)] hover:bg-[var(--surface-active)]'
          }`}
          style={
            activeCategory !== category.id
              ? { color: 'var(--text-main)' }
              : undefined
          }
        >
          {category.label}
        </button>
      ))}
    </div>
  );
};
