import React, { useState, useRef } from 'react';
import { Article } from '../types';
import { UploadIcon, EyeIcon, PencilIcon, TrashIcon } from '../components/Icons';
import { UploadModal } from '../components/UploadModal';
import { PreviewModal } from '../components/PreviewModal';

interface ArticleListProps {
    articles: Article[];
    onSelect: (a: Article) => void;
    onUpload: (content: string, filename: string) => void;
    onCreate: (title: string, content: string) => void;
    onDelete: (id: string) => void;
    onRename: (id: string, newTitle: string) => void;
}

export const ArticleList: React.FC<ArticleListProps> = ({ articles, onSelect, onUpload, onCreate, onDelete, onRename }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewArticle, setPreviewArticle] = useState<Article | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            // Validate Format
            if (!text.includes('# 英文原文') || !text.includes('# 中文原文')) {
                alert("格式错误：文章必须包含 '# 英文原文' 和 '# 中文原文' 两个标题。\nFormat Error: File must contain '# 英文原文' and '# 中文原文' sections.");
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }

            onUpload(text, file.name);
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this article?")) {
            onDelete(id);
        }
    };

    const handleRenameClick = (e: React.MouseEvent, article: Article) => {
        e.stopPropagation();
        const newTitle = window.prompt("Enter new title:", article.title);
        if (newTitle && newTitle.trim() !== "" && newTitle !== article.title) {
            onRename(article.id, newTitle.trim());
        }
    };

    const handlePreviewClick = (e: React.MouseEvent, article: Article) => {
        e.stopPropagation();
        setPreviewArticle(article);
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-10 pb-20 fade-in max-w-7xl mx-auto">
                {/* Upload Card */}
                <div
                    onClick={() => setShowUploadModal(true)}
                    className="group glass-panel rounded-xl overflow-hidden cursor-pointer transition-all duration-500 border-dashed border-2 flex flex-col items-center justify-center h-full min-h-[300px] gap-4"
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

                {articles.map((article, idx) => (
                    <div
                        key={article.id}
                        onClick={() => onSelect(article)}
                        className="group glass-panel rounded-xl overflow-hidden cursor-pointer hover:transform hover:-translate-y-2 transition-all duration-500 shadow-lg hover:shadow-2xl relative"
                        style={{ animationDelay: `${idx * 100}ms` }}
                    >
                        <div className="h-48 overflow-hidden relative">
                            <div className="absolute inset-0 transition-colors duration-500 z-10" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }} />
                            <img
                                src={article.coverImage}
                                alt={article.title}
                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                            />
                            {/* Action Buttons Overlay */}
                            <div className="absolute top-2 right-2 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <button
                                    onClick={(e) => handlePreviewClick(e, article)}
                                    className="p-2 rounded-full backdrop-blur-md transition-all"
                                    style={{ backgroundColor: 'var(--glass-bg)', color: 'var(--text-main)', border: '1px solid var(--border-high-contrast)' }}
                                    title="Preview"
                                >
                                    <EyeIcon />
                                </button>
                                <button
                                    onClick={(e) => handleRenameClick(e, article)}
                                    className="p-2 rounded-full backdrop-blur-md transition-all"
                                    style={{ backgroundColor: 'var(--glass-bg)', color: 'var(--text-main)', border: '1px solid var(--border-high-contrast)' }}
                                    title="Rename"
                                >
                                    <PencilIcon />
                                </button>
                                <button
                                    onClick={(e) => handleDeleteClick(e, article.id)}
                                    className="p-2 rounded-full backdrop-blur-md hover:bg-red-900/70 transition-all"
                                    style={{ backgroundColor: 'var(--glass-bg)', color: 'var(--text-main)', border: '1px solid var(--border-high-contrast)' }}
                                    title="Delete"
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="text-xs font-mono text-blue-400 mb-2 uppercase tracking-wider">{article.category}</div>
                            <h2 className="text-xl font-serif-sc font-medium mb-2 line-clamp-2" style={{ color: 'var(--text-main)' }}>{article.title}</h2>
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
        </>
    );
};
