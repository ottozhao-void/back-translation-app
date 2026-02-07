# Hierarchical ID System Implementation

## Overview

This document summarizes the implementation of the hierarchical sentence ID system and tracks remaining tasks.

## Completed Work

### 1. Data Model Updates (`types.ts`)

```typescript
type SourceType = 'article' | 'paragraph' | 'sentence';

interface SentencePair {
  id: string;              // UUID (sent_xxx)
  en: string;
  zh: string;

  // Hierarchical relationship fields
  sourceType: SourceType;  // Import mode
  articleId?: string;      // Article ID (only for article mode)
  paragraphId?: string;    // Paragraph ID (article/paragraph mode)
  order: number;           // Position within paragraph (-1 for sentence mode)

  // User data & metadata
  tags?: string[];
  createdAt: number;
  userTranslationZh?: UserTranslation;
  userTranslationEn?: UserTranslation;
  // ...
}
```

### 2. Sentence Loader Updates (`utils/sentenceLoader.ts`)

**New creation functions:**
- `createSentenceModePairs()` - For batch/line-by-line import
- `createParagraphModePairs()` - For single paragraph import
- `createArticleModePairs()` - For multi-paragraph import

**New helper functions:**
- `getParagraphContext(sentence, allSentences)` - Get sentences in same paragraph
- `getArticleContext(sentence, allSentences)` - Get sentences in same article
- `groupByParagraph(sentences)` - Group sentences by paragraph

**Migration support:**
- `migrateSentence()` - Migrate legacy sentence to new format
- `migrateAllSentences()` - Batch migration

### 3. Import Modal Redesign (`components/sentence-mode/ImportModal.tsx`)

- Mode selection screen (Article / Paragraph / Sentence)
- Format validation per mode:
  - **Article**: Detects paragraph separators (blank lines), EN/ZH paragraph count must match
  - **Paragraph**: No blank lines allowed
  - **Sentence**: One sentence per line, line counts must match
- Paragraph separator markers for article mode alignment

---

## Pending Tasks

### Task 1: Sentence Detail View (句子详情界面)

**Goal:** 创建一个专属的句子 UI 界面，作为句子的信息中心，练习功能通过按钮进入

**Current behavior:** 点击句子 → 直接显示 Practice 面板

**Target behavior:** 点击句子 → 显示句子详情界面 → 点击"开始练习"按钮进入练习界面

#### 句子详情界面结构

```
┌─────────────────────────────────────────────────────────────┐
│  Sentence Detail View                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 📄 Sentence Content                                  │    │
│  │ EN: "The quick brown fox jumps over the lazy dog."  │    │
│  │ ZH: "敏捷的棕色狐狸跳过了懒狗。"                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 📍 Context Navigation                                │    │
│  │ [Paragraph] [Article] (if available)                 │    │
│  │ Clicking updates sidebar to show related sentences   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ⏱️ Practice Stats                                    │    │
│  │ Total attempts: 5 | Avg: 45s | Best: 30s            │    │
│  │ Last practiced: 2 days ago                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 📚 Vocabulary (future feature)                       │    │
│  │ Marked words: ["vocabulary", "practice", ...]        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           [ 🎯 Start Practice ]                      │    │
│  │    Large CTA button to enter practice mode           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 界面状态流转

```
SentenceDetailView (默认状态)
    │
    │ 用户点击 "Start Practice" 按钮
    ▼
PracticeSession (练习状态)
    │
    │ 用户完成练习/点击返回
    ▼
SentenceDetailView (显示更新后的统计)
```

#### 功能模块详解

**Module 1: Sentence Content (句子内容展示)**
- 显示英文原文和中文翻译
- 可折叠/展开（用户可选择隐藏某一语言）
- 支持 TTS 朗读（如果已配置）

**Module 2: Context Navigation (上下文导航)**
- 显示当前句子的层级关系：`sourceType` / `paragraphId` / `articleId`
- 点击 "Paragraph" → 更新左侧 Sidebar，只显示同 `paragraphId` 的句子，按 `order` 排序
- 点击 "Article" → 更新左侧 Sidebar，只显示同 `articleId` 的句子，按 `order` 排序
- 对于 `sourceType: 'sentence'` 的独立句子，不显示导航按钮

**Module 3: Practice Stats (练习统计)**
- 历史统计：
  - 总练习次数
  - 平均用时
  - 最佳用时
  - 最近练习时间
- 不包含实时计时（计时在练习界面中进行）

**Module 4: Vocabulary Markers (词汇标记) - Future**
- 显示用户在该句子中标记的生词
- 支持点击单词进行标记/取消标记
- 词汇数据存储在句子的扩展字段中

**Module 5: Practice Entry (练习入口)**
- 大号 CTA 按钮 "Start Practice" 或 "🎯 开始练习"
- 点击后进入练习界面（现有的 `SentencePracticeArea` 或新的 `PracticeSession`）
- 可选：显示上次练习的模式（EN→ZH 或 ZH→EN）

#### 组件设计

```tsx
// SentenceDetailView.tsx
interface SentenceDetailViewProps {
  sentence: SentencePair;
  allSentences: SentencePair[];
  onShowParagraphContext: () => void;
  onShowArticleContext: () => void;
  onStartPractice: (mode: PracticeMode) => void;
}

// 内部状态
type ViewState = 'detail' | 'practice';

const SentenceDetailView: React.FC<SentenceDetailViewProps> = ({
  sentence,
  allSentences,
  onShowParagraphContext,
  onShowArticleContext,
  onStartPractice,
}) => {
  const [viewState, setViewState] = useState<ViewState>('detail');

  if (viewState === 'practice') {
    return (
      <PracticeSession
        sentence={sentence}
        onComplete={() => setViewState('detail')}
        onBack={() => setViewState('detail')}
      />
    );
  }

  return (
    <div className="sentence-detail-view">
      {/* Sentence Content */}
      <SentenceContent sentence={sentence} />

      {/* Context Navigation */}
      {sentence.sourceType !== 'sentence' && (
        <ContextNavigation
          sentence={sentence}
          onShowParagraph={onShowParagraphContext}
          onShowArticle={onShowArticleContext}
        />
      )}

      {/* Practice Stats */}
      <PracticeStats stats={sentence.practiceStats} />

      {/* Vocabulary (future) */}
      {sentence.markedWords && (
        <VocabularySection words={sentence.markedWords} />
      )}

      {/* Practice Entry */}
      <button
        onClick={() => setViewState('practice')}
        className="practice-cta"
      >
        🎯 Start Practice
      </button>
    </div>
  );
};
```

---

### Task 2: Sidebar Context Filtering (侧边栏上下文过滤)

**Goal:** 支持从句子详情界面触发 Sidebar 的上下文过滤

**Interaction Flow:**

```
用户点击句子 A (paragraphId: "para_123", order: 2)
    │
    ▼
显示句子详情界面
    │
    ▼
用户点击 [Paragraph] 按钮
    │
    ▼
Sidebar 更新：
  - 只显示 paragraphId === "para_123" 的句子
  - 按 order 字段排序 (0, 1, 2, 3...)
  - 高亮当前句子 (order: 2)
  - 显示返回按钮 "← All Sentences"
```

**Implementation:**

```tsx
// SentenceMode.tsx - 添加过滤状态
const [contextFilter, setContextFilter] = useState<{
  type: 'all' | 'paragraph' | 'article';
  id?: string;
} | null>(null);

// 过滤逻辑
const filteredSentences = useMemo(() => {
  if (!contextFilter || contextFilter.type === 'all') {
    return sentences;
  }
  if (contextFilter.type === 'paragraph') {
    return sentences
      .filter(s => s.paragraphId === contextFilter.id)
      .sort((a, b) => a.order - b.order);
  }
  if (contextFilter.type === 'article') {
    return sentences
      .filter(s => s.articleId === contextFilter.id)
      .sort((a, b) => a.order - b.order);
  }
  return sentences;
}, [sentences, contextFilter]);

// 传递给 SentenceDetailView
<SentenceDetailView
  sentence={selectedSentence}
  onShowParagraphContext={() => setContextFilter({
    type: 'paragraph',
    id: selectedSentence.paragraphId
  })}
  onShowArticleContext={() => setContextFilter({
    type: 'article',
    id: selectedSentence.articleId
  })}
/>
```

---

### Task 3: Practice Timer & Stats (练习计时与统计)

**Goal:** 实现单句练习的计时和历史统计功能

**Data Model Extension:**

```typescript
interface SentencePair {
  // ... existing fields ...

  // Practice statistics (new)
  practiceStats?: {
    attempts: number;           // 总练习次数
    totalTimeMs: number;        // 总用时（毫秒）
    bestTimeMs?: number;        // 最佳用时
    lastAttemptMs?: number;     // 最近一次用时
    history?: {                 // 历史记录（可选，保留最近N次）
      timestamp: number;
      durationMs: number;
      score?: number;
    }[];
  };
}
```

**Timer Implementation:**

```tsx
// usePracticeTimer hook
const usePracticeTimer = (sentenceId: string) => {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const start = () => setStartTime(Date.now());
  const stop = () => {
    if (startTime) {
      const duration = Date.now() - startTime;
      setStartTime(null);
      return duration;
    }
    return 0;
  };

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);
    return () => clearInterval(interval);
  }, [startTime]);

  return { elapsed, start, stop, isRunning: !!startTime };
};
```

---

### Task 4: Vocabulary Marking System (词汇标记系统) - Future

**Goal:** 允许用户标记句子中不认识的单词

**Data Model Extension:**

```typescript
interface SentencePair {
  // ... existing fields ...

  // Vocabulary markers (future)
  markedWords?: {
    en?: MarkedWord[];   // 英语生词
    zh?: MarkedWord[];   // 中文生词
  };
}

interface MarkedWord {
  word: string;           // 单词/词组
  startIndex: number;     // 在原文中的起始位置
  endIndex: number;       // 在原文中的结束位置
  addedAt: number;        // 标记时间
  note?: string;          // 用户笔记
  mastered?: boolean;     // 是否已掌握
}
```

**UI Interaction:**
- 在句子详情界面，显示原文时高亮已标记的单词
- 用户可以选中文本来添加新的词汇标记
- 显示该句子的词汇列表，支持删除和标记为"已掌握"

---

### Task 5: Tags Filtering System

**Goal:** Leverage the `tags` field for flexible filtering

**Features:**
- Add tags during import
- Edit tags on existing sentences
- Filter sidebar by tag
- Quick filters: "needs review", "difficult", custom tags

**UI Location:** Settings or dedicated Tags Manager

---

### Task 6: Data Migration on App Startup

**Goal:** Automatically migrate legacy data when app loads

**Implementation location:** `views/SentenceMode.tsx` or `index.tsx`

```typescript
import { migrateAllSentences, fetchSentences, saveSentences } from '../utils/sentenceLoader';

useEffect(() => {
  const migrateData = async () => {
    const sentences = await fetchSentences();
    const migrated = migrateAllSentences(sentences);

    // Only save if changes were made
    const hasChanges = sentences.some((s, i) =>
      s.sourceType !== migrated[i].sourceType ||
      s.order !== migrated[i].order
    );

    if (hasChanges) {
      await saveSentences(migrated);
    }
  };

  migrateData();
}, []);
```

---

## File Changes Summary

| File | Status | Changes |
|------|--------|---------|
| `types.ts` | ✅ Done | Added `SourceType`, updated `SentencePair`, updated `SentenceFilterType` |
| `utils/sentenceLoader.ts` | ✅ Done | New creation/helper/migration functions |
| `utils/sentenceSplitter.ts` | ✅ Done | Adapted to new data model |
| `components/sentence-mode/ImportModal.tsx` | ✅ Done | Mode selection + validation |
| `components/sentence-mode/SentenceDetailView.tsx` | ⏳ Pending | **New component** - 句子详情界面 |
| `components/sentence-mode/SentenceSidebar.tsx` | ⏳ Pending | Context filtering support |
| `components/sentence-mode/PracticeStats.tsx` | ⏳ Pending | **New component** - 练习统计模块 |
| `views/SentenceMode.tsx` | ⏳ Pending | Context filter state, component integration |

---

## Implementation Priority

| Priority | Task | Complexity | Dependencies |
|----------|------|------------|--------------|
| 🔴 High | Task 1: Sentence Detail View | Medium | None |
| 🔴 High | Task 2: Sidebar Context Filtering | Low | Task 1 |
| 🟡 Medium | Task 3: Practice Timer & Stats | Medium | Task 1 |
| 🟡 Medium | Task 6: Data Migration | Low | None |
| 🟢 Low | Task 5: Tags Filtering | Medium | None |
| 🟢 Low | Task 4: Vocabulary Marking | High | Task 1 |

---

## Design Decisions

1. **Flat storage + relation fields**: Avoids multi-table sync issues, simple queries
2. **Progressive migration**: Old data auto-upgrades, no manual migration needed
3. **Mode selection upfront**: User specifies text structure first, reduces errors
4. **Paragraph markers**: `---PARAGRAPH---` markers preserve structure through alignment editor
5. **Sentence Detail View as container**: Practice panel becomes a submodule, enabling future extensions (stats, vocabulary)
6. **Context filtering via state**: Sidebar content controlled by parent component state, not internal navigation
