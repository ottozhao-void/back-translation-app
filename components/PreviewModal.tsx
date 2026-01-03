import React, { useState, useEffect } from 'react';
import { Article } from '../types';
import { XMarkIcon } from './Icons';

interface PreviewModalProps {
    article: Article;
    onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ article, onClose }) => {
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'auto'; };
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
            <div
                className="absolute inset-0 backdrop-blur-sm transition-opacity"
                style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                onClick={onClose}
            />

            <div className="relative w-full max-w-4xl max-h-full glass-panel rounded-2xl flex flex-col shadow-2xl animate-[float_0.3s_ease-out]">
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--glass-border)' }}>
                    <h2 className="text-2xl font-serif-sc truncate pr-4" style={{ color: 'var(--text-main)' }}>{article.title}</h2>
                    <button
                        onClick={onClose}
                        className="transition-colors p-2 rounded-full hover:bg-[var(--surface-hover)]"
                        style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-high-contrast)' }}
                    >
                        <XMarkIcon />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
                    {article.content.map((p, i) => (
                        <div key={p.id} className="flex flex-col md:flex-row gap-4 md:gap-8">
                            <div className="flex-1">
                                <p className="font-serif-sc leading-relaxed" style={{ color: 'var(--text-main)' }}>{p.en[0]}</p>
                            </div>
                            <div className="flex-1">
                                <p className="font-serif-sc leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{p.zh[0]}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t flex justify-end" style={{ borderColor: 'var(--glass-border)' }}>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm transition-colors"
                        style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-main)', border: '1px solid var(--border-high-contrast)' }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
