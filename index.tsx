import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Article, PracticeMode, UserTranslation, AppSettings } from './types';
import { fetchArticles, parseMarkdownArticle, saveArticleToServer, deleteArticleFromServer, renameArticleOnServer, serializeArticle } from './utils/articleLoader';

// Components
import { SettingsIcon, SunIcon, MoonIcon, HomeIcon } from './components/Icons';
import { SettingsModal } from './components/SettingsModal';
import { LoadingSpinner } from './components/Skeleton';

// Views
import { ArticleList } from './views/ArticleList';
import { ModeSelector } from './views/ModeSelector';
import { PracticeSession } from './views/PracticeSession';
import { SentenceMode } from './views/SentenceMode';

// Mobile
import { useDeviceType } from './hooks/useDeviceType';
import { MobileApp } from './views/mobile/MobileApp';

// --- Types for App State ---
type ViewState = 'HOME' | 'MODE_SELECT' | 'PRACTICE';

// --- Main App Component ---
const App: React.FC = () => {
  const { isMobile } = useDeviceType();
  const [view, setView] = useState<ViewState>('HOME');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('EN_TO_ZH');

  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [hasSelectedSentence, setHasSelectedSentence] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('appSettings');
      if (saved) return JSON.parse(saved);

      // Migration
      const old = localStorage.getItem('autoSaveSettings');
      if (old) {
        return { autoSave: JSON.parse(old), llmThreshold: 85, hotkeys: {} };
      }
    }
    return { autoSave: { enabled: true, delay: 3000 }, llmThreshold: 85, hotkeys: {}, practiceGranularity: 'sentence' };
  });

  const updateAppSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    localStorage.setItem('appSettings', JSON.stringify(newSettings));
  };

  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') as 'dark' | 'light' || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Load content (Server only)
  useEffect(() => {
    const loadContent = async () => {
      try {
        // 1. Fetch articles from server (now includes user translations if saved)
        const serverArticles = await fetchArticles();
        setArticles(serverArticles);
      } catch (e) {
        console.error("Failed to load articles", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadContent();
  }, []);

  const handleArticleSelect = (article: Article) => {
    setSelectedArticle(article);
    setView('MODE_SELECT');
  };

  const handleArticleUpload = async (fileContent: string, filename: string) => {
    // Parse first to get the object structure (handles MD parsing)
    const article = parseMarkdownArticle(fileContent, filename);

    // Serialize to JSON
    const jsonContent = serializeArticle(article);

    // Change extension to .json
    const jsonFilename = filename.replace(/\.(md|txt)$/i, '') + '.json';

    const success = await saveArticleToServer(jsonFilename, jsonContent);
    if (success) {
      const newArticle = { ...article, id: jsonFilename };
      setArticles(prev => [newArticle, ...prev]);
    } else {
      alert("Failed to save article to server.");
    }
  };

  const handleArticleCreate = async (title: string, content: string) => {
    // Generate filename from title
    const safeTitle = title.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_').toLowerCase();
    const filename = `${Date.now()}_${safeTitle}.json`;

    const article = parseMarkdownArticle(content, filename);
    article.title = title; // Override title

    const jsonContent = serializeArticle(article);

    const success = await saveArticleToServer(filename, jsonContent);
    if (success) {
      const newArticle = { ...article, id: filename };
      setArticles(prev => [newArticle, ...prev]);
    } else {
      alert("Failed to save article to server.");
    }
  };

  const handleArticleDelete = async (articleId: string) => {
    const success = await deleteArticleFromServer(articleId);
    if (success) {
      setArticles(prev => prev.filter(a => a.id !== articleId));
    } else {
      alert("Failed to delete article from server.");
    }
  };

  const handleArticleRename = async (articleId: string, newTitle: string) => {
    // Generate new filename
    const safeTitle = newTitle.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_').toLowerCase();
    const newFilename = `${Date.now()}_${safeTitle}.json`;

    // Rename on server
    const success = await renameArticleOnServer(articleId, newFilename);

    if (success) {
      // Update local state
      setArticles(prev => prev.map(a => {
        if (a.id === articleId) {
          return { ...a, id: newFilename, title: newTitle };
        }
        return a;
      }));

      // Update content on server (to save new title in JSON)
      const article = articles.find(a => a.id === articleId);
      if (article) {
        const updatedArticle = { ...article, id: newFilename, title: newTitle };
        const content = serializeArticle(updatedArticle);
        await saveArticleToServer(newFilename, content);
      }
    } else {
      alert("Failed to rename article on server.");
    }
  };

  const addReferenceTranslation = async (articleId: string, paragraphId: string, text: string, targetLang: 'en' | 'zh') => {
    const articleIndex = articles.findIndex(a => a.id === articleId);
    if (articleIndex === -1) return;

    const article = articles[articleIndex];
    let updatedArticle: Article = { ...article };

    updatedArticle.content = article.content.map(p => {
      if (p.id !== paragraphId) return p;
      if (targetLang === 'zh') {
        return { ...p, zh: [...p.zh, text] };
      } else {
        return { ...p, en: [...p.en, text] };
      }
    });

    setArticles(prev => {
      const newArr = [...prev];
      newArr[articleIndex] = updatedArticle;
      return newArr;
    });

    const fileContent = serializeArticle(updatedArticle);
    let filename = articleId;
    if (filename.endsWith('.md')) {
      filename = filename.replace(/\.md$/, '.json');
    } else if (!filename.endsWith('.json')) {
      filename += '.json';
    }
    await saveArticleToServer(filename, fileContent);
  };

  const startPractice = (mode: PracticeMode) => {
    setPracticeMode(mode);
    setView('PRACTICE');
  };

  const goHome = () => {
    setView('HOME');
    setSelectedArticle(null);
  };

  const updateArticleProgress = async (articleId: string, paragraphId: string, newTranslation: UserTranslation) => {
    // Find the article in current state
    const articleIndex = articles.findIndex(a => a.id === articleId);
    if (articleIndex === -1) return;

    const article = articles[articleIndex];
    let updatedArticle: Article = { ...article };
    let hasChanges = false;

    updatedArticle.content = article.content.map(p => {
      if (p.id !== paragraphId) return p;

      // Get existing translation
      const existingTranslation = practiceMode === 'EN_TO_ZH' ? p.userTranslationZh : p.userTranslationEn;

      let finalTranslation = newTranslation;

      if (existingTranslation) {
        const isTextSame = existingTranslation.text === newTranslation.text;
        const isScoreSame = existingTranslation.score === newTranslation.score;
        const isTypeSame = existingTranslation.type === newTranslation.type;

        if (isTextSame && isScoreSame && isTypeSame) {
          // 1. Consistent text, score and type -> No operation
          return p;
        }

        if (isTextSame && (!isScoreSame || !isTypeSame)) {
          // 2. Text same, score or type changed -> Update metadata of this submission.
          hasChanges = true;
          finalTranslation = {
            ...existingTranslation,
            type: newTranslation.type,
            score: newTranslation.score,
            // Keep original timestamp and history
            history: existingTranslation.history
          };
        }

        if (!isTextSame) {
          // 3. Text different -> Create new record.
          hasChanges = true;

          let newHistory = existingTranslation.history || [];

          // Only add existing translation to history if it is NOT a draft
          if (existingTranslation.type !== 'draft') {
            const oldRecord = {
              type: existingTranslation.type,
              text: existingTranslation.text,
              timestamp: existingTranslation.timestamp,
              score: existingTranslation.score
            };
            newHistory = [...newHistory, oldRecord];
          }

          finalTranslation = {
            ...newTranslation,
            history: newHistory
          };
        }
      } else {
        hasChanges = true;
      }

      const newP = { ...p, lastPracticed: Date.now() };
      if (practiceMode === 'EN_TO_ZH') {
        newP.userTranslationZh = finalTranslation;
      } else {
        newP.userTranslationEn = finalTranslation;
      }
      return newP;
    });

    if (!hasChanges) return;

    // Update State
    setArticles(prev => {
      const newArr = [...prev];
      newArr[articleIndex] = updatedArticle;
      return newArr;
    });

    // Persist to Server (File)
    const fileContent = serializeArticle(updatedArticle);
    // Save as JSON
    let filename = articleId;
    if (filename.endsWith('.md')) {
      filename = filename.replace(/\.md$/, '.json');
    } else if (!filename.endsWith('.json')) {
      filename += '.json';
    }
    await saveArticleToServer(filename, fileContent);
  };

  // Render mobile UI for mobile devices
  if (isMobile) {
    return (
      <MobileApp
        appSettings={appSettings}
        onUpdateSettings={updateAppSettings}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // Desktop UI
  return (
    <div className="min-h-screen relative overflow-hidden font-sans selection:bg-[var(--surface-active)]" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none" style={{ backgroundColor: 'var(--particle-blue)' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none" style={{ backgroundColor: 'var(--particle-purple)' }} />

      {/* Navigation - Settings only, Articles button removed */}
      <nav className="absolute z-50 right-6 top-6 flex gap-4">
          {/* Home Button - only show when a sentence is selected */}
          {view === 'HOME' && hasSelectedSentence && (
            <button
              onClick={() => setHasSelectedSentence(false)}
              className="p-2 rounded-full transition-all duration-300 hover:scale-110"
              style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-high-contrast)' }}
              title="Back to Home"
            >
              <HomeIcon />
            </button>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full transition-all duration-300 hover:scale-110"
            style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-high-contrast)' }}
            title="Settings"
          >
            <SettingsIcon />
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full transition-all duration-300 hover:scale-110"
            style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-high-contrast)' }}
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
      </nav>

      <main className="relative z-10 max-w-[1920px] mx-auto px-6 h-[calc(100vh-80px)] pt-16">
        {isLoading ? (
          <LoadingSpinner text="Loading articles..." />
        ) : view === 'HOME' ? (
          <SentenceMode
            articles={articles}
            appSettings={appSettings}
            onSelectionChange={setHasSelectedSentence}
            shouldClearSelection={!hasSelectedSentence}
          />
        ) : view === 'MODE_SELECT' && selectedArticle ? (
          <ModeSelector
            article={selectedArticle}
            onSelectMode={startPractice}
            onBack={goHome}
          />
        ) : view === 'PRACTICE' && selectedArticle ? (
          <PracticeSession
            article={articles.find(a => a.id === selectedArticle.id) || selectedArticle}
            mode={practiceMode}
            onUpdateProgress={updateArticleProgress}
            onAddReference={addReferenceTranslation}
            onBack={goHome}
            appSettings={appSettings}
          />
        ) : null}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={appSettings}
          onUpdate={updateAppSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};



// --- Mount ---
const root = createRoot(document.getElementById('root')!);
root.render(<App />);