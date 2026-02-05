import React, { useState, useEffect, useRef } from 'react';
import { SentencePair, PracticeMode, UserTranslation, AppSettings } from '../../types';
import { SpeakerIcon } from '../Icons';
import { playTextToSpeech } from '../../services/geminiService';

interface SentencePracticeAreaProps {
  sentence: SentencePair | null;
  practiceMode: PracticeMode;
  onModeToggle: () => void;
  onSubmit: (sentenceId: string, translation: UserTranslation) => void;
  appSettings: AppSettings;
}

export const SentencePracticeArea: React.FC<SentencePracticeAreaProps> = ({
  sentence,
  practiceMode,
  onModeToggle,
  onSubmit,
  appSettings
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastSavedText = useRef('');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get source and target text based on mode
  const sourceText = sentence ? (practiceMode === 'EN_TO_ZH' ? sentence.en : sentence.zh) : '';
  const referenceText = sentence ? (practiceMode === 'EN_TO_ZH' ? sentence.zh : sentence.en) : '';

  // Get existing translation
  const existingTranslation = sentence
    ? (practiceMode === 'EN_TO_ZH' ? sentence.userTranslationZh : sentence.userTranslationEn)
    : undefined;

  // Reset state when sentence changes
  useEffect(() => {
    if (!sentence) {
      setInputValue('');
      setIsSubmitted(false);
      lastSavedText.current = '';
      return;
    }

    if (existingTranslation) {
      setInputValue(existingTranslation.text);
      lastSavedText.current = existingTranslation.text;
      setIsSubmitted(existingTranslation.type !== 'draft');
    } else {
      setInputValue('');
      lastSavedText.current = '';
      setIsSubmitted(false);
    }
    setSaveStatus('saved');

    // Focus input after animation
    setTimeout(() => {
      if (!existingTranslation || existingTranslation.type === 'draft') {
        inputRef.current?.focus();
      }
    }, 300);
  }, [sentence?.id, practiceMode]);

  // Auto-save logic
  useEffect(() => {
    if (!sentence || isSubmitted || !appSettings.autoSave.enabled) return;

    if (inputValue !== lastSavedText.current) {
      setSaveStatus('unsaved');

      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

      autoSaveTimerRef.current = setTimeout(() => {
        if (inputValue.trim()) {
          setSaveStatus('saving');
          onSubmit(sentence.id, {
            type: 'draft',
            text: inputValue,
            timestamp: Date.now()
          });
          lastSavedText.current = inputValue;
          setTimeout(() => setSaveStatus('saved'), 500);
        }
      }, appSettings.autoSave.delay);
    } else {
      setSaveStatus('saved');
    }

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [inputValue, isSubmitted, sentence?.id, appSettings.autoSave]);

  const handleSubmit = () => {
    if (!sentence || !inputValue.trim()) return;

    setIsSubmitted(true);
    onSubmit(sentence.id, {
      type: 'diff', // Simple mode - no LLM scoring
      text: inputValue,
      timestamp: Date.now()
    });
    lastSavedText.current = inputValue;
  };

  const handleEdit = () => {
    setIsSubmitted(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (!isSubmitted) {
        handleSubmit();
      }
    }
  };

  // Empty state
  if (!sentence) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center" style={{ color: 'var(--text-secondary)' }}>
          <div className="text-4xl mb-4">📚</div>
          <p className="text-lg">Select a sentence to start practicing</p>
          <p className="text-sm mt-2">Or add new content from the sidebar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-8 overflow-hidden">
      {/* Mode Toggle */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onModeToggle}
            className="px-4 py-2 rounded-full text-sm font-medium border border-[var(--glass-border)] hover:bg-[var(--surface-hover)] transition-colors"
            style={{ color: 'var(--text-main)' }}
          >
            {practiceMode === 'EN_TO_ZH' ? 'EN → 中' : '中 → EN'}
          </button>
        </div>
        {isSubmitted && (
          <button
            onClick={handleEdit}
            className="text-sm hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-secondary)' }}
          >
            Edit
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Original Text Card */}
        <div className="flex-1 glass-panel rounded-2xl p-6 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
              Original
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
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <p
              className={`text-xl leading-relaxed font-serif-sc ${practiceMode === 'ZH_TO_EN' ? 'font-medium' : 'font-light'}`}
              style={{ color: 'var(--text-main)' }}
            >
              {sourceText}
            </p>
          </div>
        </div>

        {/* Translation/Result Card */}
        <div className="flex-1 glass-panel input-glow rounded-2xl p-6 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
              {isSubmitted ? 'Your Translation' : 'Translate'}
            </span>
            {!isSubmitted && appSettings.autoSave.enabled && (
              <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'unsaved' ? 'Unsaved' : 'Saved'}
              </span>
            )}
          </div>

          {!isSubmitted ? (
            <>
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 w-full bg-transparent resize-none outline-none text-lg leading-relaxed font-serif-sc custom-scrollbar"
                style={{ color: 'var(--text-main)' }}
                placeholder={practiceMode === 'EN_TO_ZH' ? '在此输入中文翻译...' : 'Type your translation here...'}
                spellCheck={false}
              />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={!inputValue.trim()}
                  className={`px-6 py-2 rounded-lg text-sm font-medium transition-all border border-[var(--border-high-contrast)] ${
                    inputValue.trim()
                      ? 'hover:shadow-lg hover:-translate-y-0.5'
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                  style={{
                    backgroundColor: inputValue.trim() ? 'var(--text-main)' : 'transparent',
                    color: inputValue.trim() ? 'var(--bg-main)' : 'var(--text-secondary)'
                  }}
                >
                  Check <span className="text-xs ml-1 opacity-60">⌘↵</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <p className="text-lg leading-relaxed font-serif-sc" style={{ color: 'var(--text-main)' }}>
                {inputValue}
              </p>
            </div>
          )}
        </div>

        {/* Reference Card (shown after submit) */}
        {isSubmitted && (
          <div className="flex-1 glass-panel rounded-2xl p-6 flex flex-col border-2 border-emerald-500/30">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
                Reference
              </span>
              <button
                onClick={() => playTextToSpeech(referenceText)}
                className="p-1 hover:opacity-80 transition-opacity"
                style={{ color: 'var(--text-secondary)' }}
                title="Read Aloud"
              >
                <SpeakerIcon />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <p
                className={`text-lg leading-relaxed font-serif-sc ${practiceMode === 'EN_TO_ZH' ? 'font-medium' : 'font-light'}`}
                style={{ color: 'var(--text-main)' }}
              >
                {referenceText}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
