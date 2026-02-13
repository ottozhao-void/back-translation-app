import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SentencePair, PracticeMode, UserTranslation, AppSettings, Article, PracticeStats, SidebarDisplayMode, TagInfo, SYSTEM_TAGS, ContextFilter } from '../types';
import { fetchSentences, saveSentences, migrateAllSentences, migrateSubmissionTypes, patchSentence } from '../utils/sentenceLoader';
import { calculatePracticeStats } from '../utils/practiceStats';
import { migrateArticlesToSentences, shouldMigrate } from '../utils/migration';
import { SentenceSidebar } from '../components/sentence-mode/SentenceSidebar';
import { SentencePracticeArea } from '../components/sentence-mode/SentencePracticeArea';
import { FeedbackData } from '../components/common/FeedbackSheet';
import { SentenceDetailView } from '../components/sentence-mode/SentenceDetailView';
import { ImportModal } from '../components/sentence-mode/ImportModal';
import { TagPickerModal } from '../components/sentence-mode/TagPickerModal';
import { HomeIcon } from '../components/Icons';
import { HistoryModal } from '../components/HistoryModal';
import { SearchModal } from '../components/SearchModal';
import { AVAILABLE_COMMANDS } from '../constants';
import { ToastContainer, useToast } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';
import { LoadingSpinner } from '../components/Skeleton';
import { GreetingDisplay } from '../components/GreetingDisplay';
import { VocabularySidebar, VocabularyDetailCard } from '../components/vocabulary';
import { useVocabulary } from '../hooks/useVocabulary';
import { getFilteredSentences, findSentenceIndex } from '../utils/sentenceFilters';
import { SentenceNavBar } from '../components/sentence-mode/SentenceNavBar';

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
  historyModalOpen?: boolean;
  onHistoryModalClose?: () => void;
}

export const SentenceMode: React.FC<SentenceModeProps> = ({ articles, appSettings, onSelectionChange, shouldClearSelection, historyModalOpen, onHistoryModalClose }) => {
  const [sentences, setSentences] = useState<SentencePair[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('EN_TO_ZH');
  const [isLoading, setIsLoading] = useState(true);

  // Tag system state
  const [userTags, setUserTags] = useState<TagInfo[]>([]);
  const [tagPickerSentenceId, setTagPickerSentenceId] = useState<string | null>(null);

  // Fetch user tags on mount
  useEffect(() => {
    const loadUserTags = async () => {
      try {
        const response = await fetch('/api/tags');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUserTags(data.data || []);
          }
        }
      } catch (error) {
        console.error('Failed to load user tags:', error);
      }
    };
    loadUserTags();
  }, []);

  // Toggle a tag on a sentence
  const handleToggleTag = useCallback(async (sentenceId: string, tagId: string) => {
    const sentence = sentences.find(s => s.id === sentenceId);
    if (!sentence) return;

    const currentTags = sentence.tags || [];
    const hasTag = currentTags.includes(tagId);
    const newTags = hasTag
      ? currentTags.filter(t => t !== tagId)
      : [...currentTags, tagId];

    // Optimistically update UI
    setSentences(prev => prev.map(s =>
      s.id === sentenceId ? { ...s, tags: newTags } : s
    ));

    // Persist via PATCH API
    try {
      await patchSentence(sentenceId, { tags: newTags });
    } catch (error) {
      console.error('Failed to update tags:', error);
      // Revert on error
      setSentences(prev => prev.map(s =>
        s.id === sentenceId ? { ...s, tags: currentTags } : s
      ));
    }
  }, [sentences]);

  // Create a new user tag
  const handleCreateTag = useCallback(async (label: string, color?: string): Promise<TagInfo | null> => {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, color }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setUserTags(prev => [...prev, data.data]);
          return data.data;
        }
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
    return null;
  }, []);

  // Open tag picker modal for a sentence
  const handleOpenTagPicker = useCallback((sentenceId: string) => {
    setTagPickerSentenceId(sentenceId);
  }, []);

  // Close tag picker modal
  const handleCloseTagPicker = useCallback(() => {
    setTagPickerSentenceId(null);
  }, []);

  // Get current sentence for tag picker
  const tagPickerSentence = tagPickerSentenceId
    ? sentences.find(s => s.id === tagPickerSentenceId)
    : null;

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

  // Key to force-reset detail view (carousel back to card 0) on every sentence click
  const [detailResetKey, setDetailResetKey] = useState(0);

  // Context filter for sidebar (paragraph/article filtering)
  const [contextFilter, setContextFilter] = useState<ContextFilter | null>(null);

  // Sidebar display mode (flat, by-article, by-paragraph)
  const [sidebarDisplayMode, setSidebarDisplayMode] = useState<SidebarDisplayMode>('flat');

  // Modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Vocabulary system state
  const vocabulary = useVocabulary();
  const [vocabSidebarCollapsed, setVocabSidebarCollapsed] = useState(true); // Collapsed by default
  const [selectedVocabId, setSelectedVocabId] = useState<string | null>(null);

  // Toggle vocabulary sidebar
  const toggleVocabSidebar = useCallback(() => {
    setVocabSidebarCollapsed(prev => !prev);
  }, []);

  // Handle vocabulary item selection
  const handleSelectVocabItem = useCallback((id: string) => {
    setSelectedVocabId(id);
    setSelectedId(null); // Deselect sentence when viewing vocab
  }, []);

  // Handle navigating from vocab detail to sentence
  const handleVocabNavigateToSentence = useCallback((sentenceId: string) => {
    setSelectedVocabId(null);
    setSelectedId(sentenceId);
    setViewMode('detail');
  }, []);

  // Get selected vocabulary item
  const selectedVocabItem = selectedVocabId ? vocabulary.getById(selectedVocabId) : null;

  // Toast and soft delete states
  const { toasts, dismissToast, showSuccess, showError } = useToast();
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<SentencePair | null>(null);
  const pendingDeletesRef = useRef<Map<string, { sentence: SentencePair; timeoutId: NodeJS.Timeout }>>(new Map());

  // Toggle sidebar collapse
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Keyboard shortcuts (configurable via Settings)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }

      // Sentence sidebar toggle
      const toggleSidebarCmd = AVAILABLE_COMMANDS.find(c => c.id === 'toggleSidebar');
      const sidebarHotkey = appSettings.hotkeys?.toggleSidebar ?? toggleSidebarCmd?.default ?? '';
      if (sidebarHotkey && matchesHotkey(e, sidebarHotkey)) {
        e.preventDefault();
        toggleSidebar();
      }

      // Vocabulary sidebar toggle
      const toggleVocabCmd = AVAILABLE_COMMANDS.find(c => c.id === 'toggleVocabSidebar');
      const vocabHotkey = appSettings.hotkeys?.toggleVocabSidebar ?? toggleVocabCmd?.default ?? '';
      if (vocabHotkey && matchesHotkey(e, vocabHotkey)) {
        e.preventDefault();
        toggleVocabSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, toggleVocabSidebar, appSettings.hotkeys]);

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

        // Migrate legacy submission types ('diff', 'llm' -> 'submitted')
        data = migrateSubmissionTypes(data);
        const needsTypeMigration = data.some(s => {
          const checkType = (t?: { type?: string }) => t && (t.type === 'diff' || t.type === 'llm');
          return checkType(s.userTranslationZh) || checkType(s.userTranslationEn);
        });
        if (needsTypeMigration) {
          await saveSentences(data);
          console.log('Submission type migration complete');
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

  // Get filtered sentences (same logic as sidebar)
  const filteredSentences = useMemo(
    () => getFilteredSentences(sentences, contextFilter),
    [sentences, contextFilter],
  );

  // Current index within filtered list
  const currentIndex = useMemo(
    () => findSentenceIndex(filteredSentences, selectedId),
    [filteredSentences, selectedId],
  );

  // Handle sentence selection - reset to detail view
  const handleSelectSentence = (id: string) => {
    setSelectedId(id);
    setSelectedVocabId(null); // Clear vocab selection so SentenceDetailView renders
    setViewMode('detail'); // Always show detail view when selecting a new sentence
    setDetailResetKey(k => k + 1); // Force carousel reset to first card
  };

  // Handle navigation via nav bar - preserve viewMode
  const handleNavSentence = useCallback((direction: 'prev' | 'next') => {
    if (currentIndex === -1) return;

    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex >= 0 && newIndex < filteredSentences.length) {
      const nextId = filteredSentences[newIndex].id;
      setSelectedId(nextId);
      setSelectedVocabId(null);
      // NOTE: Do NOT reset viewMode - preserve practice state
      setDetailResetKey(k => k + 1);
    }
  }, [currentIndex, filteredSentences]);

  // Keyboard navigation for sentence prev/next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }

      // Sentence navigation - next
      const nextCmd = AVAILABLE_COMMANDS.find(c => c.id === 'next');
      const nextHotkey = appSettings.hotkeys?.next ?? nextCmd?.default ?? '';
      if (nextHotkey && matchesHotkey(e, nextHotkey)) {
        e.preventDefault();
        handleNavSentence('next');
      }

      // Sentence navigation - prev
      const prevCmd = AVAILABLE_COMMANDS.find(c => c.id === 'prev');
      const prevHotkey = appSettings.hotkeys?.prev ?? prevCmd?.default ?? '';
      if (prevHotkey && matchesHotkey(e, prevHotkey)) {
        e.preventDefault();
        handleNavSentence('prev');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appSettings.hotkeys, handleNavSentence]);

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

  // Handle opening history modal (internal trigger)
  const handleOpenHistory = useCallback(() => {
    setShowHistoryModal(true);
  }, []);

  // Handle closing history modal
  const handleCloseHistory = useCallback(() => {
    setShowHistoryModal(false);
    onHistoryModalClose?.();
  }, [onHistoryModalClose]);

  // Sync with external history modal state
  useEffect(() => {
    if (historyModalOpen) {
      setShowHistoryModal(true);
    }
  }, [historyModalOpen]);

  // Handle opening search modal
  const handleOpenSearch = useCallback(() => {
    setShowSearchModal(true);
  }, []);

  // Handle navigating to a sentence from history
  const handleNavigateToSentence = useCallback((sentenceId: string) => {
    setSelectedId(sentenceId);
    setViewMode('detail');
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

        // Update practice stats only for submitted translations (not drafts)
        if (translation.type === 'submitted' && durationMs && durationMs > 0) {
          updatedSentence.practiceStats = calculatePracticeStats(s.practiceStats, durationMs, now);
        }

        return updatedSentence;
      });

      // Persist to server
      saveSentences(updated);
      return updated;
    });

    // No automatic view switching - let user stay in practice mode
    // User can navigate back to detail view via the Back button if desired
  };

  // Handle saving AI feedback
  const handleSaveFeedback = (sentenceId: string, feedback: FeedbackData) => {
    setSentences(prev => {
      const updated = prev.map(s => {
        if (s.id !== sentenceId) return s;

        const updatedSentence = { ...s };
        // Determine which translation to update based on current mode
        if (practiceMode === 'EN_TO_ZH') {
           if (updatedSentence.userTranslationZh) {
             updatedSentence.userTranslationZh = {
               ...updatedSentence.userTranslationZh,
               aiFeedback: { ...feedback, generatedAt: Date.now() }
             };
           }
        } else {
           if (updatedSentence.userTranslationEn) {
             updatedSentence.userTranslationEn = {
               ...updatedSentence.userTranslationEn,
               aiFeedback: { ...feedback, generatedAt: Date.now() }
             };
           }
        }
        return updatedSentence;
      });
      
      saveSentences(updated);
      return updated;
    });
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
        onOpenSearch={handleOpenSearch}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        contextFilter={contextFilter}
        onClearContextFilter={handleClearContextFilter}
        onSetContextFilter={setContextFilter}
        displayMode={sidebarDisplayMode}
        onDisplayModeChange={setSidebarDisplayMode}
        allTags={userTags}
        onToggleTag={handleToggleTag}
        onOpenTagPicker={handleOpenTagPicker}
      />

      {/* Main Content Area - Sentence Detail, Vocabulary Detail, or Practice Area */}
      {selectedVocabItem ? (
        <VocabularyDetailCard
          item={selectedVocabItem}
          onUpdate={vocabulary.updateVocabulary}
          onDelete={(id) => {
            vocabulary.deleteVocabulary(id);
            setSelectedVocabId(null);
          }}
          onNavigateToSentence={handleVocabNavigateToSentence}
          onEnrichPending={vocabulary.enrichPending}
        />
      ) : currentSentence ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Content */}
          {viewMode === 'detail' ? (
            <SentenceDetailView
              key={detailResetKey}
              sentence={currentSentence}
              practiceMode={practiceMode}
              allSentences={sentences}
              onStartPractice={handleStartPractice}
              onShowParagraphContext={handleShowParagraphContext}
              onShowArticleContext={handleShowArticleContext}
              onModeToggle={handleModeToggle}
              onUpdateSentence={handleUpdateSentence}
              hideReferenceInDetailView={appSettings.hideReferenceInDetailView ?? true}
              allTags={[...Object.values(SYSTEM_TAGS), ...userTags]}
              onToggleTag={(tagId) => handleToggleTag(currentSentence.id, tagId)}
              onOpenTagPicker={() => handleOpenTagPicker(currentSentence.id)}
              onAddVocabulary={(text, type) => vocabulary.addVocabulary(text, type, currentSentence)}
              onAddPattern={(text, template, explanation) => vocabulary.addPattern(text, template, explanation, currentSentence)}
            />
          ) : (
            <SentencePracticeArea
              sentence={currentSentence}
              practiceMode={practiceMode}
              onModeToggle={handleModeToggle}
              onSubmit={handleSubmit}
              appSettings={appSettings}
              onBack={handleBackToDetail}
              onSaveFeedback={handleSaveFeedback}
            />
          )}

          {/* Navigation Bar */}
          <SentenceNavBar
            currentIndex={currentIndex}
            total={filteredSentences.length}
            onPrev={() => handleNavSentence('prev')}
            onNext={() => handleNavSentence('next')}
          />
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

      {/* Vocabulary Sidebar (Right) */}
      <VocabularySidebar
        items={vocabulary.items}
        selectedId={selectedVocabId}
        onSelectItem={handleSelectVocabItem}
        isCollapsed={vocabSidebarCollapsed}
        onToggleCollapse={toggleVocabSidebar}
      />

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImportSuccess={handleImportSuccess}
        />
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <HistoryModal
          sentences={sentences}
          onClose={handleCloseHistory}
          onNavigateToSentence={handleNavigateToSentence}
        />
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <SearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          sentences={sentences}
          allTags={[...Object.values(SYSTEM_TAGS), ...userTags]}
          onSelectResult={(id) => {
            setSelectedId(id);
            setViewMode('detail');
            setShowSearchModal(false);
          }}
        />
      )}

      {/* Tag Picker Modal */}
      {tagPickerSentence && (
        <TagPickerModal
          isOpen={!!tagPickerSentenceId}
          sentenceId={tagPickerSentenceId!}
          currentTags={tagPickerSentence.tags || []}
          userTags={userTags}
          onToggleTag={(tagId) => handleToggleTag(tagPickerSentenceId!, tagId)}
          onCreateTag={handleCreateTag}
          onClose={handleCloseTagPicker}
        />
      )}
    </div>
  );
};
