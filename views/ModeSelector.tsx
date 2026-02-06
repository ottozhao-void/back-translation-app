import React from 'react';
import { Article, PracticeMode } from '../types';
import { UKFlagIcon, ChinaFlagIcon, ArrowForwardIcon } from '../components/Icons';

interface ModeSelectorProps {
    article: Article;
    onSelectMode: (m: PracticeMode) => void;
    onBack: () => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ article, onSelectMode, onBack }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full fade-in">
            <h2 className="text-3xl font-serif-sc mb-12 text-center max-w-2xl leading-relaxed" style={{ color: 'var(--text-main)' }}>{article.title}</h2>
            <div className="flex gap-8 flex-wrap justify-center">
                <button
                    onClick={() => onSelectMode('EN_TO_ZH')}
                    className="w-64 h-40 glass-panel rounded-2xl flex flex-col items-center justify-center gap-4 transition-all duration-300 group hover:bg-[var(--surface-hover)]"
                    style={{ color: 'var(--text-main)', borderColor: 'var(--border-high-contrast)' }}
                >
                    <div className="flex items-center gap-3 group-hover:scale-110 transition-transform duration-300">
                        <UKFlagIcon className="w-10 h-7 rounded shadow-sm" />
                        <ArrowForwardIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                        <ChinaFlagIcon className="w-10 h-7 rounded shadow-sm" />
                    </div>
                    <span className="font-light tracking-wide">English to Chinese</span>
                </button>
                <button
                    onClick={() => onSelectMode('ZH_TO_EN')}
                    className="w-64 h-40 glass-panel rounded-2xl flex flex-col items-center justify-center gap-4 transition-all duration-300 group hover:bg-[var(--surface-hover)]"
                    style={{ color: 'var(--text-main)', borderColor: 'var(--border-high-contrast)' }}
                >
                    <div className="flex items-center gap-3 group-hover:scale-110 transition-transform duration-300">
                        <ChinaFlagIcon className="w-10 h-7 rounded shadow-sm" />
                        <ArrowForwardIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                        <UKFlagIcon className="w-10 h-7 rounded shadow-sm" />
                    </div>
                    <span className="font-light tracking-wide">Chinese to English</span>
                </button>
            </div>
            <button onClick={onBack} className="mt-12 transition-colors text-sm" style={{ color: 'var(--text-secondary)' }}>
                Back to Articles
            </button>
        </div>
    );
};
