import React, { useState, useRef, useCallback, useEffect } from 'react';
import { XMarkIcon } from '../Icons';
import {
  AlignmentPair,
  insertGapSimple,
  removeGap,
  mergeUp,
  splitAt,
  updateText,
  getAlignmentStats,
  cleanEmptyPairs,
} from '../../utils/alignmentHelpers';

interface AlignmentEditorProps {
  initialPairs: AlignmentPair[];
  onSave: (pairs: AlignmentPair[]) => void;
  onCancel: () => void;
  title?: string;
}

// Icons for alignment actions
const InsertGapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l-6-6m6 6l6-6" />
  </svg>
);

const MergeUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l7.5-7.5 7.5 7.5m-15 6l7.5-7.5 7.5 7.5" />
  </svg>
);

const SplitIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
  </svg>
);

interface SegmentRowProps {
  index: number;
  text: string;
  side: 'en' | 'zh';
  isGap: boolean;
  canMergeUp: boolean;
  onInsertGap: () => void;
  onRemoveGap: () => void;
  onMergeUp: () => void;
  onSplit: (charPos: number) => void;
  onTextChange: (newText: string) => void;
}

const SegmentRow: React.FC<SegmentRowProps> = ({
  index,
  text,
  side,
  isGap,
  canMergeUp,
  onInsertGap,
  onRemoveGap,
  onMergeUp,
  onSplit,
  onTextChange,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(text);
  const [showSplitHint, setShowSplitHint] = useState(false);

  useEffect(() => {
    setEditValue(text);
  }, [text]);

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== text) {
      onTextChange(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      // Ctrl+Enter to split at cursor
      const cursorPos = textareaRef.current?.selectionStart ?? 0;
      if (cursorPos > 0 && cursorPos < editValue.length) {
        onSplit(cursorPos);
      }
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setEditValue(text);
      setIsEditing(false);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editValue, isEditing]);

  return (
    <div
      className={`group relative flex items-stretch gap-1 ${
        isGap ? 'bg-amber-500/5' : ''
      }`}
    >
      {/* Row number */}
      <div
        className="w-8 flex-shrink-0 flex items-center justify-center text-xs font-mono"
        style={{ color: 'var(--text-secondary)' }}
      >
        {index + 1}
      </div>

      {/* Text area */}
      <div className="flex-1 min-w-0 relative">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSplitHint(true)}
            className="w-full px-3 py-2 rounded-lg text-sm resize-none transition-all outline-none"
            style={{
              backgroundColor: 'var(--surface-active)',
              border: '1px solid var(--text-main)',
              color: 'var(--text-main)',
              minHeight: '2.5rem',
            }}
            autoFocus
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className={`w-full px-3 py-2 rounded-lg text-sm cursor-text transition-all ${
              isGap
                ? 'border-2 border-dashed border-amber-500/30 min-h-[2.5rem] flex items-center justify-center'
                : 'border border-transparent hover:border-[var(--glass-border)]'
            }`}
            style={{
              backgroundColor: isGap ? 'transparent' : 'var(--surface-hover)',
              color: isGap ? 'var(--text-secondary)' : 'var(--text-main)',
              minHeight: '2.5rem',
            }}
          >
            {isGap ? (
              <span className="text-xs italic opacity-50">Empty (gap)</span>
            ) : (
              text || <span className="opacity-50">Click to edit...</span>
            )}
          </div>
        )}

        {/* Split hint */}
        {isEditing && showSplitHint && editValue.length > 0 && (
          <div
            className="absolute -bottom-5 left-0 text-xs opacity-60"
            style={{ color: 'var(--text-secondary)' }}
          >
            Ctrl+Enter to split at cursor
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {isGap ? (
          <button
            onClick={onRemoveGap}
            className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
            title="Remove gap"
          >
            <XMarkIcon />
          </button>
        ) : (
          <>
            <button
              onClick={onInsertGap}
              className="p-1.5 rounded hover:bg-[var(--surface-hover)] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              title="Insert gap below"
            >
              <InsertGapIcon />
            </button>
            {canMergeUp && (
              <button
                onClick={onMergeUp}
                className="p-1.5 rounded hover:bg-[var(--surface-hover)] transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                title="Merge with row above"
              >
                <MergeUpIcon />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const AlignmentEditor: React.FC<AlignmentEditorProps> = ({
  initialPairs,
  onSave,
  onCancel,
  title = 'Align Sentences',
}) => {
  const [pairs, setPairs] = useState<AlignmentPair[]>(initialPairs);
  const enScrollRef = useRef<HTMLDivElement>(null);
  const zhScrollRef = useRef<HTMLDivElement>(null);
  const [syncScroll, setSyncScroll] = useState(true);

  // Handle scroll sync
  const handleScroll = useCallback(
    (source: 'en' | 'zh') => {
      if (!syncScroll) return;

      const sourceRef = source === 'en' ? enScrollRef : zhScrollRef;
      const targetRef = source === 'en' ? zhScrollRef : enScrollRef;

      if (sourceRef.current && targetRef.current) {
        targetRef.current.scrollTop = sourceRef.current.scrollTop;
      }
    },
    [syncScroll]
  );

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  // Actions for EN side
  const handleEnInsertGap = (index: number) => {
    setPairs(insertGapSimple(pairs, index + 1, 'en'));
  };

  const handleEnRemoveGap = (index: number) => {
    setPairs(removeGap(pairs, index, 'en'));
  };

  const handleEnMergeUp = (index: number) => {
    setPairs(mergeUp(pairs, index, 'en'));
  };

  const handleEnSplit = (index: number, charPos: number) => {
    setPairs(splitAt(pairs, index, 'en', charPos));
  };

  const handleEnTextChange = (index: number, newText: string) => {
    setPairs(updateText(pairs, index, 'en', newText));
  };

  // Actions for ZH side
  const handleZhInsertGap = (index: number) => {
    setPairs(insertGapSimple(pairs, index + 1, 'zh'));
  };

  const handleZhRemoveGap = (index: number) => {
    setPairs(removeGap(pairs, index, 'zh'));
  };

  const handleZhMergeUp = (index: number) => {
    setPairs(mergeUp(pairs, index, 'zh'));
  };

  const handleZhSplit = (index: number, charPos: number) => {
    setPairs(splitAt(pairs, index, 'zh', charPos));
  };

  const handleZhTextChange = (index: number, newText: string) => {
    setPairs(updateText(pairs, index, 'zh', newText));
  };

  const handleSave = () => {
    // Clean up and save
    const cleaned = cleanEmptyPairs(pairs);
    onSave(cleaned);
  };

  const stats = getAlignmentStats(pairs);
  const isValid = stats.complete > 0 && stats.enOnly === 0 && stats.zhOnly === 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={onCancel}
      />
      <div
        className="relative w-full max-w-6xl h-[85vh] glass-panel rounded-2xl shadow-2xl animate-[float_0.3s_ease-out] overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-main)' }}
      >
        {/* Header */}
        <div className="h-14 border-b border-[var(--glass-border)] flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-medium" style={{ color: 'var(--text-main)' }}>
              {title}
            </h3>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span>{stats.total} rows</span>
              <span>•</span>
              <span className="text-emerald-400">{stats.complete} complete</span>
              {stats.enOnly > 0 && (
                <>
                  <span>•</span>
                  <span className="text-amber-400">{stats.enOnly} EN only</span>
                </>
              )}
              {stats.zhOnly > 0 && (
                <>
                  <span>•</span>
                  <span className="text-amber-400">{stats.zhOnly} ZH only</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={syncScroll}
                onChange={(e) => setSyncScroll(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-500"
              />
              Sync scroll
            </label>
            <button
              onClick={onCancel}
              className="p-2 rounded-full hover:bg-[var(--surface-hover)] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <XMarkIcon />
            </button>
          </div>
        </div>

        {/* Column Headers */}
        <div className="flex border-b border-[var(--glass-border)] flex-shrink-0">
          <div className="flex-1 px-6 py-3 flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
              English
            </span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {pairs.filter((p) => p.en.trim() !== '').length} sentences
            </span>
          </div>
          <div className="w-px bg-[var(--glass-border)]" />
          <div className="flex-1 px-6 py-3 flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
              中文
            </span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {pairs.filter((p) => p.zh.trim() !== '').length} sentences
            </span>
          </div>
        </div>

        {/* Dual Column Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* English Column */}
          <div
            ref={enScrollRef}
            onScroll={() => handleScroll('en')}
            className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2"
          >
            {pairs.map((pair, index) => (
              <SegmentRow
                key={`en-${index}`}
                index={index}
                text={pair.en}
                side="en"
                isGap={pair.en.trim() === ''}
                canMergeUp={index > 0}
                onInsertGap={() => handleEnInsertGap(index)}
                onRemoveGap={() => handleEnRemoveGap(index)}
                onMergeUp={() => handleEnMergeUp(index)}
                onSplit={(charPos) => handleEnSplit(index, charPos)}
                onTextChange={(newText) => handleEnTextChange(index, newText)}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="w-px bg-[var(--glass-border)] flex-shrink-0" />

          {/* Chinese Column */}
          <div
            ref={zhScrollRef}
            onScroll={() => handleScroll('zh')}
            className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2"
          >
            {pairs.map((pair, index) => (
              <SegmentRow
                key={`zh-${index}`}
                index={index}
                text={pair.zh}
                side="zh"
                isGap={pair.zh.trim() === ''}
                canMergeUp={index > 0}
                onInsertGap={() => handleZhInsertGap(index)}
                onRemoveGap={() => handleZhRemoveGap(index)}
                onMergeUp={() => handleZhMergeUp(index)}
                onSplit={(charPos) => handleZhSplit(index, charPos)}
                onTextChange={(newText) => handleZhTextChange(index, newText)}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--glass-border)] flex items-center justify-between bg-[var(--surface-hover)]/10 flex-shrink-0">
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isValid ? (
              <span className="text-emerald-400">
                Ready to import {stats.complete} sentence pairs
              </span>
            ) : stats.enOnly > 0 || stats.zhOnly > 0 ? (
              <span className="text-amber-400">
                {stats.enOnly + stats.zhOnly} unaligned rows - insert gaps to align
              </span>
            ) : (
              <span>No valid pairs to import</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--text-main)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={stats.complete === 0}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all shadow-lg ${
                stats.complete > 0
                  ? 'hover:shadow-xl transform hover:-translate-y-0.5'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              style={{
                backgroundColor: stats.complete > 0 ? 'var(--text-main)' : 'var(--surface-hover)',
                color: stats.complete > 0 ? 'var(--bg-main)' : 'var(--text-secondary)',
              }}
            >
              Import {stats.complete} Pairs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
