import React, { useState, useEffect } from 'react';
import { SentencePair, AppSettings, PracticeMode } from '../../types';
import { fetchSentenceSummary, fetchSentenceById, fetchSentences, SentenceSummary } from '../../utils/sentenceLoader';
import { BottomTabBar } from '../../components/mobile/BottomTabBar';
import { MobileHeader } from '../../components/mobile/MobileHeader';
import { MobileGreetingOverlay } from '../../components/mobile/MobileGreetingOverlay';
import { MobileModeSelector } from '../../components/mobile/MobileModeSelector';
import { MobileHome } from './MobileHome';
import { MobilePractice } from './MobilePractice';
import { MobileSettings } from './MobileSettings';
import { MobileHistory } from './MobileHistory';

export type MobileTab = 'home' | 'practice' | 'history' | 'settings';

interface MobileAppProps {
  appSettings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

/**
 * MobileApp - Root component for mobile UI
 *
 * Architecture:
 * - Bottom tab navigation (iOS-style)
 * - Three main views: Home (list), Practice (swipe cards), Settings
 * - Uses mobile-optimized summary API for fast list loading
 * - Full sentence details fetched on-demand when practicing
 */
export const MobileApp: React.FC<MobileAppProps> = ({
  appSettings,
  onUpdateSettings,
  theme,
  onToggleTheme,
}) => {
  // Navigation state
  const [activeTab, setActiveTab] = useState<MobileTab>('home');

  // Greeting and mode selector state
  const [showGreeting, setShowGreeting] = useState(true);
  const [showModeSelector, setShowModeSelector] = useState(false);

  // Data state
  const [summaries, setSummaries] = useState<SentenceSummary[]>([]);
  const [selectedSentence, setSelectedSentence] = useState<SentencePair | null>(null);
  const [practiceQueue, setPracticeQueue] = useState<string[]>([]); // IDs for practice
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Practice mode
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('EN_TO_ZH');

  // History tab: full sentences data (lazy loaded)
  const [fullSentences, setFullSentences] = useState<SentencePair[]>([]);
  const [isLoadingFullSentences, setIsLoadingFullSentences] = useState(false);

  // Load sentence summaries on mount
  useEffect(() => {
    const loadSummaries = async () => {
      setIsLoading(true);
      const response = await fetchSentenceSummary();
      if (response.success) {
        setSummaries(response.data);
      }
      setIsLoading(false);
    };
    loadSummaries();
  }, []);

  // Lazy load full sentences when history tab is first accessed
  useEffect(() => {
    if (activeTab === 'history' && fullSentences.length === 0 && !isLoadingFullSentences) {
      const loadFullSentences = async () => {
        setIsLoadingFullSentences(true);
        const sentences = await fetchSentences();
        setFullSentences(sentences);
        setIsLoadingFullSentences(false);
      };
      loadFullSentences();
    }
  }, [activeTab, fullSentences.length, isLoadingFullSentences]);

  // Handle sentence selection from home view
  const handleSelectSentence = async (id: string) => {
    const response = await fetchSentenceById(id);
    if (response.success && response.data) {
      setSelectedSentence(response.data);
      // Set up practice queue with this sentence and subsequent ones
      const startIndex = summaries.findIndex(s => s.id === id);
      const queue = summaries.slice(startIndex).map(s => s.id);
      setPracticeQueue(queue);
      setPracticeIndex(0);
      setActiveTab('practice');
    }
  };

  // Handle starting practice from a group
  const handleStartPractice = (sentenceIds: string[]) => {
    if (sentenceIds.length === 0) return;
    setPracticeQueue(sentenceIds);
    setPracticeIndex(0);
    // Load first sentence
    loadSentenceForPractice(sentenceIds[0]);
    setActiveTab('practice');
  };

  // Load a sentence for practice
  const loadSentenceForPractice = async (id: string) => {
    const response = await fetchSentenceById(id);
    if (response.success && response.data) {
      setSelectedSentence(response.data);
    }
  };

  // Navigate to next/previous sentence in practice
  const handlePracticeNav = async (direction: 'next' | 'prev') => {
    const newIndex = direction === 'next' ? practiceIndex + 1 : practiceIndex - 1;
    if (newIndex >= 0 && newIndex < practiceQueue.length) {
      setPracticeIndex(newIndex);
      await loadSentenceForPractice(practiceQueue[newIndex]);
    }
  };

  // Update sentence after practice submission
  const handleSentenceUpdate = (updatedSentence: SentencePair) => {
    setSelectedSentence(updatedSentence);
    // Update summary list to reflect changes
    setSummaries(prev => prev.map(s =>
      s.id === updatedSentence.id
        ? {
            ...s,
            hasUserTranslation: !!(updatedSentence.userTranslationZh || updatedSentence.userTranslationEn),
            lastPracticed: updatedSentence.lastPracticed,
          }
        : s
    ));
    // Also update fullSentences if loaded (for history view sync)
    if (fullSentences.length > 0) {
      setFullSentences(prev => prev.map(s =>
        s.id === updatedSentence.id ? updatedSentence : s
      ));
    }
  };

  // Go back to home from practice
  const handleBackToHome = () => {
    setActiveTab('home');
    setSelectedSentence(null);
  };

  // Handle greeting dismiss - transition to mode selector
  const handleGreetingDismiss = () => {
    setShowGreeting(false);
    setShowModeSelector(true);
  };

  // Fisher-Yates shuffle algorithm
  function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Handle random mode selection
  const handleRandomMode = () => {
    if (summaries.length === 0) return;
    const shuffledIds = shuffleArray(summaries.map(s => s.id));
    handleStartPractice(shuffledIds);
    setShowModeSelector(false);
  };

  // Render header based on active tab
  const renderHeader = () => {
    switch (activeTab) {
      case 'home':
        return <MobileHeader title="Aether Translate" />;
      case 'practice':
        return (
          <MobileHeader
            title={`${practiceIndex + 1} / ${practiceQueue.length}`}
            showBack
            onBack={handleBackToHome}
            rightContent={
              <button
                onClick={() => setPracticeMode(m => m === 'EN_TO_ZH' ? 'ZH_TO_EN' : 'EN_TO_ZH')}
                className="text-sm px-3 py-1 rounded-full"
                style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-main)' }}
              >
                {practiceMode === 'EN_TO_ZH' ? 'EN → 中' : '中 → EN'}
              </button>
            }
          />
        );
      case 'settings':
        return <MobileHeader title="Settings" />;
      case 'history':
        return <MobileHeader title="练习历史" />;
      default:
        return null;
    }
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <MobileHome
            summaries={summaries}
            isLoading={isLoading}
            onSelectSentence={handleSelectSentence}
            onStartPractice={handleStartPractice}
          />
        );
      case 'practice':
        return selectedSentence ? (
          <MobilePractice
            sentence={selectedSentence}
            mode={practiceMode}
            currentIndex={practiceIndex}
            totalCount={practiceQueue.length}
            onNext={() => handlePracticeNav('next')}
            onPrev={() => handlePracticeNav('prev')}
            onUpdate={handleSentenceUpdate}
            appSettings={appSettings}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p style={{ color: 'var(--text-secondary)' }}>Select a sentence to practice</p>
          </div>
        );
      case 'settings':
        return (
          <MobileSettings
            settings={appSettings}
            onUpdate={onUpdateSettings}
            theme={theme}
            onToggleTheme={onToggleTheme}
          />
        );
      case 'history':
        return (
          <MobileHistory
            sentences={fullSentences}
            isLoading={isLoadingFullSentences}
            onNavigateToSentence={handleSelectSentence}
          />
        );
      default:
        return null;
    }
  };

  // Calculate unpracticed count for badge
  const unpracticedCount = summaries.filter(s => !s.hasUserTranslation).length;

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden"
      style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
    >
      {/* Greeting overlay - shown on app open */}
      {showGreeting && (
        <MobileGreetingOverlay
          userName={appSettings.userName}
          greetingPrompt={appSettings.greetingPrompt}
          onDismiss={handleGreetingDismiss}
        />
      )}

      {/* Mode selector - shown after greeting dismissed */}
      {showModeSelector && (
        <MobileModeSelector
          onSelectRandomMode={handleRandomMode}
          totalSentenceCount={summaries.length}
          isLoading={isLoading}
        />
      )}

      {/* Normal content - only interactive after overlays are hidden */}
      {!showGreeting && !showModeSelector && (
        <>
          {/* Header - fixed at top */}
          {renderHeader()}

          {/* Content area - scrollable */}
          <main className="flex-1 overflow-auto pb-20">
            {renderContent()}
          </main>

          {/* Bottom Tab Bar - fixed at bottom */}
          <BottomTabBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            practiceBadge={unpracticedCount > 0 ? unpracticedCount : undefined}
          />
        </>
      )}
    </div>
  );
};
