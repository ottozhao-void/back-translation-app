import React, { useState, useEffect, useRef } from 'react';
import { Article, PracticeMode, UserTranslation, FeedbackMode, AppSettings } from '../types';
import { AVAILABLE_COMMANDS } from '../constants';
import { ArrowLeftIcon, ArrowRightIcon, SpeakerIcon, ParticleBackground } from '../components/Icons';
import { Toast } from '../components/Toast';
import { SentenceCompareModal } from '../components/SentenceCompareModal';
import { playTextToSpeech } from '../services/geminiService';

// --- Helper: Hotkey Matcher ---
const matchesHotkey = (e: React.KeyboardEvent, hotkeyDef: string) => {
    if (!hotkeyDef) return false;
    const parts = hotkeyDef.split('+');
    const modifiers = {
        ctrl: parts.includes('Ctrl'),
        alt: parts.includes('Alt'),
        meta: parts.includes('Meta'),
        shift: parts.includes('Shift')
    };

    if (e.ctrlKey !== modifiers.ctrl) return false;
    if (e.altKey !== modifiers.alt) return false;
    if (e.metaKey !== modifiers.meta) return false;
    if (e.shiftKey !== modifiers.shift) return false;

    const keyPart = parts.find(p => !['Ctrl', 'Alt', 'Meta', 'Shift'].includes(p));
    if (!keyPart) return false;

    if (keyPart === 'Space') return e.key === ' ';
    if (keyPart.length === 1) return e.key.toUpperCase() === keyPart.toUpperCase();
    return e.key === keyPart;
};

interface PracticeSessionProps {
    article: Article;
    mode: PracticeMode;
    onUpdateProgress: (aId: string, pId: string, val: UserTranslation) => void;
    onAddReference: (aId: string, pId: string, text: string, targetLang: 'en' | 'zh') => void;
    onBack: () => void;
    appSettings: AppSettings;
}

export const PracticeSession: React.FC<PracticeSessionProps> = ({ article, mode, onUpdateProgress, onAddReference, onBack, appSettings }) => {
    const [currentIndex, setCurrentIndex] = useState(() => {
        // Auto-jump to first unfinished
        const idx = article.content.findIndex(p => {
            const t = mode === 'EN_TO_ZH' ? p.userTranslationZh : p.userTranslationEn;
            return !t || t.type === 'draft';
        });
        return idx !== -1 ? idx : 0;
    });
    const [inputValue, setInputValue] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [animDirection, setAnimDirection] = useState(0); // -1 left, 1 right

    const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>('diff');
    const [score, setScore] = useState<string>('');
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [showCompareModal, setShowCompareModal] = useState(false);

    const currentParagraph = article.content[currentIndex];
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastSavedText = useRef('');
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize input if saved
    useEffect(() => {
        // Reset state for new card
        const savedTranslation = mode === 'EN_TO_ZH'
            ? currentParagraph.userTranslationZh
            : currentParagraph.userTranslationEn;

        if (savedTranslation) {
            setInputValue(savedTranslation.text);
            lastSavedText.current = savedTranslation.text;

            if (savedTranslation.type === 'draft') {
                setIsSubmitted(false);
                setFeedbackMode('diff');
                setScore('');
                setSaveStatus('saved');
            } else {
                setFeedbackMode(savedTranslation.type);
                setScore(savedTranslation.score ? savedTranslation.score.toString() : '');
                setIsSubmitted(true);
            }
        } else {
            setInputValue('');
            lastSavedText.current = '';
            setFeedbackMode('diff'); // Default
            setScore('');
            setIsSubmitted(false);
            setSaveStatus('saved');
        }
        setShowHint(false);
        setShowCompareModal(false);

        // Focus management on card change
        setTimeout(() => {
            if (savedTranslation && savedTranslation.type !== 'draft') {
                // If loaded as submitted, focus container for nav shortcuts
                containerRef.current?.focus();
            } else {
                // If edit mode, focus input
                inputRef.current?.focus();
            }
        }, 500); // Wait for animation
    }, [currentIndex, currentParagraph.id, mode]);

    const handleAutoSave = () => {
        if (!inputValue.trim() || inputValue === lastSavedText.current) return;

        setSaveStatus('saving');
        onUpdateProgress(article.id, currentParagraph.id, {
            type: 'draft',
            text: inputValue,
            timestamp: Date.now()
        });
        lastSavedText.current = inputValue;
        setTimeout(() => setSaveStatus('saved'), 500);
    };

    // Auto-save logic
    useEffect(() => {
        if (isSubmitted || !appSettings.autoSave.enabled) return;

        if (inputValue !== lastSavedText.current) {
            setSaveStatus('unsaved');

            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

            autoSaveTimerRef.current = setTimeout(() => {
                handleAutoSave();
            }, appSettings.autoSave.delay);
        } else {
            setSaveStatus('saved');
        }

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [inputValue, isSubmitted, appSettings.autoSave]);

    // Focus container when submitting to ensure shortcuts work
    useEffect(() => {
        if (isSubmitted) {
            containerRef.current?.focus();
        }
    }, [isSubmitted]);

    const handleNext = () => {
        if (currentIndex < article.content.length - 1) {
            setAnimDirection(1);
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setAnimDirection(0);
            }, 300); // Wait for exit anim
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setAnimDirection(-1);
            setTimeout(() => {
                setCurrentIndex(prev => prev - 1);
                setAnimDirection(0);
            }, 300);
        }
    };

    const handleSubmit = () => {
        if (!inputValue.trim()) return;

        let finalScore: number | undefined;
        if (feedbackMode === 'llm') {
            const s = parseInt(score);
            if (isNaN(s) || s < 1 || s > 100) {
                alert("Please enter a valid score between 1 and 100.");
                return;
            }
            finalScore = s;
        }

        setIsSubmitted(true);

        // Always save the user translation for both modes
        onUpdateProgress(article.id, currentParagraph.id, {
            type: feedbackMode,
            text: inputValue,
            timestamp: Date.now(),
            score: finalScore
        });

        // Additionally show modal for diff mode
        if (feedbackMode === 'diff') {
            setShowCompareModal(true);
        }
    };

    const handleCopyPrompt = () => {
        const sourceText = mode === 'EN_TO_ZH' ? currentParagraph.en[0] : currentParagraph.zh[0];
        const targetText = mode === 'EN_TO_ZH' ? currentParagraph.zh[0] : currentParagraph.en[0];

        const prompt = `
      # Original Text

      ${sourceText}

      # Original Translation

      ${targetText}

      Please evaluate my translation below and provide detailed feedback and a score on a scale of 1 to 100. Offer some translation tips at the end.
      1. Your analysis and review should be critical and nitpick any possible mistake.
      2. Watch the following aspects carefully:
         1. Whether or not being too mechanical
         2. Is there a "Translationese" Issue
         3. 
         

      # My Translation

      ${inputValue}
      `;
        navigator.clipboard.writeText(prompt).then(() => {
            setToastMessage("Prompt copied to clipboard!");
            setTimeout(() => setToastMessage(null), 1000);
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const isInput = (e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'INPUT';

        const getHotkey = (id: string) => appSettings.hotkeys[id] || AVAILABLE_COMMANDS.find(c => c.id === id)?.default || '';
        const checkCmd = (id: string) => matchesHotkey(e, getHotkey(id));

        // Auto Save
        if (checkCmd('autoSave')) {
            e.preventDefault();
            handleAutoSave();
            return;
        }

        // Edit Translation
        if (isSubmitted && checkCmd('edit')) {
            e.preventDefault();
            setIsSubmitted(false);
            setTimeout(() => inputRef.current?.focus(), 10);
            return;
        }

        // Open Compare Modal
        if (checkCmd('compare')) {
            const hasModifier = e.ctrlKey || e.altKey || e.metaKey;
            // If in input, no modifier, and simple key -> treat as typing, ignore command
            if (isInput && !hasModifier && e.key.length === 1) {
                // pass
            } else {
                e.preventDefault();
                setShowCompareModal(true);
                return;
            }
        }

        // Navigation (Arrows)
        if (checkCmd('next')) {
            if (!isInput || isSubmitted) {
                e.preventDefault();
                handleNext();
                return;
            }
        } else if (checkCmd('prev')) {
            if (!isInput || isSubmitted) {
                e.preventDefault();
                handlePrev();
                return;
            }
        }

        // Submit / Action
        if (checkCmd('submit')) {
            if (!isSubmitted) {
                // Special handling for LLM mode in Textarea
                if (feedbackMode === 'llm' && (e.target as HTMLElement).tagName === 'TEXTAREA') {
                    // If the hotkey is just 'Enter' (no modifiers), we want to allow newlines and NOT submit.
                    // But if the hotkey is 'Ctrl+Enter', we want to submit.
                    // We check if the key is 'Enter' and no modifiers are pressed.
                    if (e.key === 'Enter' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
                        return; // Allow newline
                    }
                }

                e.preventDefault();
                handleSubmit();
            }
        }

        // Hint
        else if (checkCmd('hint')) {
            e.preventDefault();
            setShowHint(prev => !prev);
        }
    };

    // Determine source and target text based on mode
    const sourceText = mode === 'EN_TO_ZH' ? currentParagraph.en[0] : currentParagraph.zh[0];
    const targetText = mode === 'EN_TO_ZH' ? currentParagraph.zh[0] : currentParagraph.en[0];


    return (
        <div
            className="flex items-center justify-center h-full w-full relative perspective-1000 outline-none"
            onKeyDown={handleKeyDown}
            tabIndex={0}
            ref={containerRef}
        >
            <Toast message={toastMessage} />

            {showCompareModal && (
                <SentenceCompareModal
                    sourceText={sourceText}
                    referenceText={targetText}
                    userText={inputValue}
                    additionalReferences={mode === 'EN_TO_ZH' ? currentParagraph.zh.slice(1) : currentParagraph.en.slice(1)}
                    onClose={() => setShowCompareModal(false)}
                    onAddReference={(text) => onAddReference(article.id, currentParagraph.id, text, mode === 'EN_TO_ZH' ? 'zh' : 'en')}
                />
            )}

            {/* Paragraph Selector */}
            <div className="absolute -top-2 left-0 right-0 flex justify-center z-30">
                <div className="flex gap-2 overflow-x-auto max-w-[80vw] px-4 py-2 custom-scrollbar">
                    {article.content.map((p, idx) => {
                        const translation = mode === 'EN_TO_ZH' ? p.userTranslationZh : p.userTranslationEn;
                        const isCurrent = idx === currentIndex;

                        // Default (Not Started) & Draft: High contrast border/text, transparent bg
                        let statusClass = 'bg-transparent text-[var(--text-main)] border-[var(--text-main)] border-2 font-bold';

                        if (translation) {
                            if (translation.type === 'diff') {
                                // Diff: Yellow bg
                                statusClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30';
                            } else if (translation.type === 'llm') {
                                // LLM: Check threshold
                                const score = translation.score || 0;
                                if (score >= appSettings.llmThreshold) {
                                    statusClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30';
                                } else {
                                    statusClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30';
                                }
                            }
                        }

                        return (
                            <button
                                key={p.id}
                                onClick={() => {
                                    setAnimDirection(0);
                                    setCurrentIndex(idx);
                                }}
                                className={`
                  flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono transition-all duration-300 border
                  ${statusClass}
                  ${isCurrent ? 'ring-2 ring-[var(--text-main)] scale-110 z-10 bg-[var(--surface-active)]' : ''}
                `}
                            >
                                {idx + 1}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Left Arrow Area */}
            <div className="absolute left-0 top-0 bottom-0 w-24 flex items-center justify-center z-20 group cursor-pointer" onClick={handlePrev}>
                <div className={`p-3 rounded-full glass-panel transition-all duration-300 group-hover:scale-110 ${currentIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} style={{ color: 'var(--text-secondary)' }}>
                    <ArrowLeftIcon />
                </div>
            </div>

            {/* Right Arrow Area */}
            <div className="absolute right-0 top-0 bottom-0 w-24 flex items-center justify-center z-20 group cursor-pointer" onClick={handleNext}>
                <div className={`p-3 rounded-full glass-panel transition-all duration-300 group-hover:scale-110 ${currentIndex === article.content.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} style={{ color: 'var(--text-secondary)' }}>
                    <ArrowRightIcon />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex gap-8 w-full max-w-[90%] xl:max-w-7xl justify-center items-stretch h-[70vh]">

                {/* Source Card */}
                <div
                    className={`flex-1 glass-panel rounded-2xl p-8 flex flex-col relative transition-all duration-500 ease-out transform shadow-2xl
            ${animDirection === 1 ? '-translate-x-20 opacity-0 scale-95' : animDirection === -1 ? 'translate-x-20 opacity-0 scale-95' : 'translate-x-0 opacity-100 scale-100'}
          `}
                    style={{ borderColor: 'var(--glass-border)', boxShadow: '0 25px 50px -12px var(--particle-blue)' }}
                >
                    {/* Particles */}
                    <ParticleBackground />

                    <div className="flex justify-between items-start mb-6 z-10 relative">
                        <div className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Original</div>
                        <button
                            onClick={() => playTextToSpeech(sourceText)}
                            className="transition-colors hover:text-[var(--text-main)]"
                            style={{ color: 'var(--text-secondary)' }}
                            title="Read Aloud"
                        >
                            <SpeakerIcon />
                        </button>
                    </div>
                    <div className="flex-grow overflow-y-auto z-10 relative custom-scrollbar pr-2">
                        <div className="min-h-full flex flex-col justify-center w-full">
                            <p className={`text-xl md:text-2xl leading-relaxed font-serif-sc ${mode === 'ZH_TO_EN' ? 'font-medium' : 'font-light'}`} style={{ color: 'var(--text-main)' }}>
                                {sourceText}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 text-xs flex justify-between pt-4 border-t z-10 relative" style={{ color: 'var(--text-secondary)', borderColor: 'var(--glass-border)' }}>
                        <span>{currentIndex + 1} / {article.content.length}</span>
                        <span className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded text-[10px] border" style={{ backgroundColor: 'var(--surface-hover)', borderColor: 'var(--glass-border)' }}>Tab Hint</span>
                        </span>
                    </div>

                    {/* Hint Overlay */}
                    <div className={`absolute inset-0 backdrop-blur-sm rounded-2xl flex items-center justify-center p-8 transition-opacity duration-300 z-20 ${showHint ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} style={{ backgroundColor: 'var(--glass-bg)' }}>
                        <p className="text-lg font-serif-sc text-center" style={{ color: 'var(--text-main)' }}>{targetText}</p>
                    </div>
                </div>

                {/* Input/Result Card */}
                <div
                    className={`flex-1 glass-panel input-glow rounded-2xl p-8 flex flex-col relative transition-all duration-500 ease-out transform delay-75
            ${animDirection === 1 ? '-translate-x-20 opacity-0 scale-95' : animDirection === -1 ? 'translate-x-20 opacity-0 scale-95' : 'translate-x-0 opacity-100 scale-100'}
          `}
                >
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                                {isSubmitted ? 'Feedback' : 'Your Translation'}
                            </div>

                            {/* Mode Toggle */}
                            {!isSubmitted && (
                                <div className="flex items-center bg-[var(--surface-hover)] rounded-full p-1 border border-[var(--border-high-contrast)]">
                                    <button
                                        onClick={() => setFeedbackMode('diff')}
                                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${feedbackMode === 'diff' ? 'bg-[var(--text-main)] text-[var(--bg-main)]' : 'text-[var(--text-secondary)]'}`}
                                    >
                                        DIFF
                                    </button>
                                    <button
                                        onClick={() => setFeedbackMode('llm')}
                                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${feedbackMode === 'llm' ? 'bg-[var(--text-main)] text-[var(--bg-main)]' : 'text-[var(--text-secondary)]'}`}
                                    >
                                        LLM
                                    </button>
                                </div>
                            )}
                        </div>

                        {isSubmitted && (
                            <div className="flex gap-4">
                                <span className="text-[10px] border px-1.5 py-0.5 rounded" style={{ color: 'var(--text-secondary)', borderColor: 'var(--text-secondary)' }}>E to Edit</span>
                                <button
                                    onClick={() => { setIsSubmitted(false); setTimeout(() => inputRef.current?.focus(), 100); }}
                                    className="text-xs text-blue-400 hover:text-blue-300"
                                >
                                    Edit
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-grow relative min-h-0 flex flex-col">
                        {!isSubmitted ? (
                            <textarea
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                className="w-full h-full bg-transparent resize-none outline-none text-xl leading-relaxed font-serif-sc custom-scrollbar"
                                style={{ color: 'var(--text-main)' }}
                                placeholder={mode === 'EN_TO_ZH' ? "在此输入中文翻译..." : "Type translation here..."}
                                spellCheck={false}
                            />
                        ) : (
                            <div className="text-xl leading-relaxed font-serif-sc overflow-y-auto flex-1 pr-2 custom-scrollbar break-words whitespace-pre-wrap">
                                {feedbackMode === 'diff' ? (
                                    <span style={{ color: 'var(--text-main)' }}>{inputValue}</span>
                                ) : (
                                    <div className="flex flex-col gap-4">
                                        <div className="p-4 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-hover)]">
                                            <div className="text-xs uppercase tracking-widest mb-2 opacity-50">Score</div>
                                            <div className="text-4xl font-bold text-emerald-400">{score}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs uppercase tracking-widest mb-2 opacity-50">Your Translation</div>
                                            <p>{inputValue}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {!isSubmitted && (
                        <div className="mt-4 flex justify-between items-end">
                            {feedbackMode === 'llm' ? (
                                <div className="flex gap-4 w-full items-end">
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <label className="text-[10px] uppercase tracking-widest mb-1 block opacity-70">Score (1-100)</label>
                                            {appSettings.autoSave.enabled && (
                                                <span className="text-[10px] font-mono opacity-50" style={{ color: 'var(--text-secondary)' }}>
                                                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'unsaved' ? 'Unsaved' : 'Saved'}
                                                </span>
                                            )}
                                        </div>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={score}
                                            onChange={(e) => setScore(e.target.value)}
                                            className="w-full bg-[var(--surface-hover)] border border-[var(--glass-border)] rounded px-3 py-2 outline-none focus:border-[var(--text-main)] transition-colors"
                                            placeholder="Score"
                                        />
                                    </div>
                                    <button
                                        onClick={handleCopyPrompt}
                                        className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--border-high-contrast)] hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-2"
                                    >
                                        <span>Copy Prompt</span>
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!inputValue.trim() || !score}
                                        className={`px-6 py-2 rounded-lg text-sm flex items-center gap-2 font-medium btn-check border border-[var(--border-high-contrast)]
                        ${inputValue.trim() && score ? 'active' : ''}`}
                                    >
                                        <span>Submit</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex justify-between w-full items-center">
                                    <div className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                                        {appSettings.autoSave.enabled && (
                                            <span className={`transition-opacity duration-300 ${saveStatus === 'saved' ? 'opacity-50' : 'opacity-100'}`}>
                                                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'unsaved' ? 'Unsaved' : 'Saved'}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!inputValue.trim()}
                                        className={`px-6 py-2 rounded-lg text-sm flex items-center gap-2 font-medium btn-check border border-[var(--border-high-contrast)]
                        ${inputValue.trim() ? 'active' : ''}`}
                                    >
                                        <span>Check</span>
                                        <span className={`text-[10px] ml-1 ${inputValue.trim() ? 'opacity-60' : 'opacity-20'}`}>⏎</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                </div>

            </div>

            {/* Mobile-ish Controls for non-keyboard users (optional but good for completeness) */}
            <div className="absolute bottom-8 flex gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="hidden md:inline border px-2 py-1 rounded" style={{ borderColor: 'var(--text-secondary)' }}>Arrows to Switch</span>
                <span className="hidden md:inline border px-2 py-1 rounded" style={{ borderColor: 'var(--text-secondary)' }}>Enter to Submit</span>
            </div>
        </div>
    );
};
