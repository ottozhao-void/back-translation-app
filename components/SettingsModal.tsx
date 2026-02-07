import React, { useState } from 'react';
import { AppSettings } from '../types';
import { AVAILABLE_COMMANDS } from '../constants';
import { version } from '../package.json';
import { XMarkIcon, SystemIcon, KeyboardIcon, ArrowUturnLeftIcon, SparklesIcon } from './Icons';
import { AIModelsTab } from './settings/AIModelsTab';

interface SettingsModalProps {
    settings: AppSettings;
    onUpdate: (newSettings: AppSettings) => void;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onUpdate, onClose }) => {
    const [activeTab, setActiveTab] = useState('General');
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(settings.autoSave.enabled);
    const [autoSaveDelay, setAutoSaveDelay] = useState(settings.autoSave.delay / 1000);
    const [llmThreshold, setLlmThreshold] = useState(settings.llmThreshold);
    const [hotkeys, setHotkeys] = useState(settings.hotkeys || {});
    const [practiceGranularity, setPracticeGranularity] = useState<'sentence' | 'paragraph'>(settings.practiceGranularity || 'sentence');
    const [hideReferenceInDetailView, setHideReferenceInDetailView] = useState(settings.hideReferenceInDetailView ?? true);
    const [recordingCommandId, setRecordingCommandId] = useState<string | null>(null);

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
        { name: 'General', icon: SystemIcon },
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

                        {activeTab === 'AI Models' && (
                            <AIModelsTab />
                        )}

                        {activeTab !== 'General' && activeTab !== 'Hotkeys' && activeTab !== 'AI Models' && (
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
