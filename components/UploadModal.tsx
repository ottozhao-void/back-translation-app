import React, { useState, useEffect } from 'react';
import { UploadIcon, XMarkIcon } from './Icons';

interface UploadModalProps {
    onClose: () => void;
    onUploadFile: () => void;
    onCreate: (title: string, content: string) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUploadFile, onCreate }) => {
    const [mode, setMode] = useState<'SELECT' | 'CREATE'>('SELECT');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    // Prevent background scrolling
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'auto'; };
    }, []);

    const handleCreate = () => {
        if (!title.trim()) {
            alert("Please enter a title.");
            return;
        }
        if (!content.includes('# 英文原文') || !content.includes('# 中文原文')) {
            alert("Format Error: Content must contain '# 英文原文' and '# 中文原文' sections.");
            return;
        }
        onCreate(title, content);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 backdrop-blur-sm transition-opacity"
                style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                onClick={onClose}
            />

            <div className="relative w-full max-w-2xl glass-panel rounded-2xl flex flex-col shadow-2xl animate-[float_0.3s_ease-out] overflow-hidden">

                {mode === 'SELECT' ? (
                    <div className="p-12 flex flex-col items-center">
                        <h2 className="text-2xl font-serif-sc mb-8" style={{ color: 'var(--text-main)' }}>Add New Article</h2>
                        <div className="flex gap-8 w-full justify-center">
                            <button
                                onClick={() => { onUploadFile(); onClose(); }}
                                className="flex-1 h-48 glass-panel rounded-xl flex flex-col items-center justify-center gap-4 transition-all duration-300 hover:bg-[var(--surface-hover)] hover:scale-105 border border-[var(--border-high-contrast)]"
                            >
                                <UploadIcon />
                                <span className="font-mono tracking-widest uppercase text-sm">Upload File</span>
                            </button>
                            <button
                                onClick={() => setMode('CREATE')}
                                className="flex-1 h-48 glass-panel rounded-xl flex flex-col items-center justify-center gap-4 transition-all duration-300 hover:bg-[var(--surface-hover)] hover:scale-105 border border-[var(--border-high-contrast)]"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                                <span className="font-mono tracking-widest uppercase text-sm">Create New</span>
                            </button>
                        </div>
                        <button onClick={onClose} className="mt-8 text-sm hover:underline" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
                    </div>
                ) : (
                    <div className="flex flex-col h-[80vh]">
                        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--glass-border)' }}>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter Article Title..."
                                className="text-xl font-serif-sc bg-transparent outline-none w-full placeholder-opacity-50"
                                style={{ color: 'var(--text-main)' }}
                                autoFocus
                            />
                            <button
                                onClick={onClose}
                                className="transition-colors p-2 rounded-full hover:bg-[var(--surface-hover)] ml-4"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                <XMarkIcon />
                            </button>
                        </div>

                        <div className="flex-1 p-6 overflow-hidden flex flex-col">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder={`# 英文原文\nPaste English text here...\n\n# 中文原文\nPaste Chinese text here...`}
                                className="flex-1 w-full bg-transparent resize-none outline-none font-mono text-sm leading-relaxed custom-scrollbar p-4 rounded-lg border border-dashed border-[var(--border-high-contrast)] focus:border-solid focus:border-[var(--text-secondary)] transition-all"
                                style={{ color: 'var(--text-main)' }}
                            />
                        </div>

                        <div className="p-6 border-t flex justify-between items-center" style={{ borderColor: 'var(--glass-border)' }}>
                            <button
                                onClick={() => setMode('SELECT')}
                                className="text-sm hover:underline"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                Back
                            </button>
                            <button
                                onClick={handleCreate}
                                className="px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                                style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-main)' }}
                            >
                                Save Article
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
