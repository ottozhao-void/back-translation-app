import React, { useEffect, useRef } from 'react';
import { XMarkIcon } from './Icons';

interface ConfirmModalProps {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel
}) => {
    const confirmButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        // Focus the confirm button when modal opens
        confirmButtonRef.current?.focus();

        // Handle escape key
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancel();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

    const variantStyles = {
        danger: {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
            ),
            buttonBg: 'bg-red-500 hover:bg-red-600',
        },
        warning: {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-yellow-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
            ),
            buttonBg: 'bg-yellow-500 hover:bg-yellow-600',
        },
        info: {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
            ),
            buttonBg: 'bg-blue-500 hover:bg-blue-600',
        },
    };

    const currentVariant = variantStyles[variant];

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
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 p-2 rounded-full" style={{ backgroundColor: 'var(--surface-hover)' }}>
                        {currentVariant.icon}
                    </div>
                    <div className="flex-1 pt-1">
                        <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-main)' }}>
                            {title}
                        </h3>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {message}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-6">
                    <button
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
                        ref={confirmButtonRef}
                        onClick={onConfirm}
                        className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${currentVariant.buttonBg}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
