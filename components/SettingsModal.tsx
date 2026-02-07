import React, { useState, useEffect, useCallback } from 'react';
import { AppSettings } from '../types';
import { AVAILABLE_COMMANDS } from '../constants';
import { version } from '../package.json';
import { XMarkIcon, SystemIcon, KeyboardIcon, ArrowUturnLeftIcon, SparklesIcon, UserCircleIcon, RefreshIcon, TagIcon } from './Icons';
import { AIModelsTab } from './settings/AIModelsTab';
import { generateGreetings } from '../services/llmService';

interface SettingsModalProps {
    settings: AppSettings;
    onUpdate: (newSettings: AppSettings) => void;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onUpdate, onClose }) => {
    const [activeTab, setActiveTab] = useState('Greeting');
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(settings.autoSave.enabled);
    const [autoSaveDelay, setAutoSaveDelay] = useState(settings.autoSave.delay / 1000);
    const [llmThreshold, setLlmThreshold] = useState(settings.llmThreshold);
    const [hotkeys, setHotkeys] = useState(settings.hotkeys || {});
    const [practiceGranularity, setPracticeGranularity] = useState<'sentence' | 'paragraph'>(settings.practiceGranularity || 'sentence');
    const [hideReferenceInDetailView, setHideReferenceInDetailView] = useState(settings.hideReferenceInDetailView ?? true);
    const [hideSkippedByDefault, setHideSkippedByDefault] = useState(settings.hideSkippedByDefault ?? true);
    const [userName, setUserName] = useState(settings.userName || '');
    const [greetingPrompt, setGreetingPrompt] = useState(settings.greetingPrompt || '');
    const [recordingCommandId, setRecordingCommandId] = useState<string | null>(null);

    // Greeting preview state
    const [greetingPreview, setGreetingPreview] = useState<string[]>([]);
    const [isLoadingGreetings, setIsLoadingGreetings] = useState(false);
    const [greetingError, setGreetingError] = useState<string | null>(null);

    // Load existing greetings from cache on mount
    useEffect(() => {
        const cachedData = localStorage.getItem('aether_greetings_cache');
        if (cachedData) {
            try {
                const cache = JSON.parse(cachedData);
                if (cache.greetings && Array.isArray(cache.greetings)) {
                    setGreetingPreview(cache.greetings);
                }
            } catch {
                // Ignore parse errors
            }
        }
    }, []);

    // Regenerate greetings
    const handleRegenerateGreetings = useCallback(async () => {
        setIsLoadingGreetings(true);
        setGreetingError(null);
        try {
            const result = await generateGreetings(userName || undefined, greetingPrompt || undefined, 5);
            if (result.success && result.greetings.length > 0) {
                setGreetingPreview(result.greetings);
                // Update cache
                const newCache = {
                    greetings: result.greetings,
                    userName: userName || undefined,
                    prompt: greetingPrompt || undefined,
                    timestamp: Date.now(),
                };
                localStorage.setItem('aether_greetings_cache', JSON.stringify(newCache));
                // Reset rotation index
                localStorage.setItem('aether_greeting_index', '0');
            } else if (result.usedFallback) {
                setGreetingError('No LLM provider configured. Using default greetings.');
                setGreetingPreview(result.greetings);
            }
        } catch (error) {
            setGreetingError('Failed to generate greetings. Check your LLM settings.');
            console.error('Failed to regenerate greetings:', error);
        } finally {
            setIsLoadingGreetings(false);
        }
    }, [userName, greetingPrompt]);

    const handleSave = () => {
        onUpdate({
            autoSave: {
                enabled: autoSaveEnabled,
                delay: autoSaveDelay * 1000
            },
            llmThreshold,
            hotkeys,
            practiceGranularity,
            hideReferenceInDetailView,
            hideSkippedByDefault,
            userName: userName.trim() || undefined,
            greetingPrompt: greetingPrompt.trim() || undefined,
        });
        onClose();
    };

    const handleHotkeyRecord = (e: React.KeyboardEvent, commandId: string) => {
        e.preventDefault();
        e.stopPropagation();

        const parts = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.metaKey) parts.push('Meta');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');

        const key = e.key;
        if (['Control', 'Meta', 'Alt', 'Shift'].includes(key)) return; // Just modifiers

        if (key === ' ') parts.push('Space');
        else if (key === 'ArrowUp') parts.push('ArrowUp');
        else if (key === 'ArrowDown') parts.push('ArrowDown');
        else if (key === 'ArrowLeft') parts.push('ArrowLeft');
        else if (key === 'ArrowRight') parts.push('ArrowRight');
        else if (key === 'Enter') parts.push('Enter');
        else if (key === 'Tab') parts.push('Tab');
        else if (key === 'Escape') {
            setRecordingCommandId(null);
            return;
        }
        else if (key === 'Backspace' || key === 'Delete') {
            // Clear hotkey (Unbind)
            setHotkeys({ ...hotkeys, [commandId]: '' });
            setRecordingCommandId(null);
            return;
        }
        else parts.push(key.toUpperCase());

        const hotkeyString = parts.join('+');
        setHotkeys({ ...hotkeys, [commandId]: hotkeyString });
        setRecordingCommandId(null);
    };

    const handleResetHotkey = (commandId: string) => {
        const newHotkeys = { ...hotkeys };
        delete newHotkeys[commandId];
        setHotkeys(newHotkeys);
    };

    const handleClearHotkey = (commandId: string) => {
        setHotkeys({ ...hotkeys, [commandId]: '' });
    };

    const sidebarItems = [
        { name: 'Greeting', icon: UserCircleIcon },
        { name: 'General', icon: SystemIcon },
        { name: 'Tags', icon: TagIcon },
        { name: 'Hotkeys', icon: KeyboardIcon },
        { name: 'AI Models', icon: SparklesIcon },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 backdrop-blur-sm transition-opacity"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                onClick={onClose}
            />
            <div className="relative w-full max-w-5xl h-[80vh] glass-panel rounded-2xl flex shadow-2xl animate-[float_0.3s_ease-out] overflow-hidden" style={{ backgroundColor: 'var(--bg-main)' }}>

                {/* Sidebar */}
                <div className="w-64 flex-shrink-0 border-r border-[var(--glass-border)] p-4 flex flex-col gap-2 bg-[var(--surface-hover)]/30">
                    <div className="mb-6 px-4 pt-2">
                        <h2 className="text-xl font-serif-sc font-bold" style={{ color: 'var(--text-main)' }}>Settings</h2>
                    </div>
                    {sidebarItems.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => setActiveTab(item.name)}
                            className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${activeTab === item.name ? 'bg-[var(--surface-active)] shadow-sm' : 'hover:bg-[var(--surface-hover)]'}`}
                            style={{ color: activeTab === item.name ? 'var(--text-main)' : 'var(--text-secondary)' }}
                        >
                            <item.icon />
                            <span>{item.name}</span>
                        </button>
                    ))}
                    <div className="mt-auto px-4 pb-2">
                        <span className="text-xs font-mono font-medium opacity-70 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
                            v{version}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <div className="h-16 border-b border-[var(--glass-border)] flex items-center justify-between px-8">
                        <h3 className="text-lg font-medium" style={{ color: 'var(--text-main)' }}>{activeTab}</h3>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--surface-hover)] transition-colors" style={{ color: 'var(--text-secondary)' }}>
                            <XMarkIcon />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        {activeTab === 'Greeting' && (
                            <div className="space-y-6 max-w-2xl">
                                {/* Setting Item: User Name */}
                                <div className="flex flex-col gap-4 p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Your Name</span>
                                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Used for personalized greetings when you open the app</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                        placeholder="Enter your name..."
                                        className="w-full bg-[var(--bg-main)] border border-[var(--glass-border)] rounded-lg px-4 py-2.5 outline-none focus:border-[var(--text-main)] transition-colors"
                                        style={{ color: 'var(--text-main)' }}
                                    />
                                </div>

                                {/* Setting Item: Greeting Prompt */}
                                <div className="flex flex-col gap-4 p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Greeting Prompt</span>
                                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                            Custom prompt for AI to generate personalized greetings. Use <code className="px-1 py-0.5 rounded bg-[var(--surface-hover)]">{'{{name}}'}</code> as placeholder for your name.
                                        </span>
                                    </div>
                                    <textarea
                                        value={greetingPrompt}
                                        onChange={(e) => setGreetingPrompt(e.target.value)}
                                        placeholder={`Example: Generate a warm, encouraging greeting for {{name}} who is practicing English-Chinese translation. Keep it brief (1-2 sentences), friendly, and motivating. Vary the style each time.`}
                                        rows={4}
                                        className="w-full bg-[var(--bg-main)] border border-[var(--glass-border)] rounded-lg px-4 py-2.5 outline-none focus:border-[var(--text-main)] transition-colors resize-none"
                                        style={{ color: 'var(--text-main)' }}
                                    />
                                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                        Leave empty to use the default greeting prompt. The AI will generate multiple greeting variations that rotate each time you visit.
                                    </div>
                                </div>

                                {/* Greeting Preview Section */}
                                <div className="flex flex-col gap-4 p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Generated Greetings</span>
                                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                Preview of greetings that will rotate on each visit
                                            </span>
                                        </div>
                                        <button
                                            onClick={handleRegenerateGreetings}
                                            disabled={isLoadingGreetings}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-[var(--glass-border)] transition-all ${
                                                isLoadingGreetings
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : 'hover:bg-[var(--surface-hover)] cursor-pointer'
                                            }`}
                                            style={{ color: 'var(--text-main)' }}
                                        >
                                            <span className={isLoadingGreetings ? 'animate-spin' : ''}>
                                                <RefreshIcon />
                                            </span>
                                            <span>{isLoadingGreetings ? 'Generating...' : 'Regenerate'}</span>
                                        </button>
                                    </div>

                                    {/* Error message */}
                                    {greetingError && (
                                        <div className="text-xs px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30" style={{ color: 'var(--text-secondary)' }}>
                                            {greetingError}
                                        </div>
                                    )}

                                    {/* Greetings list */}
                                    <div className="space-y-2">
                                        {greetingPreview.length > 0 ? (
                                            greetingPreview.map((g, index) => (
                                                <div
                                                    key={index}
                                                    className="px-3 py-2 rounded-lg text-sm italic"
                                                    style={{
                                                        backgroundColor: 'var(--bg-main)',
                                                        color: 'var(--text-secondary)',
                                                        borderLeft: '3px solid var(--glass-border)',
                                                    }}
                                                >
                                                    "{g}"
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>
                                                No greetings generated yet. Click "Regenerate" to create personalized greetings.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'General' && (
                            <div className="space-y-6 max-w-2xl">

                                {/* Setting Item: Auto Save */}
                                <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Auto Save Drafts</span>
                                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Automatically save your translation progress</span>
                                    </div>
                                    <button
                                        onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${autoSaveEnabled ? 'bg-emerald-500' : 'bg-gray-600'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${autoSaveEnabled ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                {/* Setting Item: Auto Save Delay */}
                                {autoSaveEnabled && (
                                    <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Auto Save Delay</span>
                                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Time to wait before saving (seconds)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                max="60"
                                                value={autoSaveDelay}
                                                onChange={(e) => setAutoSaveDelay(Math.max(1, parseInt(e.target.value) || 1))}
                                                className="w-20 bg-[var(--bg-main)] border border-[var(--glass-border)] rounded px-3 py-1.5 outline-none focus:border-[var(--text-main)] transition-colors text-right"
                                                style={{ color: 'var(--text-main)' }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Setting Item: LLM Threshold */}
                                <div className="flex flex-col gap-4 p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>LLM Score Threshold</span>
                                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Minimum score to mark as completed</span>
                                        </div>
                                        <span className="font-mono text-lg font-bold" style={{ color: 'var(--text-main)' }}>{llmThreshold}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="100"
                                        value={llmThreshold}
                                        onChange={(e) => setLlmThreshold(parseInt(e.target.value))}
                                        className="w-full accent-[var(--text-main)]"
                                    />
                                </div>

                                {/* Setting Item: Practice Granularity */}
                                <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Paragraph Mode</span>
                                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Practice at paragraph level instead of sentences</span>
                                    </div>
                                    <button
                                        onClick={() => setPracticeGranularity(prev => prev === 'sentence' ? 'paragraph' : 'sentence')}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${practiceGranularity === 'paragraph' ? 'bg-emerald-500' : 'bg-gray-600'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${practiceGranularity === 'paragraph' ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                {/* Setting Item: Hide Reference in Detail View */}
                                <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Hide Reference Before Practice</span>
                                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Hide the reference translation in sentence detail view to avoid spoilers</span>
                                    </div>
                                    <button
                                        onClick={() => setHideReferenceInDetailView(!hideReferenceInDetailView)}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${hideReferenceInDetailView ? 'bg-emerald-500' : 'bg-gray-600'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${hideReferenceInDetailView ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                            </div>
                        )}

                        {activeTab === 'Hotkeys' && (
                            <div className="space-y-4 max-w-3xl">
                                <div className="flex items-center gap-2 p-2 mb-4 border-b border-[var(--glass-border)]">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[var(--text-secondary)]">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Search hotkeys..."
                                        className="bg-transparent outline-none w-full text-sm"
                                        style={{ color: 'var(--text-main)' }}
                                    />
                                </div>

                                {AVAILABLE_COMMANDS.map(cmd => {
                                    const isRecording = recordingCommandId === cmd.id;
                                    const customKey = hotkeys[cmd.id];
                                    const currentKey = customKey !== undefined ? customKey : cmd.default;
                                    const isCustomized = customKey !== undefined;

                                    return (
                                        <div key={cmd.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface-hover)]/50 transition-colors group">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{cmd.label}</span>
                                                <span className="text-xs opacity-50" style={{ color: 'var(--text-secondary)' }}>{cmd.id}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isCustomized && (
                                                    <button
                                                        onClick={() => handleResetHotkey(cmd.id)}
                                                        className="p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)] transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Restore Default"
                                                    >
                                                        <ArrowUturnLeftIcon />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleClearHotkey(cmd.id)}
                                                    className="p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-red-500/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Unbind (Clear)"
                                                >
                                                    <XMarkIcon />
                                                </button>
                                                <button
                                                    onClick={() => setRecordingCommandId(cmd.id)}
                                                    onKeyDown={(e) => isRecording && handleHotkeyRecord(e, cmd.id)}
                                                    className={`
                                              min-w-[100px] px-3 py-1.5 rounded-md text-xs font-mono border transition-all
                                              ${isRecording
                                                            ? 'bg-[var(--surface-active)] border-[var(--text-main)] text-[var(--text-main)] animate-pulse'
                                                            : 'bg-[var(--surface-hover)] border-transparent text-[var(--text-secondary)] hover:border-[var(--border-high-contrast)]'
                                                        }
                                          `}
                                                >
                                                    {isRecording ? 'Press keys...' : (currentKey || 'None')}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {activeTab === 'Tags' && (
                            <div className="space-y-6 max-w-2xl">
                                {/* Setting Item: Hide Skipped by Default */}
                                <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Hide Skipped Sentences</span>
                                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                            Hide sentences marked with "跳过" tag by default in the sentence list
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setHideSkippedByDefault(!hideSkippedByDefault)}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${hideSkippedByDefault ? 'bg-emerald-500' : 'bg-gray-600'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${hideSkippedByDefault ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                {/* System Tags Info */}
                                <div className="p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10">
                                    <div className="flex flex-col gap-3">
                                        <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>System Tags</span>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6b7280' }} />
                                                <span className="text-sm" style={{ color: 'var(--text-main)' }}>跳过</span>
                                                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>— Skip this sentence during practice</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
                                                <span className="text-sm" style={{ color: 'var(--text-main)' }}>已掌握</span>
                                                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>— Mark as mastered</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                                                <span className="text-sm" style={{ color: 'var(--text-main)' }}>困难</span>
                                                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>— Mark as difficult for extra practice</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Usage Tips */}
                                <div className="p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Tips</span>
                                        <ul className="text-xs space-y-1.5" style={{ color: 'var(--text-secondary)' }}>
                                            <li>• Right-click a sentence to quickly toggle system tags</li>
                                            <li>• Click "管理标签..." to create and manage custom tags</li>
                                            <li>• Use the 🏷 view mode in sidebar to browse by tag</li>
                                            <li>• Custom tags can have any color you choose</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'AI Models' && (
                            <AIModelsTab />
                        )}

                        {activeTab !== 'General' && activeTab !== 'Hotkeys' && activeTab !== 'AI Models' && activeTab !== 'Greeting' && activeTab !== 'Tags' && (
                            <div className="flex flex-col items-center justify-center h-64 text-[var(--text-secondary)]">
                                <div className="mb-4 opacity-50 scale-150">
                                    {(() => {
                                        const Icon = sidebarItems.find(i => i.name === activeTab)?.icon;
                                        return Icon ? <Icon /> : null;
                                    })()}
                                </div>
                                <p>No settings available for {activeTab} yet.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-[var(--glass-border)] flex justify-end gap-4 bg-[var(--surface-hover)]/10">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
                            style={{ color: 'var(--text-main)' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-main)' }}
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
