import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SentencePair, PracticeMode, UserTranslation, AppSettings, Article, PracticeStats, SidebarDisplayMode } from '../types';
import { fetchSentences, saveSentences, migrateAllSentences } from '../utils/sentenceLoader';
import { migrateArticlesToSentences, shouldMigrate } from '../utils/migration';
import { SentenceSidebar, ContextFilter } from '../components/sentence-mode/SentenceSidebar';
import { SentencePracticeArea } from '../components/sentence-mode/SentencePracticeArea';
import { SentenceDetailView } from '../components/sentence-mode/SentenceDetailView';
import { ImportModal } from '../components/sentence-mode/ImportModal';
import { SidebarCollapseIcon, SidebarExpandIcon, HomeIcon } from '../components/Icons';
import { AVAILABLE_COMMANDS } from '../constants';
import { ToastContainer, useToast } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/Skeleton';
import { GreetingDisplay } from '../components/GreetingDisplay';

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
  onSelectionChange?: (hasSelection: boolean) => void;
  shouldClearSelection?: boolean;
}

export const SentenceMode: React.FC<SentenceModeProps> = ({ articles, appSettings, onSelectionChange, shouldClearSelection }) => {
  const [sentences, setSentences] = useState<SentencePair[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('EN_TO_ZH');
  const [isLoading, setIsLoading] = useState(true);

  // Notify parent when selection changes
  useEffect(() => {
    onSelectionChange?.(selectedId !== null);
  }, [selectedId, onSelectionChange]);

  // Clear selection when parent requests it
  useEffect(() => {
    if (shouldClearSelection) {
      setSelectedId(null);
    }
  }, [shouldClearSelection]);

  // View mode: 'detail' shows SentenceDetailView, 'practice' shows SentencePracticeArea
  const [viewMode, setViewMode] = useState<'detail' | 'practice'>('detail');

  // Context filter for sidebar (paragraph/article filtering)
  const [contextFilter, setContextFilter] = useState<ContextFilter | null>(null);

  // Sidebar display mode (flat, by-article, by-paragraph)
  const [sidebarDisplayMode, setSidebarDisplayMode] = useState<SidebarDisplayMode>('flat');

  // Modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Toast and soft delete states
  const { toasts, dismissToast, showSuccess, showError } = useToast();
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<SentencePair | null>(null);
  const pendingDeletesRef = useRef<Map<string, { sentence: SentencePair; timeoutId: NodeJS.Timeout }>>(new Map());

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

        // Migrate legacy data format to new hierarchical format
        const needsMigration = data.some(s =>
          !['article', 'paragraph', 'sentence'].includes(s.sourceType)
        );
        if (needsMigration) {
          console.log('Migrating legacy sentence data to new format...');
          data = migrateAllSentences(data);
          await saveSentences(data);
          console.log('Migration complete');
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

  // Handle sentence selection - reset to detail view
  const handleSelectSentence = (id: string) => {
    setSelectedId(id);
    setViewMode('detail'); // Always show detail view when selecting a new sentence
  };

  // Handle starting practice from detail view
  const handleStartPractice = useCallback(() => {
    setViewMode('practice');
  }, []);

  // Handle returning to detail view from practice
  const handleBackToDetail = useCallback(() => {
    setViewMode('detail');
  }, []);

  // Handle context filter - show paragraph or article sentences
  const handleShowParagraphContext = useCallback(() => {
    const sentence = sentences.find(s => s.id === selectedId);
    if (sentence?.paragraphId) {
      setContextFilter({
        type: 'paragraph',
        id: sentence.paragraphId,
        label: 'Paragraph Context',
      });
    }
  }, [sentences, selectedId]);

  const handleShowArticleContext = useCallback(() => {
    const sentence = sentences.find(s => s.id === selectedId);
    if (sentence?.articleId) {
      setContextFilter({
        type: 'article',
        id: sentence.articleId,
        label: 'Article Context',
      });
    }
  }, [sentences, selectedId]);

  const handleClearContextFilter = useCallback(() => {
    setContextFilter(null);
  }, []);

  // Handle mode toggle
  const handleModeToggle = () => {
    setPracticeMode(prev => prev === 'EN_TO_ZH' ? 'ZH_TO_EN' : 'EN_TO_ZH');
  };

  // Handle translation submit - with practice stats tracking
  const handleSubmit = async (sentenceId: string, translation: UserTranslation, durationMs?: number) => {
    setSentences(prev => {
      const updated = prev.map(s => {
        if (s.id !== sentenceId) return s;

        const now = Date.now();
        const updatedSentence = { ...s, lastPracticed: now };

        // Update translation
        if (practiceMode === 'EN_TO_ZH') {
          updatedSentence.userTranslationZh = translation;
        } else {
          updatedSentence.userTranslationEn = translation;
        }

        // Update practice stats if this is a real submission (not draft)
        if (translation.type !== 'draft' && durationMs && durationMs > 0) {
          const existingStats = s.practiceStats || {
            attempts: 0,
            totalTimeMs: 0,
          };

          const newStats: PracticeStats = {
            attempts: existingStats.attempts + 1,
            totalTimeMs: existingStats.totalTimeMs + durationMs,
            lastAttemptMs: durationMs,
            lastPracticedAt: now,
            bestTimeMs: existingStats.bestTimeMs
              ? Math.min(existingStats.bestTimeMs, durationMs)
              : durationMs,
          };

          updatedSentence.practiceStats = newStats;
        }

        return updatedSentence;
      });

      // Persist to server
      saveSentences(updated);
      return updated;
    });

    // Return to detail view after submission (if not a draft)
    if (translation.type !== 'draft') {
      setViewMode('detail');
    }
  };

  // Handle import success - add new sentences to state
  const handleImportSuccess = (newSentences: SentencePair[]) => {
    setSentences(prev => [...prev, ...newSentences]);
  };

  // Handle deleting a sentence - with soft delete and undo
  const handleDeleteSentence = useCallback((id: string) => {
    const sentenceToDelete = sentences.find(s => s.id === id);
    if (!sentenceToDelete) return;

    // Create timeout for permanent deletion
    const timeoutId = setTimeout(() => {
      setSentences(prev => {
        const updated = prev.filter(s => s.id !== id);
        saveSentences(updated);
        return updated;
      });
      pendingDeletesRef.current.delete(id);
    }, 5000);

    // Store pending delete
    pendingDeletesRef.current.set(id, { sentence: sentenceToDelete, timeoutId });

    // Optimistically remove from UI
    setSentences(prev => prev.filter(s => s.id !== id));

    // Clear selection if deleted sentence was selected
    if (selectedId === id) {
      setSelectedId(null);
    }

    // Show toast with undo action
    const previewText = sentenceToDelete.en.slice(0, 30) + (sentenceToDelete.en.length > 30 ? '...' : '');
    showSuccess(`"${previewText}" deleted`, {
      label: 'Undo',
      onClick: () => {
        // Cancel the deletion
        const pending = pendingDeletesRef.current.get(id);
        if (pending) {
          clearTimeout(pending.timeoutId);
          pendingDeletesRef.current.delete(id);
          // Restore the sentence
          setSentences(prev => [...prev, pending.sentence]);
          showSuccess('Sentence restored');
        }
      }
    });
  }, [sentences, selectedId, showSuccess]);

  // Cleanup pending deletes on unmount
  useEffect(() => {
    return () => {
      pendingDeletesRef.current.forEach(({ timeoutId }) => {
        clearTimeout(timeoutId);
      });
    };
  }, []);

  // Handle updating a sentence (for editing EN/ZH text)
  const handleUpdateSentence = useCallback(async (id: string, updates: Partial<SentencePair>) => {
    setSentences(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, ...updates } : s);
      saveSentences(updated);
      return updated;
    });
  }, []);

  if (isLoading) {
    return <LoadingSpinner text="Loading sentences..." />;
  }

  return (
    <div className="flex h-full">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Sidebar */}
      <SentenceSidebar
        sentences={sentences}
        selectedId={selectedId}
        practiceMode={practiceMode}
        onSelectSentence={handleSelectSentence}
        onImport={() => setShowImportModal(true)}
        onDeleteSentence={handleDeleteSentence}
        isCollapsed={sidebarCollapsed}
        contextFilter={contextFilter}
        onClearContextFilter={handleClearContextFilter}
        onSetContextFilter={setContextFilter}
        displayMode={sidebarDisplayMode}
        onDisplayModeChange={setSidebarDisplayMode}
      />

      {/* Sidebar Toggle Button - Small icon aligned with header */}
      <button
        onClick={toggleSidebar}
        className="flex-shrink-0 w-5 h-10 flex items-center justify-center hover:bg-[var(--surface-hover)] transition-colors rounded-r group self-start mt-4"
        title={sidebarCollapsed ? 'Expand Sidebar (⌘B)' : 'Collapse Sidebar (⌘B)'}
        style={{ backgroundColor: 'transparent' }}
      >
        <div
          className="opacity-40 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-secondary)' }}
        >
          {sidebarCollapsed ? <SidebarExpandIcon /> : <SidebarCollapseIcon />}
        </div>
      </button>

      {/* Main Content Area - Detail View or Practice Area */}
      {currentSentence ? (
        <div className="flex-1 flex flex-col">
          {/* Content */}
          {viewMode === 'detail' ? (
            <SentenceDetailView
              sentence={currentSentence}
              practiceMode={practiceMode}
              allSentences={sentences}
              onStartPractice={handleStartPractice}
              onShowParagraphContext={handleShowParagraphContext}
              onShowArticleContext={handleShowArticleContext}
              onModeToggle={handleModeToggle}
              onUpdateSentence={handleUpdateSentence}
              hideReferenceInDetailView={appSettings.hideReferenceInDetailView ?? true}
            />
          ) : (
            <SentencePracticeArea
              sentence={currentSentence}
              practiceMode={practiceMode}
              onModeToggle={handleModeToggle}
              onSubmit={handleSubmit}
              appSettings={appSettings}
              onBack={handleBackToDetail}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <GreetingDisplay
            userName={appSettings.userName}
            greetingPrompt={appSettings.greetingPrompt}
            className="px-8"
          />
        </div>
      )}

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
