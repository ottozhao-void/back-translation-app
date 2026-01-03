import React, { useState, useMemo } from 'react';
import { splitIntoSentences } from '../utils/textUtils';

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

const XMarkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

interface ReferenceTranslationUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (text: string) => void;
}

const ReferenceTranslationUploadModal: React.FC<ReferenceTranslationUploadModalProps> = ({ isOpen, onClose, onUpload }) => {
  const [text, setText] = useState("");

  if (!isOpen) return null;

  const handleUpload = () => {
    if (text.trim()) {
      onUpload(text);
      setText("");
      onClose();
    }
  };

  return (
    <div className="absolute inset-0 z-20 bg-black/50 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
       <div className="w-full max-w-2xl space-y-4 bg-[var(--bg-main)] p-6 rounded-2xl border border-[var(--glass-border)] shadow-2xl">
          <h3 className="text-lg font-medium">Paste Reference Text</h3>
          <textarea
             value={text}
             onChange={(e) => setText(e.target.value)}
             className="w-full h-64 p-4 rounded-xl bg-[var(--surface-hover)] border border-[var(--glass-border)] focus:outline-none focus:border-[var(--text-secondary)] resize-none font-serif-sc"
             placeholder="Paste the reference translation here..."
          />
          <div className="flex justify-end gap-3">
             <button 
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm hover:bg-[var(--surface-hover)]"
             >
                Cancel
             </button>
             <button 
                onClick={handleUpload}
                className="px-4 py-2 rounded-lg text-sm bg-[var(--text-main)] text-[var(--bg-main)] font-medium hover:opacity-90"
             >
                Upload
             </button>
          </div>
       </div>
    </div>
  );
};

interface SentenceCompareModalProps {
  sourceText: string;
  referenceText: string;
  userText: string;
  additionalReferences?: string[];
  onClose: () => void;
  onAddReference: (text: string) => void;
}

export const SentenceCompareModal: React.FC<SentenceCompareModalProps> = ({
  sourceText,
  referenceText,
  userText,
  additionalReferences = [],
  onClose,
  onAddReference
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAddingRef, setIsAddingRef] = useState(false);
  const [activeRefIndex, setActiveRefIndex] = useState(0);

  const sourceSentences = useMemo(() => splitIntoSentences(sourceText), [sourceText]);
  const referenceSentences = useMemo(() => splitIntoSentences(referenceText), [referenceText]);
  const userSentences = useMemo(() => splitIntoSentences(userText), [userText]);
  
  // Additional references split
  const additionalRefSentences = useMemo(() => {
    return additionalReferences.map(ref => splitIntoSentences(ref));
  }, [additionalReferences]);

  const allRefSentences = useMemo(() => [referenceSentences, ...additionalRefSentences], [referenceSentences, additionalRefSentences]);

  const maxSentences = Math.max(
    sourceSentences.length, 
    referenceSentences.length, 
    userSentences.length
  );

  const currentSource = sourceSentences[currentIndex] || "";
  const currentReference = referenceSentences[currentIndex] || "";
  const currentUser = userSentences[currentIndex] || "";
  
  const handleNext = () => {
    if (currentIndex < maxSentences - 1) setCurrentIndex(p => p + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(p => p - 1);
  };

  const handleAddReference = (text: string) => {
    onAddReference(text);
    setIsAddingRef(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-6xl h-[85vh] glass-panel rounded-2xl flex flex-col shadow-2xl overflow-hidden bg-[var(--bg-main)]">
        
        {/* Header / Navigation */}
        <div className="h-16 border-b border-[var(--glass-border)] flex items-center justify-between px-6 bg-[var(--surface-hover)]/20">
           <div className="flex items-center gap-4">
              <button onClick={handlePrev} disabled={currentIndex === 0} className="p-2 rounded-full hover:bg-[var(--surface-hover)] disabled:opacity-30">
                 <ArrowLeftIcon />
              </button>
              <div className="flex gap-1 overflow-x-auto max-w-[200px] custom-scrollbar">
                 {Array.from({ length: maxSentences }).map((_, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`w-6 h-6 rounded-full text-xs flex items-center justify-center flex-shrink-0 transition-all
                        ${idx === currentIndex ? 'bg-[var(--text-main)] text-[var(--bg-main)]' : 'bg-[var(--surface-hover)] text-[var(--text-secondary)]'}
                      `}
                    >
                      {idx + 1}
                    </button>
                 ))}
              </div>
              <button onClick={handleNext} disabled={currentIndex === maxSentences - 1} className="p-2 rounded-full hover:bg-[var(--surface-hover)] disabled:opacity-30">
                 <ArrowRightIcon />
              </button>
           </div>
           <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--surface-hover)]">
              <XMarkIcon />
           </button>
        </div>

        {/* Content Grid */}
        <div className="flex-1 grid grid-cols-2 divide-x divide-[var(--glass-border)] overflow-hidden">
           
           {/* Left Column: Source & Reference */}
           <div className="flex flex-col h-full divide-y divide-[var(--glass-border)]">
              {/* Top: Source */}
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[var(--surface-hover)]/5">
                 <div className="text-xs font-mono uppercase tracking-widest mb-4 opacity-50">Original</div>
                 <p className="text-xl font-serif-sc leading-relaxed">{currentSource}</p>
              </div>
              
              {/* Bottom: Reference(s) */}
              <div className="flex-1 px-8 pt-8 pb-20 overflow-y-auto custom-scrollbar relative">
                 <div className="flex items-center justify-between mb-4">
                    <div className="text-xs font-mono uppercase tracking-widest opacity-50">Reference</div>
                    {allRefSentences.length > 1 && (
                       <div className="flex gap-1">
                          {allRefSentences.map((_, idx) => (
                             <button
                                key={idx}
                                onClick={() => setActiveRefIndex(idx)}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors
                                   ${activeRefIndex === idx 
                                      ? 'bg-[var(--text-main)] text-[var(--bg-main)]' 
                                      : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]/80'}
                                `}
                             >
                                Ref {idx + 1}
                             </button>
                          ))}
                       </div>
                    )}
                 </div>
                 <div className="space-y-6">
                    {/* Active Reference */}
                    <div>
                       <p className="text-lg font-serif-sc leading-relaxed" style={{ color: 'var(--text-main)' }}>
                          {allRefSentences[activeRefIndex]?.[currentIndex] || ""}
                       </p>
                    </div>
                 </div>

                 {/* Upload Button (Bottom Left) */}
                 <div className="absolute bottom-6 left-6">
                    <button 
                      onClick={() => setIsAddingRef(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-[var(--border-high-contrast)] hover:bg-[var(--surface-hover)] transition-colors"
                    >
                       <UploadIcon />
                       <span>Add Reference</span>
                    </button>
                 </div>
              </div>
           </div>

           {/* Right Column: User Translation */}
           <div className="flex flex-col h-full p-8 overflow-y-auto custom-scrollbar bg-[var(--surface-hover)]/5">
              <div className="text-xs font-mono uppercase tracking-widest mb-4 opacity-50">Your Translation</div>
              <div className="text-xl font-serif-sc leading-relaxed">
                 {currentUser}
              </div>
           </div>

        </div>
        
        <ReferenceTranslationUploadModal 
          isOpen={isAddingRef}
          onClose={() => setIsAddingRef(false)}
          onUpload={handleAddReference}
        />
      </div>
    </div>
  );
};
