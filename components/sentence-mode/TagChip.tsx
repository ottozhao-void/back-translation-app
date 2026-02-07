import React from 'react';
import { TagInfo, SYSTEM_TAGS } from '../../types';

interface TagChipProps {
  tag: TagInfo | string;  // Can pass TagInfo object or tag ID string
  size?: 'sm' | 'md';
  onRemove?: () => void;     // Shows X button when provided
  onClick?: () => void;      // Makes chip clickable
  isActive?: boolean;        // Highlight state for filters
  showLabel?: boolean;       // Show label text (default: true for md, false for sm)
}

/**
 * Helper to get TagInfo from tag ID or TagInfo object
 */
export const getTagInfo = (tag: TagInfo | string): TagInfo => {
  if (typeof tag === 'string') {
    // Check if it's a system tag
    if (tag in SYSTEM_TAGS) {
      return SYSTEM_TAGS[tag as keyof typeof SYSTEM_TAGS];
    }
    // Return a default for unknown tags
    return {
      id: tag,
      label: tag,
      color: '#6b7280',
      isSystem: false,
    };
  }
  return tag;
};

/**
 * TagChip - Displays a tag as a colored chip/badge
 *
 * Usage:
 * - In sentence list: small colored dot indicator
 * - In detail view: full chip with label
 * - In filter bar: clickable filter chip
 */
export const TagChip: React.FC<TagChipProps> = ({
  tag,
  size = 'md',
  onRemove,
  onClick,
  isActive = false,
  showLabel,
}) => {
  const tagInfo = getTagInfo(tag);
  const shouldShowLabel = showLabel ?? (size === 'md');

  // Small dot indicator (for sentence list items)
  if (size === 'sm' && !shouldShowLabel) {
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${onClick ? 'cursor-pointer' : ''}`}
        style={{ backgroundColor: tagInfo.color || '#6b7280' }}
        title={tagInfo.label}
        onClick={onClick}
      />
    );
  }

  // Full chip with label
  const baseClasses = `
    inline-flex items-center gap-1 rounded-full font-medium transition-all
    ${size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'}
    ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
    ${isActive ? 'ring-2 ring-offset-1 ring-blue-500' : ''}
  `;

  // Use tag color as background with transparency
  const chipStyle: React.CSSProperties = {
    backgroundColor: `${tagInfo.color || '#6b7280'}20`,
    color: tagInfo.color || '#6b7280',
    borderColor: `${tagInfo.color || '#6b7280'}40`,
    borderWidth: '1px',
    borderStyle: 'solid',
  };

  return (
    <span
      className={baseClasses}
      style={chipStyle}
      onClick={onClick}
    >
      {/* Color dot */}
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: tagInfo.color || '#6b7280' }}
      />

      {/* Label */}
      <span className="truncate max-w-[100px]">{tagInfo.label}</span>

      {/* Remove button */}
      {onRemove && (
        <button
          type="button"
          className="ml-0.5 hover:opacity-60 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${tagInfo.label} tag`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
};

/**
 * TagDots - Displays multiple tags as small colored dots
 * Used in sentence list items to show tag indicators
 */
interface TagDotsProps {
  tags: string[];
  maxVisible?: number;
  allTags?: TagInfo[];  // For resolving user tag colors
}

export const TagDots: React.FC<TagDotsProps> = ({
  tags,
  maxVisible = 3,
  allTags = [],
}) => {
  if (!tags || tags.length === 0) return null;

  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = tags.length - maxVisible;

  // Helper to get color for a tag ID
  const getColor = (tagId: string): string => {
    // Check system tags first
    if (tagId in SYSTEM_TAGS) {
      return SYSTEM_TAGS[tagId as keyof typeof SYSTEM_TAGS].color || '#6b7280';
    }
    // Check user tags
    const userTag = allTags.find(t => t.id === tagId);
    return userTag?.color || '#6b7280';
  };

  return (
    <div className="flex items-center gap-0.5">
      {visibleTags.map((tagId) => (
        <span
          key={tagId}
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: getColor(tagId) }}
          title={getTagInfo(tagId).label}
        />
      ))}
      {hiddenCount > 0 && (
        <span className="text-xs text-gray-400 ml-0.5">+{hiddenCount}</span>
      )}
    </div>
  );
};

export default TagChip;
