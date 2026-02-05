import React, { useState, useEffect } from 'react';
import { SentencePair, PracticeMode, UserTranslation, AppSettings, Article } from '../types';
import { fetchSentences, saveSentences, addSentence, importFromArticle } from '../utils/sentenceLoader';
import { SentenceSidebar } from '../components/sentence-mode/SentenceSidebar';
import { SentencePracticeArea } from '../components/sentence-mode/SentencePracticeArea';
import { AddSentenceModal } from '../components/sentence-mode/AddSentenceModal';
import { ImportArticleModal } from '../components/sentence-mode/ImportArticleModal';

interface SentenceModeProps {
  articles: Article[];
  appSettings: AppSettings;
}

export const SentenceMode: React.FC<SentenceModeProps> = ({ articles, appSettings }) => {
  const [sentences, setSentences] = useState<SentencePair[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('EN_TO_ZH');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Load sentences on mount
  useEffect(() => {
    const loadSentences = async () => {
      try {
        const data = await fetchSentences();
        setSentences(data);
      } catch (error) {
        console.error('Failed to load sentences:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSentences();
  }, []);

  // Get currently selected sentence
  const currentSentence = sentences.find(s => s.id === selectedId) || null;

  // Handle sentence selection
  const handleSelectSentence = (id: string) => {
    setSelectedId(id);
  };

  // Handle mode toggle
  const handleModeToggle = () => {
    setPracticeMode(prev => prev === 'EN_TO_ZH' ? 'ZH_TO_EN' : 'EN_TO_ZH');
  };

  // Handle translation submit
  const handleSubmit = async (sentenceId: string, translation: UserTranslation) => {
    setSentences(prev => {
      const updated = prev.map(s => {
        if (s.id !== sentenceId) return s;

        const updatedSentence = { ...s, lastPracticed: Date.now() };
        if (practiceMode === 'EN_TO_ZH') {
          updatedSentence.userTranslationZh = translation;
        } else {
          updatedSentence.userTranslationEn = translation;
        }
        return updatedSentence;
      });

      // Persist to server
      saveSentences(updated);
      return updated;
    });
  };

  // Handle adding a new sentence
  const handleAddSentence = async (en: string, zh: string) => {
    const newSentence = await addSentence(en, zh);
    if (newSentence) {
      setSentences(prev => [...prev, newSentence]);
      setSelectedId(newSentence.id);
    }
  };

  // Handle importing from article
  const handleImportArticle = async (article: Article) => {
    const imported = await importFromArticle(article);
    if (imported.length > 0) {
      // Merge with existing sentences, avoiding duplicates
      setSentences(prev => {
        const existingIds = new Set(prev.map(s => s.id));
        const newSentences = imported.filter(s => !existingIds.has(s.id));
        const merged = [...prev, ...newSentences];
        saveSentences(merged);
        return merged;
      });
      // Select first imported sentence
      setSelectedId(imported[0].id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl font-light animate-pulse" style={{ color: 'var(--text-secondary)' }}>
          Loading sentences...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <SentenceSidebar
        sentences={sentences}
        selectedId={selectedId}
        practiceMode={practiceMode}
        onSelectSentence={handleSelectSentence}
        onAddSentence={() => setShowAddModal(true)}
        onImportArticle={() => setShowImportModal(true)}
      />

      {/* Practice Area */}
      <SentencePracticeArea
        sentence={currentSentence}
        practiceMode={practiceMode}
        onModeToggle={handleModeToggle}
        onSubmit={handleSubmit}
        appSettings={appSettings}
      />

      {/* Modals */}
      {showAddModal && (
        <AddSentenceModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddSentence}
        />
      )}

      {showImportModal && (
        <ImportArticleModal
          articles={articles}
          onClose={() => setShowImportModal(false)}
          onImport={handleImportArticle}
        />
      )}
    </div>
  );
};
