import React, { useState, useEffect, useCallback } from 'react';
import { SentencePair, PracticeMode, UserTranslation, AppSettings, Article } from '../types';
import { fetchSentences, saveSentences } from '../utils/sentenceLoader';
import { migrateArticlesToSentences, shouldMigrate } from '../utils/migration';
import { SentenceSidebar } from '../components/sentence-mode/SentenceSidebar';
import { SentencePracticeArea } from '../components/sentence-mode/SentencePracticeArea';
import { ImportModal } from '../components/sentence-mode/ImportModal';
import { SidebarCollapseIcon, SidebarExpandIcon } from '../components/Icons';
import { AVAILABLE_COMMANDS } from '../constants';

// Helper to match hotkey
const matchesHotkey = (e: KeyboardEvent, hotkeyString: string): boolean => {
  if (!hotkeyString) return false;

  const parts = hotkeyString.split('+');
  const key = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);

  const hasCtrl = modifiers.includes('Ctrl');
  const hasMeta = modifiers.includes('Meta');
  const hasAlt = modifiers.includes('Alt');
  const hasShift = modifiers.includes('Shift');

  if (hasCtrl !== e.ctrlKey) return false;
  if (hasMeta !== e.metaKey) return false;
  if (hasAlt !== e.altKey) return false;
  if (hasShift !== e.shiftKey) return false;

  const pressedKey = e.key === ' ' ? 'Space' : e.key;
  return pressedKey.toUpperCase() === key.toUpperCase();
};

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
  const [showImportModal, setShowImportModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Toggle sidebar collapse
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Keyboard shortcut for sidebar toggle (configurable via Settings)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }

      const toggleSidebarCmd = AVAILABLE_COMMANDS.find(c => c.id === 'toggleSidebar');
      const hotkeyString = appSettings.hotkeys?.toggleSidebar ?? toggleSidebarCmd?.default ?? '';

      if (hotkeyString && matchesHotkey(e, hotkeyString)) {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, appSettings.hotkeys]);

  // Load sentences on mount, auto-migrate if needed
  useEffect(() => {
    const loadSentences = async () => {
      try {
        let data = await fetchSentences();

        // Auto-migrate if sentences empty but articles exist
        if (shouldMigrate(data.length, articles.length)) {
          console.log('Auto-migrating articles to sentences...');
          const migrated = migrateArticlesToSentences(articles);
          if (migrated.length > 0) {
            await saveSentences(migrated);
            data = migrated;
            console.log(`Migrated ${migrated.length} sentences from ${articles.length} articles`);
          }
        }

        setSentences(data);
      } catch (error) {
        console.error('Failed to load sentences:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSentences();
  }, [articles]);

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

  // Handle import success - add new sentences to state
  const handleImportSuccess = (newSentences: SentencePair[]) => {
    setSentences(prev => [...prev, ...newSentences]);
  };

  // Handle deleting a sentence
  const handleDeleteSentence = (id: string) => {
    setSentences(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveSentences(updated);
      return updated;
    });
    // Clear selection if deleted sentence was selected
    if (selectedId === id) {
      setSelectedId(null);
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
        onImport={() => setShowImportModal(true)}
        onDeleteSentence={handleDeleteSentence}
        isCollapsed={sidebarCollapsed}
      />

      {/* Sidebar Toggle Button - Outside sidebar, on the right edge */}
      <button
        onClick={toggleSidebar}
        className="flex-shrink-0 w-6 flex items-center justify-center hover:bg-[var(--surface-hover)] transition-colors border-r border-[var(--glass-border)] group"
        title={sidebarCollapsed ? 'Expand Sidebar (⌘B)' : 'Collapse Sidebar (⌘B)'}
        style={{ backgroundColor: 'var(--surface-hover)', opacity: 0.5 }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
      >
        <div style={{ color: 'var(--text-secondary)' }}>
          {sidebarCollapsed ? <SidebarExpandIcon /> : <SidebarCollapseIcon />}
        </div>
      </button>

      {/* Practice Area */}
      <SentencePracticeArea
        sentence={currentSentence}
        practiceMode={practiceMode}
        onModeToggle={handleModeToggle}
        onSubmit={handleSubmit}
        appSettings={appSettings}
      />

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImportSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
};
