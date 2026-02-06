import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Article } from '../types';
import { UploadIcon, EyeIcon, PencilIcon, TrashIcon } from '../components/Icons';
import { UploadModal } from '../components/UploadModal';
import { PreviewModal } from '../components/PreviewModal';
import { InputModal } from '../components/InputModal';
import { ToastContainer, useToast } from '../components/Toast';

interface ArticleListProps {
    articles: Article[];
    onSelect: (a: Article) => void;
    onUpload: (content: string, filename: string) => void;
    onCreate: (title: string, content: string) => void;
    onDelete: (id: string) => void;
    onRename: (id: string, newTitle: string) => void;
}

interface PendingDelete {
    id: string;
    title: string;
    timeoutId: NodeJS.Timeout;
}

export const ArticleList: React.FC<ArticleListProps> = ({ articles, onSelect, onUpload, onCreate, onDelete, onRename }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewArticle, setPreviewArticle] = useState<Article | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [renameTarget, setRenameTarget] = useState<Article | null>(null);
    const [pendingDeletes, setPendingDeletes] = useState<Map<string, PendingDelete>>(new Map());

    const { toasts, dismissToast, showSuccess, showError } = useToast();

    // Cleanup pending deletes on unmount
    useEffect(() => {
        return () => {
            pendingDeletes.forEach((pending) => {
                clearTimeout(pending.timeoutId);
            });
        };
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            // Validate Format
            if (!text.includes('# 英文原文') || !text.includes('# 中文原文')) {
                showError("Format Error: File must contain '# 英文原文' and '# 中文原文' sections.");
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }

            onUpload(text, file.name);
            showSuccess("Article uploaded successfully!");
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const handleDeleteClick = useCallback((e: React.MouseEvent, article: Article) => {
        e.stopPropagation();

        const articleId = article.id;
        const articleTitle = article.title;

        // Create timeout for permanent deletion
        const timeoutId = setTimeout(() => {
            // Perform actual deletion
            onDelete(articleId);
            setPendingDeletes(prev => {
                const newMap = new Map(prev);
                newMap.delete(articleId);
                return newMap;
            });
        }, 5000);

        // Add to pending deletes
        setPendingDeletes(prev => {
            const newMap = new Map(prev);
            newMap.set(articleId, { id: articleId, title: articleTitle, timeoutId });
            return newMap;
        });

        // Show toast with undo action
        showSuccess(`"${articleTitle}" will be deleted`, {
            label: 'Undo',
            onClick: () => {
                // Cancel the deletion
                clearTimeout(timeoutId);
                setPendingDeletes(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(articleId);
                    return newMap;
                });
                showSuccess(`"${articleTitle}" restored`);
            }
        });
    }, [onDelete, showSuccess]);

    const handleRenameClick = (e: React.MouseEvent, article: Article) => {
        e.stopPropagation();
        setRenameTarget(article);
    };

    const handleConfirmRename = (newTitle: string) => {
        if (renameTarget && newTitle !== renameTarget.title) {
            onRename(renameTarget.id, newTitle);
            showSuccess(`Article renamed to "${newTitle}"`);
        }
        setRenameTarget(null);
    };

    const handlePreviewClick = (e: React.MouseEvent, article: Article) => {
        e.stopPropagation();
        setPreviewArticle(article);
    };

    // Filter out pending deletes from display
    const visibleArticles = articles.filter(a => !pendingDeletes.has(a.id));

    return (
        <>
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 pt-6 md:pt-10 pb-20 fade-in max-w-7xl mx-auto px-4 md:px-0">
                {/* Upload Card */}
                <div
                    onClick={() => setShowUploadModal(true)}
                    className="group glass-panel rounded-xl overflow-hidden cursor-pointer transition-all duration-500 border-dashed border-2 flex flex-col items-center justify-center h-full min-h-[200px] md:min-h-[300px] gap-4 touch-manipulation"
                    style={{ borderColor: 'var(--border-high-contrast)' }}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".md,.txt"
                        onChange={handleFileChange}
                    />
                    <div className="p-4 rounded-full transition-colors duration-300" style={{ backgroundColor: 'var(--surface-hover)' }}>
                        <UploadIcon />
                    </div>
                    <span className="text-sm font-mono tracking-widest uppercase transition-colors" style={{ color: 'var(--text-secondary)' }}>Upload Article</span>
                </div>

                {visibleArticles.map((article, idx) => (
                    <div
                        key={article.id}
                        onClick={() => onSelect(article)}
                        className="group glass-panel rounded-xl overflow-hidden cursor-pointer hover:transform hover:-translate-y-2 transition-all duration-500 shadow-lg hover:shadow-2xl relative touch-manipulation"
                        style={{ animationDelay: `${idx * 100}ms` }}
                    >
                        <div className="h-36 md:h-48 overflow-hidden relative">
                            <div className="absolute inset-0 transition-colors duration-500 z-10" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }} />
                            <img
                                src={article.coverImage}
                                alt={article.title}
                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                            />
                            {/* Action Buttons Overlay - always visible on touch, hover on desktop */}
                            <div className="absolute top-2 right-2 flex gap-2 z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                                <button
                                    onClick={(e) => handlePreviewClick(e, article)}
                                    className="p-2 md:p-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 rounded-full backdrop-blur-md transition-all flex items-center justify-center"
                                    style={{ backgroundColor: 'var(--glass-bg)', color: 'var(--text-main)', border: '1px solid var(--border-high-contrast)' }}
                                    title="Preview"
                                >
                                    <EyeIcon />
                                </button>
                                <button
                                    onClick={(e) => handleRenameClick(e, article)}
                                    className="p-2 md:p-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 rounded-full backdrop-blur-md transition-all flex items-center justify-center"
                                    style={{ backgroundColor: 'var(--glass-bg)', color: 'var(--text-main)', border: '1px solid var(--border-high-contrast)' }}
                                    title="Rename"
                                >
                                    <PencilIcon />
                                </button>
                                <button
                                    onClick={(e) => handleDeleteClick(e, article)}
                                    className="p-2 md:p-2 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 rounded-full backdrop-blur-md hover:bg-red-900/70 transition-all flex items-center justify-center"
                                    style={{ backgroundColor: 'var(--glass-bg)', color: 'var(--text-main)', border: '1px solid var(--border-high-contrast)' }}
                                    title="Delete"
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 md:p-6">
                            <div className="text-xs font-mono text-blue-400 mb-2 uppercase tracking-wider">{article.category}</div>
                            <h2 className="text-lg md:text-xl font-serif-sc font-medium mb-2 line-clamp-2" style={{ color: 'var(--text-main)' }}>{article.title}</h2>
                            <div className="flex justify-between items-end mt-4">
                                <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{article.date}</span>
                                <span className="text-xs transition-colors" style={{ color: 'var(--text-secondary)' }}>Read &rarr;</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <UploadModal
                    onClose={() => setShowUploadModal(false)}
                    onUploadFile={() => fileInputRef.current?.click()}
                    onCreate={onCreate}
                />
            )}

            {/* Preview Modal */}
            {previewArticle && (
                <PreviewModal
                    article={previewArticle}
                    onClose={() => setPreviewArticle(null)}
                />
            )}

            {/* Rename Modal */}
            {renameTarget && (
                <InputModal
                    title="Rename Article"
                    message="Enter a new title for this article:"
                    placeholder="Article title"
                    defaultValue={renameTarget.title}
                    confirmText="Rename"
                    cancelText="Cancel"
                    onConfirm={handleConfirmRename}
                    onCancel={() => setRenameTarget(null)}
                />
            )}
        </>
    );
};
