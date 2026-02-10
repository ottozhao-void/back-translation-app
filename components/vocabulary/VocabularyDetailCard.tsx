import React, { useState } from 'react';
import { VocabularyItem } from '../../types';
import { VOCABULARY_TYPE_COLORS } from './constants';

interface VocabularyDetailCardProps {
  item: VocabularyItem;
  onUpdate: (id: string, updates: Partial<VocabularyItem>) => void;
  onDelete: (id: string) => void;
  onNavigateToSentence: (sentenceId: string) => void;
  onEnrichPending?: (id: string) => void;
}

/**
 * VocabularyDetailCard - Detailed view of a vocabulary item
 */
export const VocabularyDetailCard: React.FC<VocabularyDetailCardProps> = ({
  item,
  onUpdate,
  onDelete,
  onNavigateToSentence,
  onEnrichPending,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDefinition, setEditedDefinition] = useState(item.definition);
  const [editedDefinitionZh, setEditedDefinitionZh] = useState(item.definitionZh || '');
  const [editedNote, setEditedNote] = useState(item.note || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const typeColor = VOCABULARY_TYPE_COLORS[item.type];
  const isPending = item.status === 'pending';

  const handleSave = () => {
    onUpdate(item.id, {
      definition: editedDefinition,
      definitionZh: editedDefinitionZh || undefined,
      note: editedNote || undefined,
      status: editedDefinition ? 'manual' : item.status,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedDefinition(item.definition);
    setEditedDefinitionZh(item.definitionZh || '');
    setEditedNote(item.note || '');
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(item.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-auto">
      <div className="max-w-2xl mx-auto w-full">
        {/* Main Card */}
        <div className="glass-panel rounded-2xl p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h2
                className="text-2xl font-medium mb-2"
                style={{ color: 'var(--text-main)' }}
              >
                {item.text}
              </h2>
              {item.patternTemplate && (
                <p
                  className="text-sm font-mono"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {item.patternTemplate}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Status indicator */}
              {isPending && (
                <span className="text-xs px-2 py-1 rounded-full bg-slate-500/20 text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
                  Pending
                </span>
              )}
              {/* Type badge */}
              <span
                className="text-xs px-2.5 py-1 rounded-md font-medium uppercase tracking-wide"
                style={{
                  backgroundColor: typeColor.bg,
                  color: typeColor.text,
                }}
              >
                {item.type}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[var(--glass-border)] my-6" />

          {/* Definition Section */}
          {isEditing ? (
            <div className="space-y-4 mb-6">
              <div>
                <label
                  className="block text-xs font-mono uppercase tracking-wider mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Definition (EN)
                </label>
                <textarea
                  value={editedDefinition}
                  onChange={(e) => setEditedDefinition(e.target.value)}
                  className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-transparent resize-none focus:outline-none focus:border-[var(--text-secondary)]"
                  style={{ color: 'var(--text-main)' }}
                  rows={3}
                  placeholder="Enter definition..."
                />
              </div>
              <div>
                <label
                  className="block text-xs font-mono uppercase tracking-wider mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Definition (中文)
                </label>
                <textarea
                  value={editedDefinitionZh}
                  onChange={(e) => setEditedDefinitionZh(e.target.value)}
                  className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-transparent resize-none focus:outline-none focus:border-[var(--text-secondary)]"
                  style={{ color: 'var(--text-main)' }}
                  rows={2}
                  placeholder="输入中文解释..."
                />
              </div>
              <div>
                <label
                  className="block text-xs font-mono uppercase tracking-wider mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Notes
                </label>
                <textarea
                  value={editedNote}
                  onChange={(e) => setEditedNote(e.target.value)}
                  className="w-full p-3 rounded-lg border border-[var(--glass-border)] bg-transparent resize-none focus:outline-none focus:border-[var(--text-secondary)]"
                  style={{ color: 'var(--text-main)' }}
                  rows={2}
                  placeholder="Personal notes..."
                />
              </div>
            </div>
          ) : (
            <div className="mb-6">
              {item.definition ? (
                <>
                  <p
                    className="text-base leading-relaxed mb-2"
                    style={{ color: 'var(--text-main)' }}
                  >
                    {item.definition}
                  </p>
                  {item.definitionZh && (
                    <p
                      className="text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {item.definitionZh}
                    </p>
                  )}
                </>
              ) : (
                <p
                  className="text-sm italic"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {isPending
                    ? 'Waiting for AI to generate definition...'
                    : 'No definition yet. Click Edit to add one.'}
                </p>
              )}
            </div>
          )}

          {/* Examples Section */}
          {item.examples.length > 0 && !isEditing && (
            <div className="mb-6">
              <h3
                className="text-xs font-mono uppercase tracking-wider mb-3"
                style={{ color: 'var(--text-secondary)' }}
              >
                Examples
              </h3>
              <div className="space-y-3">
                {item.examples.map((example, idx) => (
                  <div
                    key={idx}
                    className="pl-4 border-l-2"
                    style={{ borderColor: 'var(--glass-border)' }}
                  >
                    <p
                      className="text-sm italic mb-1"
                      style={{ color: 'var(--text-main)' }}
                    >
                      {example.en}
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {example.zh}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pattern Explanation */}
          {item.patternExplanation && !isEditing && (
            <div className="mb-6">
              <h3
                className="text-xs font-mono uppercase tracking-wider mb-3"
                style={{ color: 'var(--text-secondary)' }}
              >
                Usage
              </h3>
              <p
                className="text-sm"
                style={{ color: 'var(--text-main)' }}
              >
                {item.patternExplanation}
              </p>
            </div>
          )}

          {/* Personal Note */}
          {item.note && !isEditing && (
            <div className="mb-6">
              <h3
                className="text-xs font-mono uppercase tracking-wider mb-3"
                style={{ color: 'var(--text-secondary)' }}
              >
                Notes
              </h3>
              <p
                className="text-sm"
                style={{ color: 'var(--text-main)' }}
              >
                {item.note}
              </p>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-[var(--glass-border)] my-6" />

          {/* Source Sentences */}
          {item.sources.length > 0 && (
            <div className="mb-6">
              <h3
                className="text-xs font-mono uppercase tracking-wider mb-3 flex items-center gap-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Source Sentences
                <span
                  className="px-1.5 py-0.5 rounded-full text-xs"
                  style={{ backgroundColor: 'var(--surface-active)' }}
                >
                  {item.sources.length}
                </span>
              </h3>
              <div className="space-y-2">
                {item.sources.map((source) => (
                  <button
                    key={source.sentenceId}
                    onClick={() => onNavigateToSentence(source.sentenceId)}
                    className="w-full text-left p-3 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <p
                      className="text-sm line-clamp-2"
                      style={{ color: 'var(--text-main)' }}
                    >
                      {source.en}
                    </p>
                    <p
                      className="text-xs mt-1 line-clamp-1"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {source.zh}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--text-main)',
                    color: 'var(--bg-main)',
                  }}
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--glass-border)] hover:bg-[var(--surface-hover)] transition-colors"
                  style={{ color: 'var(--text-main)' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--glass-border)] hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-2"
                  style={{ color: 'var(--text-main)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit
                </button>
                {isPending && onEnrichPending && (
                  <button
                    onClick={() => onEnrichPending(item.id)}
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--glass-border)] hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-2"
                    style={{ color: 'var(--text-main)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 4v6h-6" />
                      <path d="M1 20v-6h6" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                    Retry AI
                  </button>
                )}
              </div>
            )}

            {!isEditing && (
              showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Delete?
                  </span>
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border border-[var(--glass-border)] hover:bg-[var(--surface-hover)] transition-colors"
                    style={{ color: 'var(--text-main)' }}
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete
                </button>
              )
            )}
          </div>
        </div>

        {/* Metadata Footer */}
        <div
          className="mt-4 text-center text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          Added {new Date(item.createdAt).toLocaleDateString()} · Updated {new Date(item.updatedAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};
