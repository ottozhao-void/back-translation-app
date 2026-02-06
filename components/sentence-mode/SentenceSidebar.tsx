import React, { useState } from 'react';
import { SentencePair, PracticeMode } from '../../types';
import { ArrowLeftIcon } from '../Icons';

// Helper to get source display name
const getSourceDisplayName = (sourceType: string): string => {
  if (sourceType === 'manual') return 'Manual Entries';
  // Extract readable name from article ID (e.g., "1766636093980_the_essence.json" -> "The Essence")
  const match = sourceType.match(/_([^.]+)/);
  if (match) {
    return match[1]
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return sourceType;
};

// Progress indicator component
const ProgressDots: React.FC<{ practiced: number; total: number }> = ({ practiced, total }) => {
  const percentage = total > 0 ? (practiced / total) * 100 : 0;
  let status: 'none' | 'partial' | 'complete' = 'none';
  if (percentage >= 80) status = 'complete';
  else if (percentage > 0) status = 'partial';

  const colors = {
    none: 'bg-gray-500/30',
    partial: 'bg-yellow-500/60',
    complete: 'bg-emerald-500/60'
  };

  return (
    <div className="flex gap-1">
      <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
      <div className={`w-2 h-2 rounded-full ${percentage >= 50 ? colors[status] : 'bg-gray-500/30'}`} />
    </div>
  );
};

interface SourceCardProps {
  sourceType: string;
  sentences: SentencePair[];
  practiceMode: PracticeMode;
  onClick: () => void;
}

const SourceCard: React.FC<SourceCardProps> = ({ sourceType, sentences, practiceMode, onClick }) => {
  const practicedCount = sentences.filter(s => {
    const translation = practiceMode === 'EN_TO_ZH' ? s.userTranslationZh : s.userTranslationEn;
    return translation && translation.type !== 'draft';
  }).length;

  const icon = sourceType === 'manual' ? '✏️' : '📄';

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--surface-hover)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg group"
    >
      <div className="flex items-start gap-3">
        <span className="text-lg">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate" style={{ color: 'var(--text-main)' }}>
            {getSourceDisplayName(sourceType)}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {sentences.length} sentences
            </span>
            <ProgressDots practiced={practicedCount} total={sentences.length} />
          </div>
        </div>
      </div>
    </button>
  );
};

interface SentenceItemProps {
  sentence: SentencePair;
  index: number;
  isSelected: boolean;
  practiceMode: PracticeMode;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onMenuClick: (e: React.MouseEvent) => void;
}

const SentenceItem: React.FC<SentenceItemProps> = ({ sentence, index, isSelected, practiceMode, onClick, onContextMenu, onMenuClick }) => {
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

interface SentenceSidebarProps {
  sentences: SentencePair[];
  selectedId: string | null;
  practiceMode: PracticeMode;
  onSelectSentence: (id: string) => void;
  onImport: () => void;
  onDeleteSentence?: (id: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

type SidebarLevel =
  | { level: 'sources' }
  | { level: 'sentences'; sourceType: string };

export const SentenceSidebar: React.FC<SentenceSidebarProps> = ({
  sentences,
  selectedId,
  practiceMode,
  onSelectSentence,
  onImport,
  onDeleteSentence,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [sidebarState, setSidebarState] = useState<SidebarLevel>({ level: 'sources' });
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  // Group sentences by sourceType
  const groupedSentences = React.useMemo(() => {
    const groups = new Map<string, SentencePair[]>();
    for (const sentence of sentences) {
      const key = sentence.sourceType;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(sentence);
    }
    return groups;
  }, [sentences]);

  const sourceTypes: string[] = Array.from(groupedSentences.keys());
  const currentSentences = sidebarState.level === 'sentences'
    ? groupedSentences.get(sidebarState.sourceType) || []
    : [];

  const handleSourceClick = (sourceType: string) => {
    setSidebarState({ level: 'sentences', sourceType });
  };

  const handleBack = () => {
    setSidebarState({ level: 'sources' });
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

  const isSourcesView = sidebarState.level === 'sources';

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
          {isSourcesView ? (
            <h2 className="text-sm font-mono uppercase tracking-widest truncate" style={{ color: 'var(--text-secondary)' }}>
              Sources
            </h2>
          ) : (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity max-w-full"
              style={{ color: 'var(--text-main)' }}
            >
              <ArrowLeftIcon />
              <span className="truncate">{getSourceDisplayName(sidebarState.sourceType)}</span>
            </button>
          )}
        </div>
      </div>

      {/* Content with slide animation */}
      <div className="flex-1 relative overflow-hidden">
        {/* Sources View (Level 1) */}
        <div
          className={`absolute inset-0 overflow-y-auto custom-scrollbar p-4 space-y-3 transition-transform duration-300 ease-out ${
            isSourcesView ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sourceTypes.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
              <p className="text-sm">No sentences yet.</p>
              <p className="text-xs mt-2">Add sentences or import from articles.</p>
            </div>
          ) : (
            sourceTypes.map(sourceType => (
              <SourceCard
                key={sourceType}
                sourceType={sourceType}
                sentences={groupedSentences.get(sourceType) || []}
                practiceMode={practiceMode}
                onClick={() => handleSourceClick(sourceType)}
              />
            ))
          )}
        </div>

        {/* Sentences View (Level 2) */}
        <div
          className={`absolute inset-0 overflow-y-auto custom-scrollbar transition-transform duration-300 ease-out ${
            isSourcesView ? 'translate-x-full' : 'translate-x-0'
          }`}
        >
          {currentSentences.map((sentence: SentencePair, index: number) => (
            <SentenceItem
              key={sentence.id}
              sentence={sentence}
              index={index}
              isSelected={sentence.id === selectedId}
              practiceMode={practiceMode}
              onClick={() => onSelectSentence(sentence.id)}
              onContextMenu={(e) => handleContextMenu(e, sentence.id)}
              onMenuClick={(e) => handleMenuClick(e, sentence.id)}
            />
          ))}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 py-1 min-w-32 rounded-lg shadow-xl border border-[var(--glass-border)]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: 'var(--bg-main)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleDelete(contextMenu.id)}
            className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-2"
            style={{ color: 'var(--text-main)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span className="text-red-400">Delete</span>
          </button>
        </div>
      )}

      {/* Footer with progress (Level 2 only) */}
      {!isSourcesView && (
        <div className="p-3 border-t border-[var(--glass-border)] text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
          {currentSentences.findIndex(s => s.id === selectedId) + 1} / {currentSentences.length}
        </div>
      )}

      {/* Action Button (Level 1 only) */}
      {isSourcesView && (
        <div className="p-4 border-t border-[var(--glass-border)] flex-shrink-0">
          <button
            onClick={onImport}
            className="w-full py-2 px-4 rounded-lg text-sm font-medium border border-[var(--glass-border)] hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center gap-2"
            style={{ color: 'var(--text-main)' }}
          >
            <span>+</span>
            <span>Import</span>
          </button>
        </div>
      )}
    </div>
  );
};
