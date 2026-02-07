import React, { useState } from 'react';
import { SentencePair, PracticeMode, SidebarDisplayMode, TagInfo, SYSTEM_TAGS, SystemTagId } from '../../types';
import { ArrowLeftIcon, HistoryIcon } from '../Icons';
import { TagDots, getTagInfo } from './TagChip';

interface SentenceItemProps {
  sentence: SentencePair;
  index: number;
  isSelected: boolean;
  practiceMode: PracticeMode;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onMenuClick: (e: React.MouseEvent) => void;
  allTags?: TagInfo[];  // For resolving user tag colors
}

const SentenceItem: React.FC<SentenceItemProps> = ({ sentence, index, isSelected, practiceMode, onClick, onContextMenu, onMenuClick, allTags = [] }) => {
  const translation = practiceMode === 'EN_TO_ZH' ? sentence.userTranslationZh : sentence.userTranslationEn;
  const displayText = practiceMode === 'EN_TO_ZH' ? sentence.en : sentence.zh;

  let statusIcon = '○'; // Not started
  let statusColor = 'text-gray-400';
  if (translation) {
    if (translation.type === 'draft') {
      statusIcon = '◐';
      statusColor = 'text-yellow-400';
    } else {
      statusIcon = '●';
      statusColor = 'text-emerald-400';
    }
  }

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`w-full text-left p-3 transition-all duration-150 border-l-3 cursor-pointer group ${
        isSelected
          ? 'bg-[var(--surface-active)] border-l-[var(--text-main)]'
          : 'hover:bg-[var(--surface-hover)] border-l-transparent'
      }`}
      style={{ borderLeftWidth: '3px' }}
    >
      <div className="flex items-start gap-2">
        <span className="text-xs font-mono opacity-50 mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {index + 1}.
        </span>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm line-clamp-2 font-serif-sc"
            style={{ color: 'var(--text-main)' }}
          >
            {displayText.slice(0, 60)}{displayText.length > 60 ? '...' : ''}
          </p>
          {/* Tag indicators */}
          {sentence.tags && sentence.tags.length > 0 && (
            <div className="mt-1">
              <TagDots tags={sentence.tags} allTags={allTags} maxVisible={3} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-xs ${statusColor}`}>{statusIcon}</span>
          {/* Three dots menu button */}
          <button
            onClick={onMenuClick}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-hover)] transition-all"
            title="More options"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text-secondary)' }}>
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// Context filter for paragraph/article/tag filtering
export interface ContextFilter {
  type: 'paragraph' | 'article' | 'tag';
  id: string;
  label: string;
}

interface SentenceSidebarProps {
  sentences: SentencePair[];
  selectedId: string | null;
  practiceMode: PracticeMode;
  onSelectSentence: (id: string) => void;
  onImport: () => void;
  onDeleteSentence?: (id: string) => void;
  onOpenHistory?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  contextFilter?: ContextFilter | null;
  onClearContextFilter?: () => void;
  onSetContextFilter?: (filter: ContextFilter) => void;
  displayMode: SidebarDisplayMode;
  onDisplayModeChange: (mode: SidebarDisplayMode) => void;
  // Tag system props
  allTags?: TagInfo[];
  onToggleTag?: (sentenceId: string, tagId: string) => void;
  onOpenTagPicker?: (sentenceId: string) => void;
}

// View mode selector component
const ViewModeSelector: React.FC<{
  mode: SidebarDisplayMode;
  onChange: (mode: SidebarDisplayMode) => void;
}> = ({ mode, onChange }) => {
  const modes: { value: SidebarDisplayMode; label: string; icon: string }[] = [
    { value: 'flat', label: 'Flat', icon: '☰' },
    { value: 'by-article', label: 'Article', icon: '📄' },
    { value: 'by-paragraph', label: 'Paragraph', icon: '¶' },
    { value: 'by-tag', label: 'Tag', icon: '🏷' },
  ];

  return (
    <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--surface-hover)' }}>
      {modes.map(({ value, label, icon }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`flex-1 px-2 py-1 text-xs rounded-md transition-all ${
            mode === value
              ? 'bg-[var(--bg-main)] shadow-sm'
              : 'hover:bg-[var(--bg-main)]/50'
          }`}
          style={{ color: mode === value ? 'var(--text-main)' : 'var(--text-secondary)' }}
          title={label}
        >
          <span className="mr-1">{icon}</span>
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
};

// Group header component for article/paragraph groups - click to drill down
const GroupItem: React.FC<{
  label: string;
  count: number;
  onClick: () => void;
}> = ({ label, count, onClick }) => (
  <button
    onClick={onClick}
    className="w-full px-3 py-3 flex items-center justify-between hover:bg-[var(--surface-hover)] transition-colors border-b border-[var(--glass-border)]/30"
  >
    <div className="flex items-center gap-2 min-w-0">
      <span
        className="text-sm font-medium truncate"
        style={{ color: 'var(--text-main)' }}
      >
        {label}
      </span>
    </div>
    <div className="flex items-center gap-2">
      <span
        className="text-xs px-1.5 py-0.5 rounded-full"
        style={{ backgroundColor: 'var(--surface-active)', color: 'var(--text-secondary)' }}
      >
        {count}
      </span>
      <span style={{ color: 'var(--text-secondary)' }}>›</span>
    </div>
  </button>
);

export const SentenceSidebar: React.FC<SentenceSidebarProps> = ({
  sentences,
  selectedId,
  practiceMode,
  onSelectSentence,
  onImport,
  onDeleteSentence,
  onOpenHistory,
  isCollapsed = false,
  onToggleCollapse,
  contextFilter,
  onClearContextFilter,
  onSetContextFilter,
  displayMode,
  onDisplayModeChange,
  allTags = [],
  onToggleTag,
  onOpenTagPicker,
}) => {
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  // Get the sentence for context menu
  const contextMenuSentence = React.useMemo(() => {
    if (!contextMenu) return null;
    return sentences.find(s => s.id === contextMenu.id) || null;
  }, [contextMenu, sentences]);

  // System tags as array for menu
  const systemTagList = React.useMemo(() => Object.values(SYSTEM_TAGS), []);

  // Get displayed sentences - either filtered by context or all sentences
  const displayedSentences = React.useMemo(() => {
    if (!contextFilter) {
      // Default: show all sentences sorted by creation time (newest first)
      return [...sentences].sort((a, b) => b.createdAt - a.createdAt);
    }

    if (contextFilter.type === 'paragraph') {
      // For paragraph context, sort by sentence order within paragraph
      return sentences
        .filter(s => s.paragraphId === contextFilter.id)
        .sort((a, b) => a.order - b.order);
    }
    if (contextFilter.type === 'article') {
      // For article context, sort by paragraphOrder first, then by sentence order
      return sentences
        .filter(s => s.articleId === contextFilter.id)
        .sort((a, b) => {
          // First compare by paragraph order (position of paragraph in article)
          const paraOrderA = a.paragraphOrder ?? 0;
          const paraOrderB = b.paragraphOrder ?? 0;
          if (paraOrderA !== paraOrderB) {
            return paraOrderA - paraOrderB;
          }
          // Then compare by sentence order (position within paragraph)
          return a.order - b.order;
        });
    }
    if (contextFilter.type === 'tag') {
      // For tag context, filter by tag and sort by creation time
      return sentences
        .filter(s => s.tags?.includes(contextFilter.id))
        .sort((a, b) => b.createdAt - a.createdAt);
    }
    return sentences;
  }, [sentences, contextFilter]);

  // Group sentences by article, paragraph, or tag for group list view
  const groupList = React.useMemo(() => {
    // Only show group list when in grouped mode AND no context filter is active
    if (displayMode === 'flat' || contextFilter) {
      return null;
    }

    const groups = new Map<string, { label: string; count: number; color?: string }>();

    if (displayMode === 'by-article') {
      sentences.forEach(s => {
        const groupId = s.articleId || 'ungrouped';
        const label = s.articleId || 'Standalone';
        if (!groups.has(groupId)) {
          groups.set(groupId, { label, count: 0 });
        }
        groups.get(groupId)!.count++;
      });
    } else if (displayMode === 'by-paragraph') {
      sentences.forEach(s => {
        const groupId = s.paragraphId || 'ungrouped';
        const label = s.paragraphId
          ? `¶ ${s.paragraphId.slice(0, 12)}...`
          : 'Standalone';
        if (!groups.has(groupId)) {
          groups.set(groupId, { label, count: 0 });
        }
        groups.get(groupId)!.count++;
      });
    } else if (displayMode === 'by-tag') {
      // Count sentences by tag
      const tagCounts = new Map<string, number>();
      let untaggedCount = 0;

      sentences.forEach(s => {
        if (!s.tags || s.tags.length === 0) {
          untaggedCount++;
        } else {
          s.tags.forEach(tagId => {
            tagCounts.set(tagId, (tagCounts.get(tagId) || 0) + 1);
          });
        }
      });

      // Add untagged group first
      if (untaggedCount > 0) {
        groups.set('_untagged', { label: '无标签', count: untaggedCount, color: '#9ca3af' });
      }

      // Add tag groups
      tagCounts.forEach((count, tagId) => {
        const tagInfo = getTagInfo(tagId);
        // Try to get color from allTags if available
        const userTag = allTags.find(t => t.id === tagId);
        const color = userTag?.color || tagInfo.color;
        groups.set(tagId, { label: tagInfo.label, count, color });
      });
    }

    return groups;
  }, [sentences, displayMode, contextFilter, allTags]);

  // Handle clicking a group to drill down
  const handleGroupClick = (groupId: string, label: string) => {
    if (!onSetContextFilter) return;

    if (displayMode === 'by-article') {
      onSetContextFilter({
        type: 'article',
        id: groupId === 'ungrouped' ? '' : groupId,
        label,
      });
    } else if (displayMode === 'by-paragraph') {
      onSetContextFilter({
        type: 'paragraph',
        id: groupId === 'ungrouped' ? '' : groupId,
        label,
      });
    } else if (displayMode === 'by-tag') {
      // For untagged, we need special handling
      if (groupId === '_untagged') {
        // Filter to sentences without any tags
        onSetContextFilter({
          type: 'tag',
          id: '_untagged',
          label: '无标签',
        });
      } else {
        onSetContextFilter({
          type: 'tag',
          id: groupId,
          label,
        });
      }
    }
  };

  // Close context menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent, sentenceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ id: sentenceId, x: e.clientX, y: e.clientY });
  };

  const handleMenuClick = (e: React.MouseEvent, sentenceId: string) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setContextMenu({ id: sentenceId, x: rect.right, y: rect.top });
  };

  const handleDelete = (sentenceId: string) => {
    if (onDeleteSentence) {
      onDeleteSentence(sentenceId);
    }
    setContextMenu(null);
  };

  // Collapsed state - show only minimal content
  if (isCollapsed) {
    return (
      <div className="w-10 flex-shrink-0 border-r border-[var(--glass-border)] flex flex-col h-full bg-[var(--surface-hover)]/20">
        {/* Vertical text indicator */}
        <div className="flex-1 flex items-center justify-center">
          <span
            className="text-xs font-mono uppercase tracking-widest transform -rotate-90 whitespace-nowrap"
            style={{ color: 'var(--text-secondary)' }}
          >
            {sentences.length} items
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 flex-shrink-0 border-r border-[var(--glass-border)] flex flex-col h-full overflow-hidden bg-[var(--surface-hover)]/20 transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-[var(--glass-border)] flex-shrink-0">
        <div className="min-w-0">
          {contextFilter ? (
            <button
              onClick={onClearContextFilter}
              className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity max-w-full"
              style={{ color: 'var(--text-main)' }}
            >
              <ArrowLeftIcon />
              <span className="truncate">{contextFilter.label}</span>
            </button>
          ) : (
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-mono uppercase tracking-widest truncate" style={{ color: 'var(--text-secondary)' }}>
                All Sentences
              </h2>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* History Button */}
                {onOpenHistory && (
                  <button
                    onClick={onOpenHistory}
                    className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                    title="Practice History"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <HistoryIcon />
                  </button>
                )}
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--surface-active)', color: 'var(--text-secondary)' }}
                >
                  {displayedSentences.length}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Content - Flat sentence list or Group list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {sentences.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
            <p className="text-sm">No sentences yet.</p>
            <p className="text-xs mt-2">Click Import to add sentences.</p>
          </div>
        ) : groupList ? (
          // Group list view (by-article or by-paragraph mode without context filter)
          Array.from(groupList.entries()).map(([groupId, { label, count }]) => (
            <GroupItem
              key={groupId}
              label={label}
              count={count}
              onClick={() => handleGroupClick(groupId, label)}
            />
          ))
        ) : (
          // Flat display or filtered context view
          displayedSentences.map((sentence: SentencePair, index: number) => (
            <SentenceItem
              key={sentence.id}
              sentence={sentence}
              index={index}
              isSelected={sentence.id === selectedId}
              practiceMode={practiceMode}
              onClick={() => onSelectSentence(sentence.id)}
              onContextMenu={(e) => handleContextMenu(e, sentence.id)}
              onMenuClick={(e) => handleMenuClick(e, sentence.id)}
              allTags={allTags}
            />
          ))
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && contextMenuSentence && (
        <div
          className="fixed z-50 py-1 min-w-48 rounded-lg shadow-xl border border-[var(--glass-border)]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: 'var(--bg-main)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Tag Section Header */}
          <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            标签
          </div>

          {/* System Tags */}
          {systemTagList.map((tag) => {
            const isSelected = contextMenuSentence.tags?.includes(tag.id) || false;
            return (
              <button
                key={tag.id}
                onClick={() => {
                  if (onToggleTag) {
                    onToggleTag(contextMenu.id, tag.id);
                  }
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-2"
                style={{ color: 'var(--text-main)' }}
              >
                {/* Checkbox indicator */}
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-400'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                {/* Color dot */}
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span>{tag.label}</span>
              </button>
            );
          })}

          {/* Divider */}
          <div className="my-1 border-t border-[var(--glass-border)]" />

          {/* Manage Tags */}
          {onOpenTagPicker && (
            <button
              onClick={() => {
                onOpenTagPicker(contextMenu.id);
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-2"
              style={{ color: 'var(--text-main)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              <span>管理标签...</span>
            </button>
          )}

          {/* Divider */}
          <div className="my-1 border-t border-[var(--glass-border)]" />

          {/* Delete */}
          <button
            onClick={() => handleDelete(contextMenu.id)}
            className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-2"
            style={{ color: 'var(--text-main)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span className="text-red-400">删除</span>
          </button>
        </div>
      )}

      {/* Footer with progress - only show position when sentence is selected */}
      {selectedId && (
        <div className="p-3 border-t border-[var(--glass-border)] text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
          {displayedSentences.findIndex(s => s.id === selectedId) + 1} / {displayedSentences.length}
        </div>
      )}

      {/* View Mode Selector - Above Import, only show when not in context filter mode */}
      {!contextFilter && (
        <div className="px-4 py-3 border-t border-[var(--glass-border)] flex-shrink-0">
          <ViewModeSelector mode={displayMode} onChange={onDisplayModeChange} />
        </div>
      )}

      {/* Import Button - Always visible */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        <button
          onClick={onImport}
          className="w-full py-2 px-4 rounded-lg text-sm font-medium border border-[var(--glass-border)] hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center gap-2"
          style={{ color: 'var(--text-main)' }}
        >
          <span>+</span>
          <span>Import</span>
        </button>
      </div>
    </div>
  );
};
