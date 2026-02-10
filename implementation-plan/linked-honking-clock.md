# Implementation Plan: Semantic Sentence Analysis (Pre-processed Point-and-Click Vocabulary)

## Context

This feature enhances the vocabulary collection experience by replacing manual text selection with LLM-powered semantic analysis. Users can click a "Magic Analyze" button to detect clickable semantic units (words, phrases, patterns) in English sentences, enabling quick vocabulary addition without manual text selection.

The key motivation is to **lower interaction friction** especially on mobile devices where text selection is imprecise, while maintaining the "analyze once, interact everywhere" principle by persisting results as metadata.

---

## Data Structure Changes

### 1. New Type Definitions (`types.ts`)

```typescript
// Add to types.ts after VocabularyType definition

/**
 * Semantic Analysis Result
 * LLM-generated breakdown of a sentence into interactive units
 */
export interface SentenceAnalysis {
  tokens: Array<{
    text: string;        // The actual word/token
    index: number;       // Starting position in original sentence
    length: number;      // Character length
    lemma?: string;      // Root form (e.g., "went" -> "go")
    isStopword: boolean; // Whether filtered as basic stopword
  }>;

  chunks: Array<{
    text: string;        // "take for granted"
    indices: number[];   // Token indices [3, 4, 5]
    type: 'idiom' | 'collocation' | 'phrasal_verb';
    translation?: string; // Optional Chinese translation
  }>;

  patterns: Array<{
    id: string;          // Unique identifier
    template: string;    // "so … that …"
    explanation: string; // English explanation of how to use this pattern
    examples: Array<{ en: string; zh: string }>; // Example sentences (EN + ZH)
    anchors: Array<{
      text: string;      // "so", "that"
      index: number;     // Token index
    }>;
    matchedText: string; // The actual text in sentence
  }>;
}

/**
 * Interactive semantic unit for click handling
 */
export interface SemanticUnit {
  text: string;
  type: 'word' | 'collocation' | 'pattern';
  startIndex: number;
  endIndex: number;
  chunkIndex?: number;
  patternId?: string;
}

// Extend LLMTaskType union (around line 230)
export type LLMTaskType =
  | 'segment'
  | 'segment-align'
  | 'translate'
  | 'score'
  | 'greeting'
  | 'enrich-vocab'
  | 'suggest-pattern'
  | 'analyze-sentence'  // NEW
  | 'custom';

// Extend SentencePair interface (around line 119)
export interface SentencePair {
  // ... existing fields
  analysis?: SentenceAnalysis;  // EN analysis only (optional, backward compatible)
}
```

---

## Backend Changes

### 2. New LLM Task (`server/llm/prompts.ts`)

Add after the `'suggest-pattern'` task (around line 242):

```typescript
// ============ Semantic Sentence Analysis ============
'analyze-sentence': {
  systemPrompt: `
You are a semantic sentence analyzer for English-Chinese language learning.

Analyze the given English sentence and extract:
1. Tokens - individual words with position info
2. Chunks - meaningful multi-word units (collocations, idioms, phrasal verbs)
3. Patterns - reusable grammatical structures

Rules:
- Filter basic stopwords (a, an, the, is, are, was, were, am, be, been, being, he, him, his, she, her, hers, it, its, they, them, their, I, me, my, we, us, our, you, your)
- KEEP prepositions (with, as, for, in, on, at, by, from, to, of) - these are valuable for learners
- For chunks: focus on 2-4 word combinations that have special meaning
- For patterns: extract templates with English explanations AND 2-3 bilingual example sentences
- Only analyze the English text

Return JSON: {
  "tokens": [
    { "text": "word", "index": 0, "length": 4, "lemma": "word", "isStopword": false }
  ],
  "chunks": [
    { "text": "take for granted", "indices": [3, 4, 5], "type": "idiom" }
  ],
  "patterns": [
    {
      "id": "pattern-1",
      "template": "so ... that ...",
      "explanation": "Used to express cause and effect - 'so' indicates the cause, 'that' introduces the result",
      "examples": [
        { "en": "The book was so interesting that I read it in one day.", "zh": "这本书太有趣了，我一天就读完了。" },
        { "en": "He was so tired that he fell asleep immediately.", "zh": "他太累了，立刻就睡着了。" }
      ],
      "anchors": [
        { "text": "so", "index": 2 },
        { "text": "that", "index": 8 }
      ],
      "matchedText": "so expensive that"
    }
  ]
}

Important: Only return valid JSON, no additional text.
`.trim(),

  buildUserMessage: (params) => {
    const sentence = params.sentence || '';
    const translation = params.translation || '';
    return `English sentence: ${sentence}\nChinese translation (for context): ${translation}`;
  },

  parseResponse: (raw: unknown) => {
    const data = raw as {
      tokens?: Array<{ text: string; index: number; length: number; lemma?: string; isStopword?: boolean }>;
      chunks?: Array<{ text: string; indices: number[]; type: string }>;
      patterns?: Array<{
        id?: string;
        template: string;
        explanation: string;
        examples?: Array<{ en: string; zh: string }>;
        anchors: Array<{ text: string; index: number }>;
        matchedText?: string;
      }>;
    };

    // Validate and normalize tokens
    const tokens = Array.isArray(data?.tokens) ? data.tokens.map(t => ({
      ...t,
      isStopword: t.isStopword ?? false
    })) : [];

    // Validate chunks
    const chunks = Array.isArray(data?.chunks) ? data.chunks.filter(c =>
      ['idiom', 'collocation', 'phrasal_verb'].includes(c.type)
    ) : [];

    // Validate patterns
    const patterns = Array.isArray(data?.patterns) ? data.patterns.map((p, i) => ({
      id: p.id || `pattern-${Date.now()}-${i}`,
      template: p.template,
      explanation: p.explanation,
      examples: Array.isArray(p.examples) ? p.examples : [],
      anchors: p.anchors || [],
      matchedText: p.matchedText || ''
    })) : [];

    return { tokens, chunks, patterns };
  }
}
```

### 3. Frontend Service Method (`services/llmService.ts`)

Add after `suggestPatterns` function (around line 745):

```typescript
// ============ Semantic Sentence Analysis ============

export interface AnalyzeSentenceResult {
  success: boolean;
  data?: SentenceAnalysis;
  error?: string;
}

/**
 * Analyze a sentence to extract semantic units (tokens, chunks, patterns)
 * @param sentenceEn - The English sentence to analyze
 * @param sentenceZh - The Chinese translation for context
 */
export async function analyzeSentence(
  sentenceEn: string,
  sentenceZh: string,
  providerId?: string,
  modelId?: string
): Promise<AnalyzeSentenceResult> {
  if (!sentenceEn.trim()) {
    return { success: false, error: 'No sentence provided' };
  }

  // Get default provider/model if not specified
  if (!providerId || !modelId) {
    const configResult = await getConfig();
    if (configResult.success && configResult.config) {
      const config = configResult.config;
      const taskConfig = config.taskModels?.['analyze-sentence'];
      providerId = taskConfig?.providerId || config.defaultProvider;
      modelId = taskConfig?.modelId || config.defaultModel;
    }
  }

  // If no provider configured, return error
  if (!providerId || !modelId) {
    return {
      success: false,
      error: 'No LLM provider configured. Please configure one in Settings → AI Models.',
    };
  }

  try {
    const result = await executeTask<SentenceAnalysis>(
      'analyze-sentence',
      providerId,
      modelId,
      { sentence: sentenceEn, translation: sentenceZh }
    );

    if (result.success && result.data) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to analyze sentence',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

---

## Frontend Components

### 4. New Component: `InteractiveSentenceRenderer.tsx`

Create file: `components/sentence-mode/InteractiveSentenceRenderer.tsx`

```typescript
import React, { useMemo } from 'react';
import { SentenceAnalysis, SemanticUnit } from '../../types';

interface InteractiveSentenceRendererProps {
  sentence: string;
  analysis: SentenceAnalysis;
  onUnitClick: (unit: SemanticUnit, position: { x: number; y: number }) => void;
  hoveredPatternId: string | null;
}

const COLOR_MAP = {
  word: '#60A5FA',      // Blue
  collocation: '#A78BFA', // Purple
  pattern: '#FBBF24'     // Yellow
};

export const InteractiveSentenceRenderer: React.FC<InteractiveSentenceRendererProps> = ({
  sentence,
  analysis,
  onUnitClick,
  hoveredPatternId,
}) => {
  // Build clickable units from analysis
  const semanticUnits = useMemo(() => {
    const units: SemanticUnit[] = [];

    // Build a map of which tokens belong to hovered pattern
    const hoveredAnchors = new Set<number>();
    if (hoveredPatternId) {
      const pattern = analysis.patterns.find(p => p.id === hoveredPatternId);
      if (pattern) {
        pattern.anchors.forEach(a => hoveredAnchors.add(a.index));
      }
    }

    // Add non-stopword tokens as clickable words
    analysis.tokens.forEach((token, idx) => {
      if (!token.isStopword) {
        units.push({
          text: token.text,
          type: 'word',
          startIndex: token.index,
          endIndex: token.index + token.length,
        });
      }
    });

    // Add chunks (idioms, collocations) - exclude if tokens are already covered
    analysis.chunks.forEach((chunk, chunkIdx) => {
      const firstToken = analysis.tokens[chunk.indices[0]];
      const lastToken = analysis.tokens[chunk.indices[chunk.indices.length - 1]];
      if (firstToken && lastToken) {
        units.push({
          text: chunk.text,
          type: 'collocation',
          startIndex: firstToken.index,
          endIndex: lastToken.index + lastToken.length,
          chunkIndex: chunkIdx,
        });
      }
    });

    return units.sort((a, b) => a.startIndex - b.startIndex);
  }, [analysis, hoveredPatternId]);

  // Render sentence with clickable spans
  const renderSentence = () => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    semanticUnits.forEach((unit, i) => {
      // Add non-clickable text before this unit
      if (unit.startIndex > lastIndex) {
        parts.push(
          <span key={`text-${i}`} style={{ color: 'var(--text-main)' }}>
            {sentence.slice(lastIndex, unit.startIndex)}
          </span>
        );
      }

      // Determine styling based on type and hover state
      const unitColor = COLOR_MAP[unit.type];
      const isHighlighted = hoveredPatternId !== null;

      parts.push(
        <span
          key={`unit-${i}`}
          onClick={(e) => {
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            onUnitClick(unit, { x: rect.left + rect.width / 2, y: rect.top });
          }}
          className="cursor-pointer transition-all duration-150 hover:opacity-80 rounded px-0.5"
          style={{
            color: unitColor,
            borderBottom: isHighlighted ? '2px solid' : '1px dashed',
            borderColor: isHighlighted ? unitColor : 'transparent',
            backgroundColor: isHighlighted ? `${unitColor}15` : 'transparent',
            fontWeight: unit.type === 'collocation' ? 500 : 400,
          }}
          title={`Click to add ${unit.type}`}
        >
          {unit.text}
        </span>
      );

      lastIndex = unit.endIndex;
    });

    // Add remaining text
    if (lastIndex < sentence.length) {
      parts.push(
        <span key="text-end" style={{ color: 'var(--text-main)' }}>
          {sentence.slice(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  return (
    <p className="text-xl leading-relaxed font-serif-sc">
      {renderSentence()}
    </p>
  );
};
```

### 5. New Component: `PatternChips.tsx`

Create file: `components/sentence-mode/PatternChips.tsx`

```typescript
import React from 'react';
import { SentenceAnalysis } from '../../types';

interface PatternChipsProps {
  patterns: SentenceAnalysis['patterns'];
  hoveredPatternId: string | null;
  onPatternHover: (patternId: string | null) => void;
  onPatternClick: (pattern: SentenceAnalysis['patterns'][0]) => void;
}

export const PatternChips: React.FC<PatternChipsProps> = ({
  patterns,
  hoveredPatternId,
  onPatternHover,
  onPatternClick,
}) => {
  if (!patterns || patterns.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {patterns.map((pattern) => (
        <button
          key={pattern.id}
          onMouseEnter={() => onPatternHover(pattern.id)}
          onMouseLeave={() => onPatternHover(null)}
          onClick={() => onPatternClick(pattern)}
          className="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105"
          style={{
            backgroundColor: hoveredPatternId === pattern.id ? 'var(--accent-yellow, #FBBF24)' : 'var(--accent-yellow, #FBBF24)30',
            color: hoveredPatternId === pattern.id ? '#000' : 'var(--accent-yellow, #FBBF24)',
            border: '1px solid var(--accent-yellow, #FBBF24)',
          }}
          title={pattern.explanation}
        >
          {pattern.template}
        </button>
      ))}
    </div>
  );
};
```

### 6. New Component: `SemanticUnitPopover.tsx`

Create file: `components/sentence-mode/SemanticUnitPopover.tsx`

```typescript
import React, { useEffect, useRef } from 'react';
import { SemanticUnit, VocabularyType } from '../../types';

interface SemanticUnitPopoverProps {
  unit: SemanticUnit;
  position: { x: number; y: number };
  onAddToVocabulary: (text: string, type: VocabularyType) => void;
  onClose: () => void;
}

const COLOR_MAP = {
  word: '#60A5FA',
  collocation: '#A78BFA',
  pattern: '#FBBF24'
};

export const SemanticUnitPopover: React.FC<SemanticUnitPopoverProps> = ({
  unit,
  position,
  onAddToVocabulary,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const adjustedPosition = {
    x: Math.max(10, Math.min(position.x, window.innerWidth - 250)),
    y: Math.max(10, position.y - 70),
  };

  const getVocabularyType = (): VocabularyType => {
    if (unit.type === 'pattern') return 'pattern';
    if (unit.text.includes(' ')) return 'collocation';
    return 'word';
  };

  const typeLabel = getVocabularyType();
  const typeColor = COLOR_MAP[typeLabel];

  return (
    <div
      ref={popoverRef}
      className="fixed z-[100] glass-panel rounded-lg p-3 shadow-xl border animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        transform: 'translateX(-50%)',
        minWidth: '200px',
      }}
    >
      <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
        Add to vocabulary:
      </div>
      <div
        className="font-medium mb-3 truncate"
        style={{ color: typeColor }}
      >
        "{unit.text}"
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToVocabulary(unit.text, typeLabel);
          }}
          className="flex-1 py-2 rounded-md text-sm font-medium transition-colors text-white"
          style={{ backgroundColor: typeColor }}
        >
          Add as {typeLabel}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
```

### 7. New Icon: `MagicWandIcon` (`components/Icons.tsx`)

Add after `SparklesIcon` (around line 96):

```typescript
export const MagicWandIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6l-2.25-2.25M19.5 9l-2.25-2.25M16.5 12l-2.25-2.25M19.5 15l-2.25-2.25M16.5 18l-2.25-2.25" />
    </svg>
);
```

### 8. Modify: `SentenceInfoCard.tsx`

Key changes to `components/sentence-mode/cards/SentenceInfoCard.tsx`:

**Add new imports:**
```typescript
import { MagicWandIcon } from '../../Icons';
import { analyzeSentence } from '../../../services/llmService';
import { SentenceAnalysis, SemanticUnit } from '../../../types';
import { InteractiveSentenceRenderer } from '../InteractiveSentenceRenderer';
import { PatternChips } from '../PatternChips';
import { SemanticUnitPopover } from '../SemanticUnitPopover';
```

**Add state after existing state (around line 75):**
```typescript
// Semantic analysis state
const [analysisState, setAnalysisState] = useState<{
  status: 'none' | 'loading' | 'completed' | 'error';
  data?: SentenceAnalysis;
  error?: string;
}>({ status: 'none' });

const [hoveredPatternId, setHoveredPatternId] = useState<string | null>(null);

const [selectedUnit, setSelectedUnit] = useState<{
  unit: SemanticUnit;
  position: { x: number; y: number };
} | null>(null);
```

**Add handlers after `handleCloseSelection` (around line 163):**
```typescript
// Handler for magic analyze button
const handleMagicAnalyze = useCallback(async () => {
  // Check if already analyzed
  if (sentence.analysis) {
    setAnalysisState({ status: 'completed', data: sentence.analysis });
    return;
  }

  setAnalysisState({ status: 'loading' });

  const result = await analyzeSentence(sentence.en, sentence.zh);

  if (result.success && result.data) {
    setAnalysisState({ status: 'completed', data: result.data });
    // Persist to sentence
    if (onUpdateSentence) {
      onUpdateSentence(sentence.id, { analysis: result.data });
    }
  } else {
    setAnalysisState({
      status: 'error',
      error: result.error || 'Analysis failed'
    });
  }
}, [sentence, onUpdateSentence]);

// Handler for semantic unit clicks
const handleUnitClick = useCallback((unit: SemanticUnit, position: { x: number; y: number }) => {
  setSelectedUnit({ unit, position });
}, []);

// Handler for pattern chip clicks
const handlePatternClick = useCallback((pattern: SentenceAnalysis['patterns'][0]) => {
  // Convert pattern to semantic unit
  setSelectedUnit({
    unit: {
      text: pattern.matchedText || pattern.template,
      type: 'pattern',
      startIndex: 0,
      endIndex: pattern.matchedText?.length || pattern.template.length,
      patternId: pattern.id,
    },
    position: { x: window.innerWidth / 2, y: 200 },
  });
}, []);

// Handler for adding from popover
const handleAddFromPopover = useCallback((text: string, type: VocabularyType) => {
  if (onAddVocabulary) {
    onAddVocabulary(text, type);
  }
  setSelectedUnit(null);
}, [onAddVocabulary]);
```

**Modify the Source Text section (around line 260-295):**
Replace the existing source text section with:

```typescript
{/* Source Text */}
<div className="mb-6 group/source">
  <div className="flex items-center gap-2 mb-3">
    <span className="text-xs font-mono uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
      {sourceLabel}
    </span>
    <button
      onClick={() => playTextToSpeech(sourceText)}
      className="p-1 hover:opacity-80 transition-opacity"
      style={{ color: 'var(--text-secondary)' }}
      title="Read Aloud"
    >
      <SpeakerIcon />
    </button>

    {/* Analysis status indicator */}
    {analysisState.status === 'loading' && (
      <span className="text-xs" style={{ color: 'var(--accent-blue, #60A5FA)' }}>
        Analyzing...
      </span>
    )}
    {analysisState.status === 'error' && (
      <span className="text-xs text-red-400" title={analysisState.error}>
        Analysis failed
      </span>
    )}
  </div>

  <div className="relative">
    {/* Interactive or static text rendering */}
    {analysisState.status === 'completed' && analysisState.data && isEnToZh ? (
      <InteractiveSentenceRenderer
        sentence={sourceText}
        analysis={analysisState.data}
        onUnitClick={handleUnitClick}
        hoveredPatternId={hoveredPatternId}
      />
    ) : (
      <p
        className="text-xl leading-relaxed font-serif-sc select-text cursor-text"
        style={{ color: 'var(--text-main)' }}
        onMouseUp={handleMouseUp}
      >
        {sourceText}
      </p>
    )}

    {/* Edit button - top right */}
    {onUpdateSentence && (
      <button
        onClick={() => setEditingField(sourceField as 'en' | 'zh')}
        className="absolute top-0 right-0 p-2 rounded-lg opacity-0 group-hover/source:opacity-100 transition-opacity hover:bg-[var(--surface-hover)] cursor-pointer"
        style={{ color: 'var(--text-secondary)' }}
        title={`Edit ${sourceLabel} text`}
      >
        <PencilIcon />
      </button>
    )}

    {/* Magic Analyze Button - Below edit icon, only for English in EN_TO_ZH mode */}
    {isEnToZh && onUpdateSentence && (
      <button
        onClick={handleMagicAnalyze}
        disabled={analysisState.status === 'loading'}
        className="absolute top-8 right-0 p-2 rounded-lg opacity-0 group-hover/source:opacity-100 transition-all hover:scale-110 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
        style={{
          color: analysisState.status === 'completed' ? 'var(--accent-yellow, #FBBF24)' : 'var(--text-secondary)',
          background: analysisState.status === 'completed' ? 'linear-gradient(135deg, #FBBF24, #F59E0B, #60A5FA, #A78BFA)' : 'transparent',
          WebkitBackgroundClip: analysisState.status === 'completed' ? 'text' : 'unset',
          WebkitTextFillColor: analysisState.status === 'completed' ? 'transparent' : 'inherit',
          backgroundClip: analysisState.status === 'completed' ? 'text' : 'unset',
        }}
        title={
          analysisState.status === 'completed' ? 'Sentence analyzed - click words to add vocabulary' :
          analysisState.status === 'loading' ? 'Analyzing...' :
          'AI Analyze - Click to find vocabulary'
        }
      >
        <MagicWandIcon />
      </button>
    )}
  </div>

  {/* Pattern Chips - Display below source text when analyzed */}
  {analysisState.status === 'completed' && analysisState.data?.patterns && isEnToZh && (
    <PatternChips
      patterns={analysisState.data.patterns}
      hoveredPatternId={hoveredPatternId}
      onPatternHover={setHoveredPatternId}
      onPatternClick={handlePatternClick}
    />
  )}
</div>
```

**Add the popover before the closing div (around line 420):**
```typescript
{/* Semantic Unit Popover */}
{selectedUnit && (
  <SemanticUnitPopover
    unit={selectedUnit.unit}
    position={selectedUnit.position}
    onAddToVocabulary={handleAddFromPopover}
    onClose={() => setSelectedUnit(null)}
  />
)}
```

---

## Critical Files Summary

| File | Action | Description |
|------|--------|-------------|
| `types.ts` | Modify | Add `SentenceAnalysis`, `SemanticUnit`, extend `LLMTaskType`, extend `SentencePair` |
| `server/llm/prompts.ts` | Modify | Add `'analyze-sentence'` task config |
| `services/llmService.ts` | Modify | Add `analyzeSentence()` function |
| `components/Icons.tsx` | Modify | Add `MagicWandIcon` |
| `components/sentence-mode/InteractiveSentenceRenderer.tsx` | Create | New component for rendering clickable semantic units |
| `components/sentence-mode/PatternChips.tsx` | Create | New component for pattern chips with sync-highlighting |
| `components/sentence-mode/SemanticUnitPopover.tsx` | Create | New confirmation popover for vocabulary addition |
| `components/sentence-mode/cards/SentenceInfoCard.tsx` | Modify | Integrate analysis state, magic button, interactive rendering |

---

## Implementation Sequence

### Phase 1: Foundation (Backend)
1. Add types to `types.ts`
2. Add LLM task to `server/llm/prompts.ts`
3. Add frontend service method to `services/llmService.ts`
4. Add `MagicWandIcon` to Icons

### Phase 2: Core Components (Frontend)
1. Create `InteractiveSentenceRenderer.tsx`
2. Create `PatternChips.tsx`
3. Create `SemanticUnitPopover.tsx`

### Phase 3: Integration
1. Modify `SentenceInfoCard.tsx` to add analysis state and UI
2. Wire up click handlers and vocabulary addition
3. Test end-to-end flow

### Phase 4: Polish
1. Add loading states and error handling
2. Fine-tune highlighting colors and transitions
3. Add keyboard accessibility (Escape to close popover)
4. Test with various sentence types

---

## Verification

To test the implementation:

1. **Manual Trigger Test**: Click magic wand button on a sentence, verify LLM analysis completes
2. **Persistence Check**: Refresh page, verify analysis persists (stored in SentencePair)
3. **Word Click**: Click a highlighted word, verify popover appears with "Add as word" option
4. **Phrase Click**: Click a highlighted phrase, verify "Add as collocation" option
5. **Pattern Click**: Click pattern chip, verify anchor words highlight in sentence, popover appears
6. **Vocabulary Addition**: Add item, verify it appears in vocabulary sidebar
7. **Error Handling**: Test with no LLM configured, verify friendly error message

---

## Notes

- **Stopword filtering**: Implemented in LLM prompt - filters basic stopwords but keeps prepositions
- **Mobile optimization**: Point-and-click interaction works better than text selection on touch devices
- **Backward compatibility**: `analysis` field is optional on `SentencePair`, existing sentences work unchanged
- **Color consistency**: Uses existing vocabulary system colors (blue/purple/yellow)
- **Performance**: Analysis results are persisted, "analyze once, interact everywhere"
