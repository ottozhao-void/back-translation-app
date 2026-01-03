import React from 'react';
import { CheckIcon } from './Icons';

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
