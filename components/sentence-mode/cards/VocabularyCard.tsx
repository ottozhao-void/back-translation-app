import React from 'react';

// SVG Icons (replacing emojis per UI/UX guidelines)
const BookIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

// Feature icons for planned features section
const SelectIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5z" />
    <path d="M9 12h6" />
  </svg>
);

const TranslateIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2v3" />
    <path d="M22 22l-5-10-5 10M14 18h6" />
  </svg>
);

const StarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

interface VocabularyCardProps {
  sentenceId: string;
  // TODO: Add vocabulary-related props when implementing
  // words?: VocabularyWord[];
  // onAddWord?: (word: string) => void;
  // onRemoveWord?: (wordId: string) => void;
}

/**
 * VocabularyCard - 单词卡片 (占位组件)
 *
 * 显示用户在该句子中标记的重点单词。
 *
 * TODO (待实现):
 * 1. 数据结构设计
 *    - 定义 VocabularyWord 接口 (word, translation, notes, familiarity)
 *    - 在 SentencePair 中添加 words?: VocabularyWord[] 字段
 *    - 或建立独立的单词库并通过 sentenceId 关联
 *
 * 2. 交互设计
 *    - 从句子文本中选中单词后添加
 *    - 单词列表展示 (可折叠/展开)
 *    - 单词编辑 (释义、笔记、熟练度)
 *    - 单词删除 (带确认)
 *
 * 3. UI/UX 设计
 *    - 单词卡片样式 (与 StatsCard 一致的 glass-panel 风格)
 *    - 空状态设计
 *    - 单词标签样式 (不同熟练度不同颜色)
 */
export const VocabularyCard: React.FC<VocabularyCardProps> = ({ sentenceId: _sentenceId }) => {
  return (
    <div className="flex-1 flex flex-col p-8 overflow-hidden">
      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
        <div className="glass-panel rounded-2xl p-8">
          {/* Header */}
          <div className="mb-6">
            <h3 className="text-lg font-medium" style={{ color: 'var(--text-main)' }}>
              Vocabulary
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Words you've marked from this sentence
            </p>
          </div>

          {/* Placeholder Content with SVG icon */}
          <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
            <div className="flex justify-center mb-4">
              <BookIcon />
            </div>
            <p className="text-base">Coming Soon</p>
            <p className="text-sm mt-2">
              Mark important words while practicing to build your vocabulary
            </p>
          </div>

          {/* Feature Preview - What's planned */}
          <div className="mt-8 pt-6 border-t border-[var(--glass-border)]">
            <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
              Planned Features
            </p>
            <ul className="text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex items-center gap-2">
                <span className="text-blue-400"><SelectIcon /></span>
                Select words from sentences to save
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400"><TranslateIcon /></span>
                Add translations and notes
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-400"><StarIcon /></span>
                Track familiarity levels
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
