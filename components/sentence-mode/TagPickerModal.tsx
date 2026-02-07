import React, { useState, useMemo } from 'react';
import { TagInfo, SYSTEM_TAGS, SystemTagId } from '../../types';
import { TagChip } from './TagChip';

interface TagPickerModalProps {
  isOpen: boolean;
  sentenceId: string;
  currentTags: string[];
  userTags: TagInfo[];
  onToggleTag: (tagId: string) => void;
  onCreateTag: (label: string, color?: string) => Promise<TagInfo | null>;
  onClose: () => void;
}

// Predefined colors for new tags
const TAG_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

/**
 * TagPickerModal - Modal for selecting and managing tags on a sentence
 *
 * Features:
 * - Search/filter tags
 * - Toggle system tags (skip, mastered, difficult)
 * - Toggle user-defined tags
 * - Create new tags inline
 */
export const TagPickerModal: React.FC<TagPickerModalProps> = ({
  isOpen,
  currentTags,
  userTags,
  onToggleTag,
  onCreateTag,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);

  // Get all system tags as array
  const systemTagList = useMemo(() => {
    return Object.values(SYSTEM_TAGS);
  }, []);

  // Filter tags based on search query
  const filteredSystemTags = useMemo(() => {
    if (!searchQuery.trim()) return systemTagList;
    const query = searchQuery.toLowerCase();
    return systemTagList.filter(t =>
      t.label.toLowerCase().includes(query) || t.id.toLowerCase().includes(query)
    );
  }, [systemTagList, searchQuery]);

  const filteredUserTags = useMemo(() => {
    if (!searchQuery.trim()) return userTags;
    const query = searchQuery.toLowerCase();
    return userTags.filter(t =>
      t.label.toLowerCase().includes(query) || t.id.toLowerCase().includes(query)
    );
  }, [userTags, searchQuery]);

  // Check if tag is selected
  const isTagSelected = (tagId: string) => currentTags.includes(tagId);

  // Handle creating a new tag
  const handleCreateTag = async () => {
    if (!newTagLabel.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const newTag = await onCreateTag(newTagLabel.trim(), newTagColor);
      if (newTag) {
        // Auto-select the newly created tag
        onToggleTag(newTag.id);
        setNewTagLabel('');
        setNewTagColor(TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]);
      }
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            管理标签
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <input
            type="text"
            placeholder="搜索标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* System Tags */}
          {filteredSystemTags.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                系统标签
              </h4>
              <div className="space-y-1">
                {filteredSystemTags.map((tag) => (
                  <TagRow
                    key={tag.id}
                    tag={tag}
                    isSelected={isTagSelected(tag.id)}
                    onToggle={() => onToggleTag(tag.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* User Tags */}
          {filteredUserTags.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                自定义标签
              </h4>
              <div className="space-y-1">
                {filteredUserTags.map((tag) => (
                  <TagRow
                    key={tag.id}
                    tag={tag}
                    isSelected={isTagSelected(tag.id)}
                    onToggle={() => onToggleTag(tag.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {filteredSystemTags.length === 0 && filteredUserTags.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              没有找到匹配的标签
            </div>
          )}
        </div>

        {/* Create new tag */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            创建新标签
          </h4>
          <div className="flex gap-2">
            {/* Color picker */}
            <div className="relative">
              <button
                type="button"
                className="w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center"
                style={{ backgroundColor: newTagColor }}
                title="选择颜色"
              >
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </button>
            </div>

            {/* Label input */}
            <input
              type="text"
              placeholder="标签名称"
              value={newTagLabel}
              onChange={(e) => setNewTagLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateTag();
                }
              }}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* Create button */}
            <button
              type="button"
              onClick={handleCreateTag}
              disabled={!newTagLabel.trim() || isCreating}
              className="px-4 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? '...' : '添加'}
            </button>
          </div>

          {/* Quick color selection */}
          <div className="flex gap-1 mt-2">
            {TAG_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setNewTagColor(color)}
                className={`w-5 h-5 rounded-full transition-transform ${newTagColor === color ? 'ring-2 ring-offset-1 ring-blue-500 scale-110' : 'hover:scale-110'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * TagRow - Single tag row with checkbox
 */
interface TagRowProps {
  tag: TagInfo;
  isSelected: boolean;
  onToggle: () => void;
}

const TagRow: React.FC<TagRowProps> = ({ tag, isSelected, onToggle }) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/30'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
      }`}
    >
      {/* Checkbox */}
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          isSelected
            ? 'bg-blue-500 border-blue-500'
            : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        {isSelected && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Tag chip */}
      <TagChip tag={tag} size="sm" showLabel />

      {/* System tag indicator */}
      {tag.isSystem && (
        <span className="ml-auto text-xs text-gray-400">系统</span>
      )}
    </button>
  );
};

export default TagPickerModal;
