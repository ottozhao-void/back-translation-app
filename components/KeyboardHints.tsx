import React, { useEffect } from 'react';
import { XMarkIcon } from './Icons';
import { AVAILABLE_COMMANDS } from '../constants';
import { AppSettings } from '../types';

interface KeyboardHintsProps {
    appSettings: AppSettings;
    onClose: () => void;
}

// Format hotkey for display
const formatHotkey = (hotkey: string): string => {
    if (!hotkey) return '—';
    return hotkey
        .replace('ArrowRight', '→')
        .replace('ArrowLeft', '←')
        .replace('ArrowUp', '↑')
        .replace('ArrowDown', '↓')
        .replace('Escape', 'Esc')
        .replace('Control', 'Ctrl')
        .replace('+', ' + ');
};

export const KeyboardHints: React.FC<KeyboardHintsProps> = ({ appSettings, onClose }) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' || e.key === '?') {
                e.preventDefault();
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const getHotkey = (id: string): string => {
        return appSettings.hotkeys[id] || AVAILABLE_COMMANDS.find(c => c.id === id)?.default || '';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="relative glass-panel rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl"
                style={{ borderColor: 'var(--border-high-contrast)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full" style={{ backgroundColor: 'var(--surface-hover)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium" style={{ color: 'var(--text-main)' }}>
                            Keyboard Shortcuts
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full transition-colors hover:bg-[var(--surface-hover)]"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <XMarkIcon />
                    </button>
                </div>

                {/* Shortcuts List */}
                <div className="space-y-2">
                    {AVAILABLE_COMMANDS.filter(cmd => cmd.default || appSettings.hotkeys[cmd.id]).map((command) => (
                        <div
                            key={command.id}
                            className="flex items-center justify-between py-2 px-3 rounded-lg transition-colors hover:bg-[var(--surface-hover)]"
                        >
                            <span className="text-sm" style={{ color: 'var(--text-main)' }}>
                                {command.label}
                            </span>
                            <kbd
                                className="px-2 py-1 text-xs font-mono rounded"
                                style={{
                                    backgroundColor: 'var(--surface-hover)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--glass-border)'
                                }}
                            >
                                {formatHotkey(getHotkey(command.id))}
                            </kbd>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t flex justify-between items-center" style={{ borderColor: 'var(--glass-border)' }}>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Press <kbd className="px-1.5 py-0.5 text-xs font-mono rounded mx-1" style={{ backgroundColor: 'var(--surface-hover)', border: '1px solid var(--glass-border)' }}>?</kbd> to toggle
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Customize in Settings
                    </span>
                </div>
            </div>
        </div>
    );
};
