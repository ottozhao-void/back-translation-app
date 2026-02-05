import React, { useState } from 'react';
import { Article } from '../../types';
import { XMarkIcon } from '../Icons';

interface ImportArticleModalProps {
  articles: Article[];
  onClose: () => void;
  onImport: (article: Article) => Promise<void>;
}

export const ImportArticleModal: React.FC<ImportArticleModalProps> = ({ articles, onClose, onImport }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!selectedId) return;
    const article = articles.find(a => a.id === selectedId);
    if (!article) return;

    setIsImporting(true);
    await onImport(article);
    setIsImporting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-2xl max-h-[80vh] glass-panel rounded-2xl shadow-2xl animate-[float_0.3s_ease-out] overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-main)' }}
      >
        {/* Header */}
        <div className="h-16 border-b border-[var(--glass-border)] flex items-center justify-between px-6 flex-shrink-0">
          <h3 className="text-lg font-medium" style={{ color: 'var(--text-main)' }}>
            Import from Article
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--surface-hover)] transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <XMarkIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {articles.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
              <p>No articles available to import.</p>
              <p className="text-sm mt-2">Upload articles first in the Articles section.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Select an article to import its sentences:
              </p>
              {articles.map(article => (
                <button
                  key={article.id}
                  onClick={() => setSelectedId(article.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedId === article.id
                      ? 'border-[var(--text-main)] bg-[var(--surface-active)]'
                      : 'border-[var(--glass-border)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <div className="font-medium" style={{ color: 'var(--text-main)' }}>
                    {article.title}
                  </div>
                  <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {article.content.length} paragraphs • {article.category}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--glass-border)] flex justify-end gap-4 bg-[var(--surface-hover)]/10 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--text-main)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!selectedId || isImporting}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all shadow-lg ${
              selectedId && !isImporting
                ? 'hover:shadow-xl transform hover:-translate-y-0.5'
                : 'opacity-50 cursor-not-allowed'
            }`}
            style={{
              backgroundColor: selectedId ? 'var(--text-main)' : 'var(--surface-hover)',
              color: selectedId ? 'var(--bg-main)' : 'var(--text-secondary)'
            }}
          >
            {isImporting ? 'Importing...' : 'Import Sentences'}
          </button>
        </div>
      </div>
    </div>
  );
};
