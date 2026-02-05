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
}

const SentenceItem: React.FC<SentenceItemProps> = ({ sentence, index, isSelected, practiceMode, onClick }) => {
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
    <button
      onClick={onClick}
      className={`w-full text-left p-3 transition-all duration-150 border-l-3 ${
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
        <span className={`text-xs ${statusColor}`}>{statusIcon}</span>
      </div>
    </button>
  );
};

interface SentenceSidebarProps {
  sentences: SentencePair[];
  selectedId: string | null;
  practiceMode: PracticeMode;
  onSelectSentence: (id: string) => void;
  onAddSentence: () => void;
  onImportArticle: () => void;
}

type SidebarLevel =
  | { level: 'sources' }
  | { level: 'sentences'; sourceType: string };

export const SentenceSidebar: React.FC<SentenceSidebarProps> = ({
  sentences,
  selectedId,
  practiceMode,
  onSelectSentence,
  onAddSentence,
  onImportArticle
}) => {
  const [sidebarState, setSidebarState] = useState<SidebarLevel>({ level: 'sources' });

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

  const isSourcesView = sidebarState.level === 'sources';

  return (
    <div className="w-72 flex-shrink-0 border-r border-[var(--glass-border)] flex flex-col h-full overflow-hidden bg-[var(--surface-hover)]/20">
      {/* Header */}
      <div className="p-4 border-b border-[var(--glass-border)] flex-shrink-0">
        {isSourcesView ? (
          <h2 className="text-sm font-mono uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
            Sources
          </h2>
        ) : (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-main)' }}
          >
            <ArrowLeftIcon />
            <span className="truncate">{getSourceDisplayName(sidebarState.sourceType)}</span>
          </button>
        )}
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
          {currentSentences.map((sentence, index) => (
            <SentenceItem
              key={sentence.id}
              sentence={sentence}
              index={index}
              isSelected={sentence.id === selectedId}
              practiceMode={practiceMode}
              onClick={() => onSelectSentence(sentence.id)}
            />
          ))}
        </div>
      </div>

      {/* Footer with progress (Level 2 only) */}
      {!isSourcesView && (
        <div className="p-3 border-t border-[var(--glass-border)] text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
          {currentSentences.findIndex(s => s.id === selectedId) + 1} / {currentSentences.length}
        </div>
      )}

      {/* Action Buttons (Level 1 only) */}
      {isSourcesView && (
        <div className="p-4 border-t border-[var(--glass-border)] space-y-2 flex-shrink-0">
          <button
            onClick={onAddSentence}
            className="w-full py-2 px-4 rounded-lg text-sm font-medium border border-[var(--glass-border)] hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center gap-2"
            style={{ color: 'var(--text-main)' }}
          >
            <span>+</span>
            <span>Add Sentence</span>
          </button>
          <button
            onClick={onImportArticle}
            className="w-full py-2 px-4 rounded-lg text-sm font-medium border border-[var(--glass-border)] hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center gap-2"
            style={{ color: 'var(--text-main)' }}
          >
            <span>📥</span>
            <span>Import Article</span>
          </button>
        </div>
      )}
    </div>
  );
};
