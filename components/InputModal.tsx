import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from './Icons';

interface InputModalProps {
    title: string;
    message?: string;
    placeholder?: string;
    defaultValue?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: (value: string) => void;
    onCancel: () => void;
}

export const InputModal: React.FC<InputModalProps> = ({
    title,
    message,
    placeholder = '',
    defaultValue = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel
}) => {
    const [value, setValue] = useState(defaultValue);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Focus and select text when modal opens
        inputRef.current?.focus();
        inputRef.current?.select();

        // Handle escape key
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancel();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value.trim()) {
            onConfirm(value.trim());
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (value.trim()) {
                onConfirm(value.trim());
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Modal */}
            <div className="relative glass-panel rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" style={{ borderColor: 'var(--border-high-contrast)' }}>
                {/* Close button */}
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 p-1 rounded-full transition-colors hover:bg-[var(--surface-hover)]"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    <XMarkIcon />
                </button>

                {/* Content */}
                <form onSubmit={handleSubmit}>
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 p-2 rounded-full" style={{ backgroundColor: 'var(--surface-hover)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                            </svg>
                        </div>
                        <div className="flex-1 pt-1">
                            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-main)' }}>
                                {title}
                            </h3>
                            {message && (
                                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                                    {message}
                                </p>
                            )}
                            <input
                                ref={inputRef}
                                type="text"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={placeholder}
                                className="w-full px-4 py-2 rounded-lg text-sm input-glow transition-all"
                                style={{
                                    backgroundColor: 'var(--surface-hover)',
                                    color: 'var(--text-main)',
                                    border: '1px solid var(--glass-border)',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            style={{
                                backgroundColor: 'var(--surface-hover)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--glass-border)'
                            }}
                        >
                            {cancelText}
                        </button>
                        <button
                            type="submit"
                            disabled={!value.trim()}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {confirmText}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
