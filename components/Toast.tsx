import React, { useEffect, useState, useCallback } from 'react';
import { CheckIcon, XMarkIcon } from './Icons';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
    id: string;
    message: string;
    variant?: ToastVariant;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastItemProps {
    toast: ToastData;
    onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const duration = toast.duration ?? 3000;
        if (duration > 0) {
            const timer = setTimeout(() => {
                setIsExiting(true);
                setTimeout(() => onDismiss(toast.id), 300);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [toast.id, toast.duration, onDismiss]);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(() => onDismiss(toast.id), 300);
    };

    const handleAction = () => {
        toast.action?.onClick();
        handleDismiss();
    };

    const variantConfig = {
        success: {
            icon: <CheckIcon />,
            bgColor: 'var(--surface-active)',
            accentColor: 'text-emerald-400',
        },
        error: {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-red-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            ),
            bgColor: 'var(--surface-active)',
            accentColor: 'text-red-400',
        },
        warning: {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-yellow-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
            ),
            bgColor: 'var(--surface-active)',
            accentColor: 'text-yellow-400',
        },
        info: {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-blue-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
            ),
            bgColor: 'var(--surface-active)',
            accentColor: 'text-blue-400',
        },
    };

    const config = variantConfig[toast.variant || 'success'];

    return (
        <div
            className={`glass-panel px-4 py-3 rounded-full shadow-lg flex items-center gap-3 transition-all duration-300 ${isExiting ? 'opacity-0 translate-y-[-10px]' : 'opacity-100 translate-y-0'}`}
            style={{ backgroundColor: config.bgColor, borderColor: 'var(--border-high-contrast)' }}
        >
            <span className={config.accentColor}>{config.icon}</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                {toast.message}
            </span>
            {toast.action && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleAction();
                    }}
                    className="ml-2 px-3 py-1 text-xs font-medium rounded-full transition-colors bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                >
                    {toast.action.label}
                </button>
            )}
            <button
                onClick={handleDismiss}
                className="ml-1 p-1 rounded-full transition-colors hover:bg-[var(--surface-hover)]"
                style={{ color: 'var(--text-secondary)' }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};

// Toast Container Component
interface ToastContainerProps {
    toasts: ToastData[];
    onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-[200] flex flex-col gap-2 items-center">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
};

// Hook for managing toasts
export const useToast = () => {
    const [toasts, setToasts] = useState<ToastData[]>([]);

    const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setToasts((prev) => [...prev, { ...toast, id }]);
        return id;
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showSuccess = useCallback((message: string, action?: ToastData['action']) => {
        return addToast({ message, variant: 'success', action });
    }, [addToast]);

    const showError = useCallback((message: string, action?: ToastData['action']) => {
        return addToast({ message, variant: 'error', duration: 5000, action });
    }, [addToast]);

    const showWarning = useCallback((message: string, action?: ToastData['action']) => {
        return addToast({ message, variant: 'warning', duration: 4000, action });
    }, [addToast]);

    const showInfo = useCallback((message: string, action?: ToastData['action']) => {
        return addToast({ message, variant: 'info', action });
    }, [addToast]);

    return {
        toasts,
        addToast,
        dismissToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
    };
};

// Legacy Toast component for backward compatibility
interface ToastProps {
    message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
    if (!message) return null;
    return (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 fade-in">
            <div className="glass-panel px-6 py-3 rounded-full shadow-lg flex items-center gap-2" style={{ backgroundColor: 'var(--surface-active)', borderColor: 'var(--border-high-contrast)' }}>
                <CheckIcon />
                <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{message}</span>
            </div>
        </div>
    );
};
