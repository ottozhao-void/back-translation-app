import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Article, PracticeMode, Paragraph, UserTranslation, FeedbackMode, TranslationRecord } from './types';
import { playTextToSpeech } from './services/geminiService';
import { fetchArticles, parseArticle, parseMarkdownArticle, saveArticleToServer, deleteArticleFromServer, renameArticleOnServer, serializeArticle } from './utils/articleLoader';
import { SentenceCompareModal } from './components/SentenceCompareModal';

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

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
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

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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

// --- Settings Component ---
interface AppSettings {
  autoSave: {
    enabled: boolean;
    delay: number; // ms
  };
  llmThreshold: number;
  hotkeys: { [commandId: string]: string };
}

const AVAILABLE_COMMANDS = [
  { id: 'next', label: 'Next Sentence', default: 'ArrowRight' },
  { id: 'prev', label: 'Previous Sentence', default: 'ArrowLeft' },
  { id: 'hint', label: 'Toggle Hint', default: 'Tab' },
  { id: 'submit', label: 'Submit / Check', default: 'Enter' },
  { id: 'edit', label: 'Edit Translation', default: 'E' },
  { id: 'compare', label: 'Open Compare Modal', default: 'C' },
  { id: 'playAudio', label: 'Play Audio', default: 'Alt+P' },
  { id: 'autoSave', label: 'Trigger Auto Save', default: 'Ctrl+S' },
];

// --- Settings Icons ---
const KeyboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
  </svg>
);

const SystemIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

const PaintBrushIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a16.001 16.001 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
  </svg>
);

const AppsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
);

const DataIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
  </svg>
);

const ArrowUturnLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
  </svg>
);

const LockClosedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const UserGroupIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const UserCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const SettingsModal: React.FC<{
  settings: AppSettings;
  onUpdate: (newSettings: AppSettings) => void;
  onClose: () => void;
}> = ({ settings, onUpdate, onClose }) => {
  const [activeTab, setActiveTab] = useState('General');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(settings.autoSave.enabled);
  const [autoSaveDelay, setAutoSaveDelay] = useState(settings.autoSave.delay / 1000);
  const [llmThreshold, setLlmThreshold] = useState(settings.llmThreshold);
  const [hotkeys, setHotkeys] = useState(settings.hotkeys || {});
  const [recordingCommandId, setRecordingCommandId] = useState<string | null>(null);

  const handleSave = () => {
    onUpdate({
      autoSave: {
        enabled: autoSaveEnabled,
        delay: autoSaveDelay * 1000
      },
      llmThreshold,
      hotkeys
    });
    onClose();
  };

  const handleHotkeyRecord = (e: React.KeyboardEvent, commandId: string) => {
      e.preventDefault();
      e.stopPropagation();

      const parts = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.metaKey) parts.push('Meta');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');

      const key = e.key;
      if (['Control', 'Meta', 'Alt', 'Shift'].includes(key)) return; // Just modifiers

      if (key === ' ') parts.push('Space');
      else if (key === 'ArrowUp') parts.push('ArrowUp');
      else if (key === 'ArrowDown') parts.push('ArrowDown');
      else if (key === 'ArrowLeft') parts.push('ArrowLeft');
      else if (key === 'ArrowRight') parts.push('ArrowRight');
      else if (key === 'Enter') parts.push('Enter');
      else if (key === 'Tab') parts.push('Tab');
      else if (key === 'Escape') {
          setRecordingCommandId(null);
          return;
      }
      else if (key === 'Backspace' || key === 'Delete') {
          // Clear hotkey (Unbind)
          setHotkeys({ ...hotkeys, [commandId]: '' });
          setRecordingCommandId(null);
          return;
      }
      else parts.push(key.toUpperCase());

      const hotkeyString = parts.join('+');
      setHotkeys({ ...hotkeys, [commandId]: hotkeyString });
      setRecordingCommandId(null);
  };

  const handleResetHotkey = (commandId: string) => {
      const newHotkeys = { ...hotkeys };
      delete newHotkeys[commandId];
      setHotkeys(newHotkeys);
  };

  const handleClearHotkey = (commandId: string) => {
      setHotkeys({ ...hotkeys, [commandId]: '' });
  };

  const sidebarItems = [
    { name: 'General', icon: SystemIcon },
    { name: 'Hotkeys', icon: KeyboardIcon },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      <div className="relative w-full max-w-5xl h-[80vh] glass-panel rounded-2xl flex shadow-2xl animate-[float_0.3s_ease-out] overflow-hidden" style={{ backgroundColor: 'var(--bg-main)' }}>
        
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-[var(--glass-border)] p-4 flex flex-col gap-2 bg-[var(--surface-hover)]/30">
           <div className="mb-6 px-4 pt-2">
              <h2 className="text-xl font-serif-sc font-bold" style={{ color: 'var(--text-main)' }}>Settings</h2>
           </div>
           {sidebarItems.map((item) => (
             <button
               key={item.name}
               onClick={() => setActiveTab(item.name)}
               className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all duration-200 ${activeTab === item.name ? 'bg-[var(--surface-active)] shadow-sm' : 'hover:bg-[var(--surface-hover)]'}`}
               style={{ color: activeTab === item.name ? 'var(--text-main)' : 'var(--text-secondary)' }}
             >
               <item.icon />
               <span>{item.name}</span>
             </button>
           ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
           {/* Header */}
           <div className="h-16 border-b border-[var(--glass-border)] flex items-center justify-between px-8">
              <h3 className="text-lg font-medium" style={{ color: 'var(--text-main)' }}>{activeTab}</h3>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--surface-hover)] transition-colors" style={{ color: 'var(--text-secondary)' }}>
                <XMarkIcon />
              </button>
           </div>

           {/* Scrollable Content */}
           <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {activeTab === 'General' && (
                <div className="space-y-6 max-w-2xl">
                   
                   {/* Setting Item: Auto Save */}
                   <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10">
                      <div className="flex flex-col gap-1">
                         <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Auto Save Drafts</span>
                         <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Automatically save your translation progress</span>
                      </div>
                      <button 
                        onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${autoSaveEnabled ? 'bg-emerald-500' : 'bg-gray-600'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${autoSaveEnabled ? 'left-7' : 'left-1'}`} />
                      </button>
                   </div>

                   {/* Setting Item: Auto Save Delay */}
                   {autoSaveEnabled && (
                     <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10">
                        <div className="flex flex-col gap-1">
                           <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Auto Save Delay</span>
                           <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Time to wait before saving (seconds)</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <input 
                              type="number" 
                              min="1" 
                              max="60"
                              value={autoSaveDelay}
                              onChange={(e) => setAutoSaveDelay(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-20 bg-[var(--bg-main)] border border-[var(--glass-border)] rounded px-3 py-1.5 outline-none focus:border-[var(--text-main)] transition-colors text-right"
                              style={{ color: 'var(--text-main)' }}
                           />
                        </div>
                     </div>
                   )}

                   {/* Setting Item: LLM Threshold */}
                   <div className="flex flex-col gap-4 p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-hover)]/10">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                           <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>LLM Score Threshold</span>
                           <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Minimum score to mark as completed</span>
                        </div>
                        <span className="font-mono text-lg font-bold" style={{ color: 'var(--text-main)' }}>{llmThreshold}</span>
                      </div>
                      <input 
                          type="range" 
                          min="1" 
                          max="100" 
                          value={llmThreshold} 
                          onChange={(e) => setLlmThreshold(parseInt(e.target.value))}
                          className="w-full accent-[var(--text-main)]"
                      />
                   </div>

                </div>
              )}

              {activeTab === 'Hotkeys' && (
                  <div className="space-y-4 max-w-3xl">
                      <div className="flex items-center gap-2 p-2 mb-4 border-b border-[var(--glass-border)]">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[var(--text-secondary)]">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                          </svg>
                          <input 
                              type="text" 
                              placeholder="Search hotkeys..." 
                              className="bg-transparent outline-none w-full text-sm"
                              style={{ color: 'var(--text-main)' }}
                          />
                      </div>

                      {AVAILABLE_COMMANDS.map(cmd => {
                          const isRecording = recordingCommandId === cmd.id;
                          const customKey = hotkeys[cmd.id];
                          const currentKey = customKey !== undefined ? customKey : cmd.default;
                          const isCustomized = customKey !== undefined;
                          
                          return (
                              <div key={cmd.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface-hover)]/50 transition-colors group">
                                  <div className="flex flex-col">
                                      <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{cmd.label}</span>
                                      <span className="text-xs opacity-50" style={{ color: 'var(--text-secondary)' }}>{cmd.id}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      {isCustomized && (
                                          <button
                                              onClick={() => handleResetHotkey(cmd.id)}
                                              className="p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)] transition-colors opacity-0 group-hover:opacity-100"
                                              title="Restore Default"
                                          >
                                              <ArrowUturnLeftIcon />
                                          </button>
                                      )}
                                      <button
                                          onClick={() => handleClearHotkey(cmd.id)}
                                          className="p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-red-500/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                          title="Unbind (Clear)"
                                      >
                                          <XMarkIcon />
                                      </button>
                                      <button
                                          onClick={() => setRecordingCommandId(cmd.id)}
                                          onKeyDown={(e) => isRecording && handleHotkeyRecord(e, cmd.id)}
                                          className={`
                                              min-w-[100px] px-3 py-1.5 rounded-md text-xs font-mono border transition-all
                                              ${isRecording 
                                                  ? 'bg-[var(--surface-active)] border-[var(--text-main)] text-[var(--text-main)] animate-pulse' 
                                                  : 'bg-[var(--surface-hover)] border-transparent text-[var(--text-secondary)] hover:border-[var(--border-high-contrast)]'
                                              }
                                          `}
                                      >
                                          {isRecording ? 'Press keys...' : (currentKey || 'None')}
                                      </button>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              )}

              {activeTab !== 'General' && activeTab !== 'Hotkeys' && (
                <div className="flex flex-col items-center justify-center h-64 text-[var(--text-secondary)]">
                   <div className="mb-4 opacity-50 scale-150">
                      {(() => {
                        const Icon = sidebarItems.find(i => i.name === activeTab)?.icon;
                        return Icon ? <Icon /> : null;
                      })()}
                   </div>
                   <p>No settings available for {activeTab} yet.</p>
                </div>
              )}
           </div>

           {/* Footer Actions */}
           <div className="p-6 border-t border-[var(--glass-border)] flex justify-end gap-4 bg-[var(--surface-hover)]/10">
              <button 
                onClick={onClose}
                className="px-6 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
                style={{ color: 'var(--text-main)' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-main)' }}
              >
                Save Changes
              </button>
           </div>
        </div>
      </div>
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

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
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
    return { autoSave: { enabled: true, delay: 3000 }, llmThreshold: 85, hotkeys: {} };
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
    // 1. Generate new filename
    const safeTitle = newTitle.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_').toLowerCase();
    // Keep the timestamp prefix if it exists, or just use the new title
    // Actually, let's just keep the ID structure consistent if possible, or just make a new one.
    // The ID is the filename.
    // Let's try to preserve the timestamp if it looks like one, or just generate a new one?
    // If we change the filename, the ID changes.
    
    // Let's just use the new title as the base for the new filename.
    // But we should probably keep the timestamp to avoid collisions if we can.
    // Or just generate a new timestamp.
    // Let's just use Date.now() + safeTitle
    const newFilename = `${Date.now()}_${safeTitle}.json`;

    // 2. Rename on server
    const success = await renameArticleOnServer(articleId, newFilename);
    
    if (success) {
      // 3. Update local state
      setArticles(prev => prev.map(a => {
        if (a.id === articleId) {
          return { ...a, id: newFilename, title: newTitle };
        }
        return a;
      }));

      // 4. Update content on server (to save new title in JSON)
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
                    const oldRecord: TranslationRecord = {
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

        <div className="absolute right-6 top-6 flex gap-4">
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
            onCreate={handleArticleCreate}
            onDelete={handleArticleDelete}
            onRename={handleArticleRename}
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
            onAddReference={addReferenceTranslation}
            onBack={() => setView('MODE_SELECT')}
            appSettings={appSettings}
          />
        )}
      </main>

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

// --- Component: Upload Modal ---
const UploadModal: React.FC<{ 
  onClose: () => void, 
  onUploadFile: () => void, 
  onCreate: (title: string, content: string) => void 
}> = ({ onClose, onUploadFile, onCreate }) => {
  const [mode, setMode] = useState<'SELECT' | 'CREATE'>('SELECT');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const handleCreate = () => {
    if (!title.trim()) {
      alert("Please enter a title.");
      return;
    }
    if (!content.includes('# 英文原文') || !content.includes('# 中文原文')) {
      alert("Format Error: Content must contain '# 英文原文' and '# 中文原文' sections.");
      return;
    }
    onCreate(title, content);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl glass-panel rounded-2xl flex flex-col shadow-2xl animate-[float_0.3s_ease-out] overflow-hidden">
        
        {mode === 'SELECT' ? (
          <div className="p-12 flex flex-col items-center">
            <h2 className="text-2xl font-serif-sc mb-8" style={{ color: 'var(--text-main)' }}>Add New Article</h2>
            <div className="flex gap-8 w-full justify-center">
              <button 
                onClick={() => { onUploadFile(); onClose(); }}
                className="flex-1 h-48 glass-panel rounded-xl flex flex-col items-center justify-center gap-4 transition-all duration-300 hover:bg-[var(--surface-hover)] hover:scale-105 border border-[var(--border-high-contrast)]"
              >
                <UploadIcon />
                <span className="font-mono tracking-widest uppercase text-sm">Upload File</span>
              </button>
              <button 
                onClick={() => setMode('CREATE')}
                className="flex-1 h-48 glass-panel rounded-xl flex flex-col items-center justify-center gap-4 transition-all duration-300 hover:bg-[var(--surface-hover)] hover:scale-105 border border-[var(--border-high-contrast)]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span className="font-mono tracking-widest uppercase text-sm">Create New</span>
              </button>
            </div>
            <button onClick={onClose} className="mt-8 text-sm hover:underline" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
          </div>
        ) : (
          <div className="flex flex-col h-[80vh]">
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--glass-border)' }}>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter Article Title..."
                className="text-xl font-serif-sc bg-transparent outline-none w-full placeholder-opacity-50"
                style={{ color: 'var(--text-main)' }}
                autoFocus
              />
              <button 
                onClick={onClose}
                className="transition-colors p-2 rounded-full hover:bg-[var(--surface-hover)] ml-4"
                style={{ color: 'var(--text-secondary)' }}
              >
                <XMarkIcon />
              </button>
            </div>
            
            <div className="flex-1 p-6 overflow-hidden flex flex-col">
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`# 英文原文\nPaste English text here...\n\n# 中文原文\nPaste Chinese text here...`}
                className="flex-1 w-full bg-transparent resize-none outline-none font-mono text-sm leading-relaxed custom-scrollbar p-4 rounded-lg border border-dashed border-[var(--border-high-contrast)] focus:border-solid focus:border-[var(--text-secondary)] transition-all"
                style={{ color: 'var(--text-main)' }}
              />
            </div>
            
            <div className="p-6 border-t flex justify-between items-center" style={{ borderColor: 'var(--glass-border)' }}>
               <button 
                 onClick={() => setMode('SELECT')}
                 className="text-sm hover:underline"
                 style={{ color: 'var(--text-secondary)' }}
               >
                 Back
               </button>
               <button 
                 onClick={handleCreate}
                 className="px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                 style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-main)' }}
               >
                 Save Article
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- View: Article List ---
const ArticleList: React.FC<{ 
  articles: Article[], 
  onSelect: (a: Article) => void,
  onUpload: (content: string, filename: string) => void,
  onCreate: (title: string, content: string) => void,
  onDelete: (id: string) => void,
  onRename: (id: string, newTitle: string) => void
}> = ({ articles, onSelect, onUpload, onCreate, onDelete, onRename }) => {
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
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-high-contrast)' }}
          >
            <XMarkIcon />
          </button>
        </div>
        
        <div className="overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
          {article.content.map((p, i) => (
            <div key={p.id} className="flex flex-col md:flex-row gap-4 md:gap-8">
              <div className="flex-1">
                <p className="font-serif-sc leading-relaxed" style={{ color: 'var(--text-main)' }}>{p.en[0]}</p>
              </div>
              <div className="flex-1">
                 <p className="font-serif-sc leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{p.zh[0]}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t flex justify-end" style={{ borderColor: 'var(--glass-border)' }}>
           <button 
             onClick={onClose}
             className="px-4 py-2 rounded-lg text-sm transition-colors"
             style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-main)', border: '1px solid var(--border-high-contrast)' }}
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
          className="w-64 h-40 glass-panel rounded-2xl flex flex-col items-center justify-center gap-4 transition-all duration-300 group hover:bg-[var(--surface-hover)]"
          style={{ color: 'var(--text-main)', borderColor: 'var(--border-high-contrast)' }}
        >
          <span className="text-4xl group-hover:scale-110 transition-transform duration-300">🇬🇧 &rarr; 🇨🇳</span>
          <span className="font-light tracking-wide">English to Chinese</span>
        </button>
        <button 
          onClick={() => onSelectMode('ZH_TO_EN')}
          className="w-64 h-40 glass-panel rounded-2xl flex flex-col items-center justify-center gap-4 transition-all duration-300 group hover:bg-[var(--surface-hover)]"
          style={{ color: 'var(--text-main)', borderColor: 'var(--border-high-contrast)' }}
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

// --- Toast Component ---
const Toast: React.FC<{ message: string | null }> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 fade-in">
      <div className="glass-panel px-6 py-3 rounded-full shadow-lg flex items-center gap-2" style={{ backgroundColor: 'var(--surface-active)', borderColor: 'var(--border-high-contrast)' }}>
        <CheckIcon />
        <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{message}</span>
      </div>
    </div>
  );
};

// --- Helper: Hotkey Matcher ---
const matchesHotkey = (e: React.KeyboardEvent, hotkeyDef: string) => {
  if (!hotkeyDef) return false;
  const parts = hotkeyDef.split('+');
  const modifiers = {
      ctrl: parts.includes('Ctrl'),
      alt: parts.includes('Alt'),
      meta: parts.includes('Meta'),
      shift: parts.includes('Shift')
  };
  
  if (e.ctrlKey !== modifiers.ctrl) return false;
  if (e.altKey !== modifiers.alt) return false;
  if (e.metaKey !== modifiers.meta) return false;
  if (e.shiftKey !== modifiers.shift) return false;

  const keyPart = parts.find(p => !['Ctrl', 'Alt', 'Meta', 'Shift'].includes(p));
  if (!keyPart) return false;

  if (keyPart === 'Space') return e.key === ' ';
  if (keyPart.length === 1) return e.key.toUpperCase() === keyPart.toUpperCase();
  return e.key === keyPart;
};

// --- View: Practice Session (The Core) ---
const PracticeSession: React.FC<{
  article: Article;
  mode: PracticeMode;
  onUpdateProgress: (aId: string, pId: string, val: UserTranslation) => void;
  onAddReference: (aId: string, pId: string, text: string, targetLang: 'en' | 'zh') => void;
  onBack: () => void;
  appSettings: AppSettings;
}> = ({ article, mode, onUpdateProgress, onAddReference, onBack, appSettings }) => {
  const [currentIndex, setCurrentIndex] = useState(() => {
    // Auto-jump to first unfinished
    const idx = article.content.findIndex(p => {
        const t = mode === 'EN_TO_ZH' ? p.userTranslationZh : p.userTranslationEn;
        return !t || t.type === 'draft';
    });
    return idx !== -1 ? idx : 0;
  });
  const [inputValue, setInputValue] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [animDirection, setAnimDirection] = useState(0); // -1 left, 1 right
  
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>('diff');
  const [score, setScore] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const currentParagraph = article.content[currentIndex];
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSavedText = useRef('');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize input if saved
  useEffect(() => {
    // Reset state for new card
    const savedTranslation = mode === 'EN_TO_ZH' 
      ? currentParagraph.userTranslationZh 
      : currentParagraph.userTranslationEn;
    
    if (savedTranslation) {
      setInputValue(savedTranslation.text);
      lastSavedText.current = savedTranslation.text;
      
      if (savedTranslation.type === 'draft') {
        setIsSubmitted(false);
        setFeedbackMode('diff');
        setScore('');
        setSaveStatus('saved');
      } else {
        setFeedbackMode(savedTranslation.type);
        setScore(savedTranslation.score ? savedTranslation.score.toString() : '');
        setIsSubmitted(true);
      }
    } else {
      setInputValue('');
      lastSavedText.current = '';
      setFeedbackMode('diff'); // Default
      setScore('');
      setIsSubmitted(false);
      setSaveStatus('saved');
    }
    setShowHint(false);
    setShowCompareModal(false);

    // Focus management on card change
    setTimeout(() => {
      if (savedTranslation && savedTranslation.type !== 'draft') {
        // If loaded as submitted, focus container for nav shortcuts
        containerRef.current?.focus();
      } else {
        // If edit mode, focus input
        inputRef.current?.focus();
      }
    }, 500); // Wait for animation
  }, [currentIndex, currentParagraph.id, mode]); // Keep dependency simple

  const handleAutoSave = () => {
    if (!inputValue.trim() || inputValue === lastSavedText.current) return;
    
    setSaveStatus('saving');
    onUpdateProgress(article.id, currentParagraph.id, {
        type: 'draft',
        text: inputValue,
        timestamp: Date.now()
    });
    lastSavedText.current = inputValue;
    setTimeout(() => setSaveStatus('saved'), 500);
  };

  // Auto-save logic
  useEffect(() => {
    if (isSubmitted || !appSettings.autoSave.enabled) return;

    if (inputValue !== lastSavedText.current) {
      setSaveStatus('unsaved');
      
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

      autoSaveTimerRef.current = setTimeout(() => {
        handleAutoSave();
      }, appSettings.autoSave.delay);
    } else {
        setSaveStatus('saved');
    }

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [inputValue, isSubmitted, appSettings.autoSave]);

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

    let finalScore: number | undefined;
    if (feedbackMode === 'llm') {
        const s = parseInt(score);
        if (isNaN(s) || s < 1 || s > 100) {
            alert("Please enter a valid score between 1 and 100.");
            return;
        }
        finalScore = s;
    }

    setIsSubmitted(true);
    
    // Only save if LLM mode. Diff mode doesn't save per requirement 1.
    if (feedbackMode === 'llm') {
        onUpdateProgress(article.id, currentParagraph.id, {
            type: feedbackMode,
            text: inputValue,
            timestamp: Date.now(),
            score: finalScore
        });
    } else {
        // Diff mode: Show modal
        setShowCompareModal(true);
    }
  };

  const handleCopyPrompt = () => {
      const sourceText = mode === 'EN_TO_ZH' ? currentParagraph.en[0] : currentParagraph.zh[0];
      const targetText = mode === 'EN_TO_ZH' ? currentParagraph.zh[0] : currentParagraph.en[0];
      
      const prompt = `
      # Original Text

      ${sourceText}

      # Original Translation

      ${targetText}

      Please evaluate my translation below and provide detailed feedback and a score on a scale of 1 to 100. Offer some translation tips at the end.

      # My Translation

      ${inputValue}
      `;
      navigator.clipboard.writeText(prompt).then(() => {
          setToastMessage("Prompt copied to clipboard!");
          setTimeout(() => setToastMessage(null), 1000);
      });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isInput = (e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'INPUT';

    const getHotkey = (id: string) => appSettings.hotkeys[id] || AVAILABLE_COMMANDS.find(c => c.id === id)?.default || '';
    const checkCmd = (id: string) => matchesHotkey(e, getHotkey(id));

    // Auto Save
    if (checkCmd('autoSave')) {
      e.preventDefault();
      handleAutoSave();
      return;
    }

    // Edit Translation
    if (isSubmitted && checkCmd('edit')) {
      e.preventDefault();
      setIsSubmitted(false);
      setTimeout(() => inputRef.current?.focus(), 10);
      return;
    }

    // Open Compare Modal
    if (checkCmd('compare')) {
      const hasModifier = e.ctrlKey || e.altKey || e.metaKey;
      // If in input, no modifier, and simple key -> treat as typing, ignore command
      if (isInput && !hasModifier && e.key.length === 1) {
         // pass
      } else {
         e.preventDefault();
         setShowCompareModal(true);
         return;
      }
    }

    // Navigation (Arrows)
    if (checkCmd('next')) {
      if (!isInput || isSubmitted) {
        e.preventDefault();
        handleNext();
        return;
      }
    } else if (checkCmd('prev')) {
      if (!isInput || isSubmitted) {
        e.preventDefault();
        handlePrev();
        return;
      }
    }

    // Submit / Action
    if (checkCmd('submit')) {
      if (!isSubmitted) {
         // Special handling for LLM mode in Textarea
         if (feedbackMode === 'llm' && (e.target as HTMLElement).tagName === 'TEXTAREA') {
             // If the hotkey is just 'Enter' (no modifiers), we want to allow newlines and NOT submit.
             // But if the hotkey is 'Ctrl+Enter', we want to submit.
             // We check if the key is 'Enter' and no modifiers are pressed.
             if (e.key === 'Enter' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
                 return; // Allow newline
             }
         }
         
         e.preventDefault();
         handleSubmit();
      }
    } 
    
    // Hint
    else if (checkCmd('hint')) {
      e.preventDefault();
      setShowHint(prev => !prev);
    }
  };

  // Determine source and target text based on mode
  const sourceText = mode === 'EN_TO_ZH' ? currentParagraph.en[0] : currentParagraph.zh[0];
  const targetText = mode === 'EN_TO_ZH' ? currentParagraph.zh[0] : currentParagraph.en[0];
  


  return (
    <div 
      className="flex items-center justify-center h-full w-full relative perspective-1000 outline-none" 
      onKeyDown={handleKeyDown}
      tabIndex={0}
      ref={containerRef}
    >
      <Toast message={toastMessage} />

      {showCompareModal && (
        <SentenceCompareModal 
          sourceText={sourceText}
          referenceText={targetText}
          userText={inputValue}
          additionalReferences={mode === 'EN_TO_ZH' ? currentParagraph.zh.slice(1) : currentParagraph.en.slice(1)}
          onClose={() => setShowCompareModal(false)}
          onAddReference={(text) => onAddReference(article.id, currentParagraph.id, text, mode === 'EN_TO_ZH' ? 'zh' : 'en')}
        />
      )}

      {/* Paragraph Selector */}
      <div className="absolute -top-2 left-0 right-0 flex justify-center z-30">
        <div className="flex gap-2 overflow-x-auto max-w-[80vw] px-4 py-2 custom-scrollbar">
          {article.content.map((p, idx) => {
            const translation = mode === 'EN_TO_ZH' ? p.userTranslationZh : p.userTranslationEn;
            const isCurrent = idx === currentIndex;
            
            // Default (Not Started) & Draft: High contrast border/text, transparent bg
            let statusClass = 'bg-transparent text-[var(--text-main)] border-[var(--text-main)] border-2 font-bold';

            if (translation) {
                if (translation.type === 'diff') {
                    // Diff: Yellow bg
                    statusClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30';
                } else if (translation.type === 'llm') {
                    // LLM: Check threshold
                    const score = translation.score || 0;
                    if (score >= appSettings.llmThreshold) {
                         statusClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30';
                    } else {
                         statusClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30';
                    }
                }
            }
            
            return (
              <button
                key={p.id}
                onClick={() => {
                  setAnimDirection(0);
                  setCurrentIndex(idx);
                }}
                className={`
                  flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono transition-all duration-300 border
                  ${statusClass}
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
            <div className="flex items-center gap-4">
                <div className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                {isSubmitted ? 'Feedback' : 'Your Translation'}
                </div>
                
                {/* Mode Toggle */}
                {!isSubmitted && (
                    <div className="flex items-center bg-[var(--surface-hover)] rounded-full p-1 border border-[var(--border-high-contrast)]">
                        <button
                            onClick={() => setFeedbackMode('diff')}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${feedbackMode === 'diff' ? 'bg-[var(--text-main)] text-[var(--bg-main)]' : 'text-[var(--text-secondary)]'}`}
                        >
                            DIFF
                        </button>
                        <button
                            onClick={() => setFeedbackMode('llm')}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${feedbackMode === 'llm' ? 'bg-[var(--text-main)] text-[var(--bg-main)]' : 'text-[var(--text-secondary)]'}`}
                        >
                            LLM
                        </button>
                    </div>
                )}
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
                {feedbackMode === 'diff' ? (
                    <span style={{ color: 'var(--text-main)' }}>{inputValue}</span>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="p-4 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-hover)]">
                            <div className="text-xs uppercase tracking-widest mb-2 opacity-50">Score</div>
                            <div className="text-4xl font-bold text-emerald-400">{score}</div>
                        </div>
                        <div>
                            <div className="text-xs uppercase tracking-widest mb-2 opacity-50">Your Translation</div>
                            <p>{inputValue}</p>
                        </div>
                    </div>
                )}
              </div>
            )}
          </div>

          {!isSubmitted && (
            <div className="mt-4 flex justify-between items-end">
              {feedbackMode === 'llm' ? (
                  <div className="flex gap-4 w-full items-end">
                      <div className="flex-1">
                          <div className="flex justify-between">
                            <label className="text-[10px] uppercase tracking-widest mb-1 block opacity-70">Score (1-100)</label>
                             {appSettings.autoSave.enabled && (
                                <span className="text-[10px] font-mono opacity-50" style={{ color: 'var(--text-secondary)' }}>
                                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'unsaved' ? 'Unsaved' : 'Saved'}
                                </span>
                             )}
                          </div>
                          <input 
                            type="number" 
                            min="1" 
                            max="100"
                            value={score}
                            onChange={(e) => setScore(e.target.value)}
                            className="w-full bg-[var(--surface-hover)] border border-[var(--glass-border)] rounded px-3 py-2 outline-none focus:border-[var(--text-main)] transition-colors"
                            placeholder="Score"
                          />
                      </div>
                      <button
                        onClick={handleCopyPrompt}
                        className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--border-high-contrast)] hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-2"
                      >
                          <span>Copy Prompt</span>
                      </button>
                      <button 
                        onClick={handleSubmit}
                        disabled={!inputValue.trim() || !score}
                        className={`px-6 py-2 rounded-lg text-sm flex items-center gap-2 font-medium btn-check border border-[var(--border-high-contrast)]
                        ${inputValue.trim() && score ? 'active' : ''}`}
                    >
                        <span>Submit</span>
                    </button>
                  </div>
              ) : (
                <div className="flex justify-between w-full items-center">
                    <div className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {appSettings.autoSave.enabled && (
                            <span className={`transition-opacity duration-300 ${saveStatus === 'saved' ? 'opacity-50' : 'opacity-100'}`}>
                                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'unsaved' ? 'Unsaved' : 'Saved'}
                            </span>
                        )}
                    </div>
                    <button 
                        onClick={handleSubmit}
                        disabled={!inputValue.trim()}
                        className={`px-6 py-2 rounded-lg text-sm flex items-center gap-2 font-medium btn-check border border-[var(--border-high-contrast)]
                        ${inputValue.trim() ? 'active' : ''}`}
                    >
                        <span>Check</span>
                        <span className={`text-[10px] ml-1 ${inputValue.trim() ? 'opacity-60' : 'opacity-20'}`}>⏎</span>
                    </button>
                </div>
              )}
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



// --- Mount ---
const root = createRoot(document.getElementById('root')!);
root.render(<App />);