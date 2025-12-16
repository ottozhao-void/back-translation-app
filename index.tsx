import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Article, PracticeMode, DiffPart, DiffType, Paragraph } from './types';
import { playTextToSpeech } from './services/geminiService';
import { computeDiff } from './utils/diffUtils';
import { fetchArticles, parseArticle, saveArticleToServer, deleteArticleFromServer, serializeArticle } from './utils/articleLoader';

// --- Constants for Persistence ---
const STORAGE_KEYS = {
  UPLOADS: 'aether_uploads_v1',
  DELETED_STATIC: 'aether_deleted_static_v1',
  PROGRESS: 'aether_progress_v1',
};

// --- Icons ---
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const SpeakerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-emerald-400">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const XMarkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
  </svg>
);

// --- Particle Background Component ---
const ParticleBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none z-0">
      <div 
        className="particle-blob absolute w-64 h-64 rounded-full blur-[60px]"
        style={{ top: '10%', left: '10%', animationDelay: '0s', backgroundColor: 'var(--particle-blue)' }} 
      />
      <div 
        className="particle-blob absolute w-48 h-48 rounded-full blur-[50px]"
        style={{ bottom: '20%', right: '10%', animationDelay: '5s', backgroundColor: 'var(--particle-purple)' }} 
      />
       <div 
        className="particle-blob absolute w-32 h-32 rounded-full blur-[40px]"
        style={{ top: '40%', left: '40%', animationDelay: '2s', backgroundColor: 'var(--particle-emerald)' }} 
      />
      <div className="absolute top-1/4 left-1/4 w-1 h-1 rounded-full animate-pulse" style={{ animationDuration: '3s', backgroundColor: 'var(--star-color)' }} />
      <div className="absolute top-3/4 left-1/3 w-1 h-1 rounded-full animate-pulse" style={{ animationDuration: '4s', backgroundColor: 'var(--star-color)' }} />
      <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 rounded-full animate-pulse" style={{ animationDuration: '5s', backgroundColor: 'var(--star-color)' }} />
    </div>
  );
};

// --- Types for App State ---
type ViewState = 'HOME' | 'MODE_SELECT' | 'PRACTICE';

// --- Main App Component ---
const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('HOME');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('EN_TO_ZH'); 
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    const success = await saveArticleToServer(filename, fileContent);
    if (success) {
      const newArticle = parseArticle(fileContent, filename);
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

  const startPractice = (mode: PracticeMode) => {
    setPracticeMode(mode);
    setView('PRACTICE');
  };

  const goHome = () => {
    setView('HOME');
    setSelectedArticle(null);
  };

  const updateArticleProgress = async (articleId: string, paragraphId: string, userTranslation: string) => {
    // 1. Update State
    let updatedArticle: Article | undefined;
    
    setArticles(prev => {
      const newArticles = prev.map(art => {
        if (art.id !== articleId) return art;
        updatedArticle = {
          ...art,
          content: art.content.map(p => {
            if (p.id !== paragraphId) return p;
            const newP = { ...p, lastPracticed: Date.now() };
            if (practiceMode === 'EN_TO_ZH') {
              newP.userTranslationZh = userTranslation;
            } else {
              newP.userTranslationEn = userTranslation;
            }
            return newP;
          })
        };
        return updatedArticle;
      });
      return newArticles;
    });

    // 2. Persist to Server (File)
    if (updatedArticle) {
      const fileContent = serializeArticle(updatedArticle);
      await saveArticleToServer(articleId, fileContent);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans selection:bg-[var(--surface-active)]" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none" style={{ backgroundColor: 'var(--particle-blue)' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none" style={{ backgroundColor: 'var(--particle-purple)' }} />

      {/* Navigation */}
      <nav className="relative z-50 flex justify-center p-6">
        <button 
          onClick={goHome}
          className="text-sm tracking-[0.2em] uppercase font-light hover:text-[var(--text-main)] transition-colors duration-300 border-b border-transparent hover:border-[var(--text-secondary)] pb-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          Articles
        </button>

        <div className="absolute right-6 top-6">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full transition-all duration-300 hover:scale-110"
            style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)' }}
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-[1920px] mx-auto px-6 h-[calc(100vh-80px)]">
        {isLoading && (
          <div className="flex items-center justify-center h-full text-gray-500 font-mono animate-pulse">
            Loading Articles...
          </div>
        )}
        
        {!isLoading && view === 'HOME' && (
          <ArticleList 
            articles={articles} 
            onSelect={handleArticleSelect} 
            onUpload={handleArticleUpload}
            onDelete={handleArticleDelete}
          />
        )}
        {!isLoading && view === 'MODE_SELECT' && selectedArticle && (
          <ModeSelector 
            article={selectedArticle} 
            onSelectMode={startPractice} 
            onBack={goHome} 
          />
        )}
        {!isLoading && view === 'PRACTICE' && selectedArticle && (
          <PracticeSession 
            article={articles.find(a => a.id === selectedArticle.id)!}
            mode={practiceMode}
            onUpdateProgress={updateArticleProgress}
            onBack={() => setView('MODE_SELECT')}
          />
        )}
      </main>
    </div>
  );
};

// --- View: Article List ---
const ArticleList: React.FC<{ 
  articles: Article[], 
  onSelect: (a: Article) => void,
  onUpload: (content: string, filename: string) => void,
  onDelete: (id: string) => void
}> = ({ articles, onSelect, onUpload, onDelete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewArticle, setPreviewArticle] = useState<Article | null>(null);

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

  const handlePreviewClick = (e: React.MouseEvent, article: Article) => {
    e.stopPropagation();
    setPreviewArticle(article);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-10 pb-20 fade-in max-w-7xl mx-auto">
        {/* Upload Card */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="group glass-panel rounded-xl overflow-hidden cursor-pointer transition-all duration-500 border-dashed border-2 flex flex-col items-center justify-center h-full min-h-[300px] gap-4"
          style={{ borderColor: 'var(--glass-border)' }}
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
                  style={{ backgroundColor: 'var(--glass-bg)', color: 'var(--text-main)' }}
                  title="Preview"
                >
                  <EyeIcon />
                </button>
                <button 
                  onClick={(e) => handleDeleteClick(e, article.id)}
                  className="p-2 rounded-full backdrop-blur-md hover:bg-red-900/70 transition-all"
                  style={{ backgroundColor: 'var(--glass-bg)', color: 'var(--text-main)' }}
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

// --- Component: Preview Modal ---
const PreviewModal: React.FC<{ article: Article, onClose: () => void }> = ({ article, onClose }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
      <div 
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-4xl max-h-full glass-panel rounded-2xl flex flex-col shadow-2xl animate-[float_0.3s_ease-out]">
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--glass-border)' }}>
          <h2 className="text-2xl font-serif-sc truncate pr-4" style={{ color: 'var(--text-main)' }}>{article.title}</h2>
          <button 
            onClick={onClose}
            className="transition-colors p-2 rounded-full hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <XMarkIcon />
          </button>
        </div>
        
        <div className="overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
          {article.content.map((p, i) => (
            <div key={p.id} className="flex flex-col md:flex-row gap-4 md:gap-8">
              <div className="flex-1">
                <p className="font-serif-sc leading-relaxed" style={{ color: 'var(--text-main)' }}>{p.en}</p>
              </div>
              <div className="flex-1">
                 <p className="font-serif-sc leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{p.zh}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t flex justify-end" style={{ borderColor: 'var(--glass-border)' }}>
           <button 
             onClick={onClose}
             className="px-4 py-2 rounded-lg text-sm transition-colors"
             style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-main)' }}
           >
             Close
           </button>
        </div>
      </div>
    </div>
  );
};

// --- View: Mode Selector ---
const ModeSelector: React.FC<{ article: Article, onSelectMode: (m: PracticeMode) => void, onBack: () => void }> = ({ article, onSelectMode, onBack }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full fade-in">
      <h2 className="text-3xl font-serif-sc mb-12 text-center max-w-2xl leading-relaxed" style={{ color: 'var(--text-main)' }}>{article.title}</h2>
      <div className="flex gap-8">
        <button 
          onClick={() => onSelectMode('EN_TO_ZH')}
          className="w-64 h-40 glass-panel rounded-2xl flex flex-col items-center justify-center gap-4 transition-all duration-300 group hover:bg-[var(--surface-hover)] hover:border-[var(--glass-border)]"
          style={{ color: 'var(--text-main)' }}
        >
          <span className="text-4xl group-hover:scale-110 transition-transform duration-300">🇬🇧 &rarr; 🇨🇳</span>
          <span className="font-light tracking-wide">English to Chinese</span>
        </button>
        <button 
          onClick={() => onSelectMode('ZH_TO_EN')}
          className="w-64 h-40 glass-panel rounded-2xl flex flex-col items-center justify-center gap-4 transition-all duration-300 group hover:bg-[var(--surface-hover)] hover:border-[var(--glass-border)]"
          style={{ color: 'var(--text-main)' }}
        >
          <span className="text-4xl group-hover:scale-110 transition-transform duration-300">🇨🇳 &rarr; 🇬🇧</span>
          <span className="font-light tracking-wide">Chinese to English</span>
        </button>
      </div>
      <button onClick={onBack} className="mt-12 transition-colors text-sm" style={{ color: 'var(--text-secondary)' }}>
        Back to Articles
      </button>
    </div>
  );
};

// --- View: Practice Session (The Core) ---
const PracticeSession: React.FC<{
  article: Article;
  mode: PracticeMode;
  onUpdateProgress: (aId: string, pId: string, val: string) => void;
  onBack: () => void;
}> = ({ article, mode, onUpdateProgress, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [animDirection, setAnimDirection] = useState(0); // -1 left, 1 right

  const currentParagraph = article.content[currentIndex];
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize input if saved
  useEffect(() => {
    // Reset state for new card
    const savedTranslation = mode === 'EN_TO_ZH' 
      ? currentParagraph.userTranslationZh 
      : currentParagraph.userTranslationEn;
    
    if (savedTranslation) {
      setInputValue(savedTranslation);
      setIsSubmitted(true);
    } else {
      setInputValue('');
      setIsSubmitted(false);
    }
    setShowHint(false);

    // Focus management on card change
    setTimeout(() => {
      if (savedTranslation) {
        // If loaded as submitted, focus container for nav shortcuts
        containerRef.current?.focus();
      } else {
        // If edit mode, focus input
        inputRef.current?.focus();
      }
    }, 500); // Wait for animation
  }, [currentIndex, currentParagraph.id, mode]); // Keep dependency simple

  // Focus container when submitting to ensure shortcuts work
  useEffect(() => {
    if (isSubmitted) {
      containerRef.current?.focus();
    }
  }, [isSubmitted]);

  const handleNext = () => {
    if (currentIndex < article.content.length - 1) {
      setAnimDirection(1);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setAnimDirection(0);
      }, 300); // Wait for exit anim
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setAnimDirection(-1);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        setAnimDirection(0);
      }, 300);
    }
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    setIsSubmitted(true);
    onUpdateProgress(article.id, currentParagraph.id, inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isInput = (e.target as HTMLElement).tagName === 'TEXTAREA';

    // Global: E for Edit (only when submitted)
    if (isSubmitted && (e.key === 'e' || e.key === 'E')) {
      e.preventDefault();
      setIsSubmitted(false);
      setTimeout(() => inputRef.current?.focus(), 10);
      return;
    }

    // Navigation (Arrows)
    // Allowed if: 1. Submitted (no text editing) OR 2. Not in input (unlikely but safe) OR 3. Modifier held
    if (e.key === 'ArrowRight') {
      if (!isInput || isSubmitted || e.ctrlKey || e.metaKey) {
        e.preventDefault();
        handleNext();
        return;
      }
    } else if (e.key === 'ArrowLeft') {
      if (!isInput || isSubmitted || e.ctrlKey || e.metaKey) {
        e.preventDefault();
        handlePrev();
        return;
      }
    }

    // Submit / Action
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isSubmitted) {
        handleSubmit();
      }
    } 
    
    // Hint
    else if (e.key === 'Tab') {
      e.preventDefault();
      setShowHint(prev => !prev);
    }
  };

  // Determine source and target text based on mode
  const sourceText = mode === 'EN_TO_ZH' ? currentParagraph.en : currentParagraph.zh;
  const targetText = mode === 'EN_TO_ZH' ? currentParagraph.zh : currentParagraph.en;
  
  // For Diff
  const diffs = useMemo(() => {
    if (!isSubmitted) return [];
    // If EN_TO_ZH, user types Chinese (use char diff). If ZH_TO_EN, user types English (use word diff).
    const diffMode = mode === 'EN_TO_ZH' ? 'char' : 'word';
    return computeDiff(targetText, inputValue, diffMode);
  }, [isSubmitted, inputValue, targetText, mode]);

  return (
    <div 
      className="flex items-center justify-center h-full w-full relative perspective-1000 outline-none" 
      onKeyDown={handleKeyDown}
      tabIndex={0}
      ref={containerRef}
    >

      {/* Paragraph Selector */}
      <div className="absolute -top-2 left-0 right-0 flex justify-center z-30">
        <div className="flex gap-2 overflow-x-auto max-w-[80vw] px-4 py-2 custom-scrollbar">
          {article.content.map((p, idx) => {
            const isCompleted = mode === 'EN_TO_ZH' 
              ? !!p.userTranslationZh 
              : !!p.userTranslationEn;
            const isCurrent = idx === currentIndex;
            
            return (
              <button
                key={p.id}
                onClick={() => {
                  setAnimDirection(0);
                  setCurrentIndex(idx);
                }}
                className={`
                  flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono transition-all duration-300 border
                  ${isCompleted 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30' 
                    : 'bg-transparent text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--surface-hover)]'}
                  ${isCurrent ? 'ring-2 ring-[var(--text-main)] scale-110 z-10 bg-[var(--surface-active)]' : ''}
                `}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Left Arrow Area */}
      <div className="absolute left-0 top-0 bottom-0 w-24 flex items-center justify-center z-20 group cursor-pointer" onClick={handlePrev}>
        <div className={`p-3 rounded-full glass-panel transition-all duration-300 group-hover:scale-110 ${currentIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeftIcon />
        </div>
      </div>

      {/* Right Arrow Area */}
      <div className="absolute right-0 top-0 bottom-0 w-24 flex items-center justify-center z-20 group cursor-pointer" onClick={handleNext}>
        <div className={`p-3 rounded-full glass-panel transition-all duration-300 group-hover:scale-110 ${currentIndex === article.content.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} style={{ color: 'var(--text-secondary)' }}>
          <ArrowRightIcon />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex gap-8 w-full max-w-[90%] xl:max-w-7xl justify-center items-stretch h-[70vh]">
        
        {/* Source Card */}
        <div 
          className={`flex-1 glass-panel rounded-2xl p-8 flex flex-col relative transition-all duration-500 ease-out transform animate-float shadow-2xl
            ${animDirection === 1 ? '-translate-x-20 opacity-0 scale-95' : animDirection === -1 ? 'translate-x-20 opacity-0 scale-95' : 'translate-x-0 opacity-100 scale-100'}
          `}
          style={{ borderColor: 'var(--glass-border)', boxShadow: '0 25px 50px -12px var(--particle-blue)' }}
        >
          {/* Particles */}
          <ParticleBackground />

          <div className="flex justify-between items-start mb-6 z-10 relative">
            <div className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Original</div>
            <button 
              onClick={() => playTextToSpeech(sourceText)} 
              className="transition-colors hover:text-[var(--text-main)]"
              style={{ color: 'var(--text-secondary)' }}
              title="Read Aloud"
            >
              <SpeakerIcon />
            </button>
          </div>
          <div className="flex-grow overflow-y-auto z-10 relative custom-scrollbar pr-2">
            <div className="min-h-full flex flex-col justify-center w-full">
              <p className={`text-xl md:text-2xl leading-relaxed font-serif-sc ${mode === 'ZH_TO_EN' ? 'font-medium' : 'font-light'}`} style={{ color: 'var(--text-main)' }}>
                {sourceText}
              </p>
            </div>
          </div>
          <div className="mt-4 text-xs flex justify-between pt-4 border-t z-10 relative" style={{ color: 'var(--text-secondary)', borderColor: 'var(--glass-border)' }}>
             <span>{currentIndex + 1} / {article.content.length}</span>
             <span className="flex items-center gap-2">
                <span className="px-2 py-1 rounded text-[10px] border" style={{ backgroundColor: 'var(--surface-hover)', borderColor: 'var(--glass-border)' }}>Tab Hint</span>
             </span>
          </div>

          {/* Hint Overlay */}
          <div className={`absolute inset-0 backdrop-blur-sm rounded-2xl flex items-center justify-center p-8 transition-opacity duration-300 z-20 ${showHint ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} style={{ backgroundColor: 'var(--glass-bg)' }}>
             <p className="text-lg font-serif-sc text-center" style={{ color: 'var(--text-main)' }}>{targetText}</p>
          </div>
        </div>

        {/* Input/Result Card */}
        <div 
          className={`flex-1 glass-panel input-glow rounded-2xl p-8 flex flex-col relative transition-all duration-500 ease-out transform delay-75
            ${animDirection === 1 ? '-translate-x-20 opacity-0 scale-95' : animDirection === -1 ? 'translate-x-20 opacity-0 scale-95' : 'translate-x-0 opacity-100 scale-100'}
          `}
        >
           <div className="flex justify-between items-start mb-6">
            <div className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
              {isSubmitted ? 'Feedback' : 'Your Translation'}
            </div>
            {isSubmitted && (
               <div className="flex gap-4">
                  <span className="text-[10px] border px-1.5 py-0.5 rounded" style={{ color: 'var(--text-secondary)', borderColor: 'var(--text-secondary)' }}>E to Edit</span>
                  <button 
                    onClick={() => { setIsSubmitted(false); setTimeout(() => inputRef.current?.focus(), 100); }} 
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Edit
                  </button>
               </div>
            )}
          </div>

          <div className="flex-grow relative min-h-0 flex flex-col">
            {!isSubmitted ? (
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full h-full bg-transparent resize-none outline-none text-xl leading-relaxed font-serif-sc custom-scrollbar"
                style={{ color: 'var(--text-main)' }}
                placeholder={mode === 'EN_TO_ZH' ? "在此输入中文翻译..." : "Type translation here..."}
                spellCheck={false}
              />
            ) : (
              <div className="text-xl leading-relaxed font-serif-sc overflow-y-auto flex-1 pr-2 custom-scrollbar break-words whitespace-pre-wrap">
                {diffs.map((part, i) => (
                   <span key={i} className={getDiffStyle(part.type)}>
                     {part.value}
                   </span>
                ))}
              </div>
            )}
          </div>

          {!isSubmitted && (
            <div className="mt-4 flex justify-end">
              <button 
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
                className={`px-6 py-2 rounded-lg text-sm flex items-center gap-2 font-medium btn-check
                  ${inputValue.trim() ? 'active' : ''}`}
              >
                <span>Check</span>
                <span className={`text-[10px] ml-1 ${inputValue.trim() ? 'opacity-60' : 'opacity-20'}`}>⏎</span>
              </button>
            </div>
          )}
          {isSubmitted && (
             <div className="mt-4 flex justify-between items-center border-t pt-4" style={{ borderColor: 'var(--glass-border)' }}>
                <div className="flex gap-3 text-xs items-center" style={{ color: 'var(--text-secondary)' }}>
                  <span>Results</span>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}><span className="w-2 h-2 rounded-full bg-emerald-500/50"></span> Good</div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}><span className="w-2 h-2 rounded-full bg-yellow-500/50"></span> Missing</div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}><span className="w-2 h-2 rounded-full bg-red-500/50 line-through decoration-red-500/50"></span> Extra</div>
                </div>
             </div>
          )}
        </div>

      </div>
      
      {/* Mobile-ish Controls for non-keyboard users (optional but good for completeness) */}
      <div className="absolute bottom-8 flex gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
         <span className="hidden md:inline border px-2 py-1 rounded" style={{ borderColor: 'var(--text-secondary)' }}>Arrows to Switch</span>
         <span className="hidden md:inline border px-2 py-1 rounded" style={{ borderColor: 'var(--text-secondary)' }}>Enter to Submit</span>
      </div>
    </div>
  );
};

// --- Aesthetic Helper ---
function getDiffStyle(type: DiffType): string {
  switch (type) {
    case DiffType.MATCH:
      return "diff-match";
    case DiffType.DELETE:
      return "diff-delete";
    case DiffType.INSERT:
      return "diff-insert";
    default:
      return "";
  }
}

// --- Mount ---
const root = createRoot(document.getElementById('root')!);
root.render(<App />);