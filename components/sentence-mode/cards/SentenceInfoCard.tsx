import React, { useState } from 'react';
import { SentencePair, PracticeMode, TagInfo } from '../../../types';
import { SpeakerIcon, PencilIcon } from '../../Icons';
import { playTextToSpeech } from '../../../services/geminiService';
import { TextEditModal } from '../TextEditModal';
import { TagChip } from '../TagChip';

interface SentenceInfoCardProps {
  sentence: SentencePair;
  practiceMode: PracticeMode;
  allSentences: SentencePair[];
  onStartPractice: () => void;
  onShowParagraphContext: () => void;
  onShowArticleContext: () => void;
  onModeToggle: () => void;
  onUpdateSentence?: (id: string, updates: Partial<SentencePair>) => void;
  hideReferenceInDetailView?: boolean;
  // Tag system props
  allTags?: TagInfo[];
  onToggleTag?: (tagId: string) => void;
  onOpenTagPicker?: () => void;
}

/**
 * SentenceInfoCard - 句子详情卡片
 *
 * 显示句子的源文本和参考译文，支持编辑和 TTS 朗读。
 * 从原 SentenceDetailView 抽取的核心内容卡片。
 */
export const SentenceInfoCard: React.FC<SentenceInfoCardProps> = ({
  sentence,
  practiceMode,
  allSentences,
  onStartPractice,
  onShowParagraphContext,
  onShowArticleContext,
  onModeToggle,
  onUpdateSentence,
  hideReferenceInDetailView = true,
  allTags = [],
  onToggleTag,
  onOpenTagPicker,
}) => {
  // State to temporarily reveal the hidden reference
  const [isReferenceRevealed, setIsReferenceRevealed] = useState(false);

  // State for edit modal
  const [editingField, setEditingField] = useState<'en' | 'zh' | null>(null);

  // Determine which text is the "reference" (the answer) based on practice mode
  const isEnToZh = practiceMode === 'EN_TO_ZH';
  const sourceText = isEnToZh ? sentence.en : sentence.zh;
  const referenceText = isEnToZh ? sentence.zh : sentence.en;
  const sourceLabel = isEnToZh ? 'EN' : 'ZH';
  const referenceLabel = isEnToZh ? 'ZH' : 'EN';
  const sourceField = isEnToZh ? 'en' : 'zh';
  const referenceField = isEnToZh ? 'zh' : 'en';

  // Handle saving edited text
  const handleSaveEdit = (newValue: string) => {
    if (editingField && onUpdateSentence) {
      onUpdateSentence(sentence.id, { [editingField]: newValue });
    }
    setEditingField(null);
  };

  // Get context counts for navigation buttons
  const paragraphSentences = sentence.paragraphId
    ? allSentences.filter(s => s.paragraphId === sentence.paragraphId)
    : [];
  const articleSentences = sentence.articleId
    ? allSentences.filter(s => s.articleId === sentence.articleId)
    : [];

  const hasParagraphContext = paragraphSentences.length > 1;
  const hasArticleContext = articleSentences.length > 1;
  const showContextNav = sentence.sourceType !== 'sentence' && (hasParagraphContext || hasArticleContext);

  // Get translation status
  const translation = practiceMode === 'EN_TO_ZH' ? sentence.userTranslationZh : sentence.userTranslationEn;
  const hasPracticed = translation && translation.type !== 'draft';

  return (
    <div className="flex-1 flex flex-col p-8 overflow-hidden">
      {/* Main Content - Centered */}
      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
        {/* Sentence Content Card */}
        <div className="glass-panel rounded-2xl p-8">
          {/* Header Row: Mode Toggle + Tags + Practiced Badge */}
          <div className="flex items-center justify-between mb-6">
            {/* Left: Mode Toggle */}
            <button
              onClick={onModeToggle}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:opacity-80 flex-shrink-0"
              style={{
                backgroundColor: 'var(--surface-hover)',
                color: 'var(--text-main)',
                border: '1px solid var(--glass-border)'
              }}
            >
              {practiceMode === 'EN_TO_ZH' ? 'EN → 中' : '中 → EN'}
            </button>

            {/* Center: Tags */}
            <div className="flex flex-wrap items-center justify-center gap-2 mx-4 min-w-0 flex-1">
              {sentence.tags && sentence.tags.length > 0 ? (
                sentence.tags.map((tagId) => {
                  const tagInfo = allTags.find(t => t.id === tagId);
                  return (
                    <TagChip
                      key={tagId}
                      tag={tagInfo || tagId}
                      size="sm"
                      showLabel
                      onRemove={onToggleTag ? () => onToggleTag(tagId) : undefined}
                    />
                  );
                })
              ) : (
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  No tags
                </span>
              )}
              {onOpenTagPicker && (
                <button
                  onClick={onOpenTagPicker}
                  className="px-2 py-1 text-xs rounded-lg border border-dashed border-[var(--glass-border)] hover:bg-[var(--surface-hover)] transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Add or manage tags"
                >
                  + Tag
                </button>
              )}
            </div>

            {/* Right: Practiced Badge */}
            <div className="flex-shrink-0">
              {hasPracticed && (
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                  Practiced
                </span>
              )}
            </div>
          </div>

          {/* Source Text */}
          <div className="mb-6 group/source">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-mono uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                {sourceLabel}
              </span>
              <button
                onClick={() => playTextToSpeech(sourceText)}
                className="p-1 hover:opacity-80 transition-opacity"
                style={{ color: 'var(--text-secondary)' }}
                title="Read Aloud"
              >
                <SpeakerIcon />
              </button>
            </div>
            <div className="relative">
              <p className="text-xl leading-relaxed font-serif-sc pr-16" style={{ color: 'var(--text-main)' }}>
                {sourceText}
              </p>
              {onUpdateSentence && (
                <button
                  onClick={() => setEditingField(sourceField as 'en' | 'zh')}
                  className="absolute top-0 right-0 p-2 rounded-lg opacity-0 group-hover/source:opacity-100 transition-opacity hover:bg-[var(--surface-hover)] cursor-pointer"
                  style={{ color: 'var(--text-secondary)' }}
                  title={`Edit ${sourceLabel} text`}
                >
                  <PencilIcon />
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[var(--glass-border)] my-6" />

          {/* Reference Text */}
          <div className="mb-8 group/reference">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-mono uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                {referenceLabel}
              </span>
              {(!hideReferenceInDetailView || isReferenceRevealed) && (
                <button
                  onClick={() => playTextToSpeech(referenceText)}
                  className="p-1 hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Read Aloud"
                >
                  <SpeakerIcon />
                </button>
              )}
            </div>
            {hideReferenceInDetailView && !isReferenceRevealed ? (
              <button
                onClick={() => setIsReferenceRevealed(true)}
                className="w-full py-4 rounded-lg border border-dashed border-[var(--glass-border)] hover:bg-[var(--surface-hover)] transition-colors text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                Tap to reveal reference
              </button>
            ) : (
              <div className="relative">
                <p className="text-xl leading-relaxed font-serif-sc pr-16" style={{ color: 'var(--text-main)' }}>
                  {referenceText}
                </p>
                {onUpdateSentence && (
                  <button
                    onClick={() => setEditingField(referenceField as 'en' | 'zh')}
                    className="absolute top-0 right-0 p-2 rounded-lg opacity-0 group-hover/reference:opacity-100 transition-opacity hover:bg-[var(--surface-hover)] cursor-pointer"
                    style={{ color: 'var(--text-secondary)' }}
                    title={`Edit ${referenceLabel} text`}
                  >
                    <PencilIcon />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Start Practice Button - Inside the card */}
          <button
            onClick={onStartPractice}
            className="w-full py-4 rounded-xl text-base font-medium transition-all duration-200 hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: 'var(--text-main)',
              color: 'var(--bg-main)',
            }}
          >
            Start Practice
          </button>
        </div>

        {/* Context Navigation - Compact inline links */}
        {showContextNav && (
          <div className="flex items-center justify-center gap-4 mt-6">
            {hasParagraphContext && (
              <button
                onClick={onShowParagraphContext}
                className="text-sm hover:underline transition-colors cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                View Paragraph ({paragraphSentences.length})
              </button>
            )}
            {hasParagraphContext && hasArticleContext && (
              <span style={{ color: 'var(--text-secondary)' }}>·</span>
            )}
            {hasArticleContext && (
              <button
                onClick={onShowArticleContext}
                className="text-sm hover:underline transition-colors cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                View Article ({articleSentences.length})
              </button>
            )}
          </div>
        )}

        {/* NOTE: Stats section removed - now in dedicated StatsCard */}
      </div>

      {/* Edit Modal */}
      {editingField && (
        <TextEditModal
          title={`Edit ${editingField === 'en' ? 'English' : 'Chinese'} Text`}
          label={editingField === 'en' ? 'English' : '中文'}
          initialValue={editingField === 'en' ? sentence.en : sentence.zh}
          onSave={handleSaveEdit}
          onCancel={() => setEditingField(null)}
        />
      )}
    </div>
  );
};
