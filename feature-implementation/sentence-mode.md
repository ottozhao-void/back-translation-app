
# 功能性需求和初步想法

新增 Sentence mode: 在该模式下，基本回译单元是 `Chinese-English` 对，简称回译对。

回译对的来源有两种，一种是来自于用户上传文章，即用户上传文章，然后系统自动分解为句子，这一操作基于两种实现，非 LLM 句子解构，LLM 句子结构。前者是传统算法，后者是调用 LLM API（暂不实现）。另一种是用户上传句子。不论是哪种方式，必须要求用户上传译文。

句子之间采用软关联方式，即每个句子都有一个 `sourceType`。同一篇文章中的句子具有相同的 `sourceType` 值，即文章的文章 ID，用户从网上摘抄并添加的句子具有另一个相同的 `sourceType`。

在按照上述关联方式实现后，现有的 Article 界面中的每一篇文章本质上是 `sourceType` 相同的句子集合。每个句子具有一个唯一的 ID，其中属于同一文章中的句子其 ID 规则为 `文章ID` + `段落ID` + 句子之间的顺序 ID。对于用户直接上传的句子，设计合理的 `sourceType` 和 ID。

将文章看成根据 `sourceType` 过滤而收集到的回译对集合的话，那么每次用户的回译练习就是在按照回译对某属性（现在只有 `sourceType`）过滤后所收集到的集合上练习。目前只有三种：按照文章、按照添加时间和随机

UI 和 UX 设计：采用极简风格。整体布局为左右分栏，左侧为侧边栏，显示收集到的回译对（按文章），用户通过点击回译对，右侧内容区会显示相关的内容。内容区上部为原文，可通过按钮来切换是英译中还是中译英，下方为用户输入区，依旧延续使用目前的自动保存逻辑。

当用户点击提交按钮后，在原文的位置显示其相对应的正确译文，不需要任何其他操作，如现有的 diff 和 LLM，这些都要被移除掉。

上述的交互 UI 和 UX，应该是一个可以通用的模块，对于不同的练习场景只需要将收集到的回译对替换掉即可。

在 Article Tab 旁边，添加一个 "SentenceBase" 来显示所有的回译对，默认按照添加时间排序。

对于现在的 Paragraph 模式，在设置中保留一个开启该模式的设置项，用户可自行开启，默认不开启。

---

# 详细设计文档

## 1. 架构概览

### 1.1 核心设计理念

**句子为中心 (Sentence-Centric Architecture)**：系统的基本存储和练习单元是「回译对」(Sentence Pair)，而非段落或文章。文章和段落被视为根据句子 `sourceType` 属性聚合而成的视图。

```
┌─────────────────────────────────────────────────────────────────┐
│                        SentenceBase                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Sentence │  │ Sentence │  │ Sentence │  │ Sentence │  ...   │
│  │ (Art A)  │  │ (Art A)  │  │ (Art B)  │  │ (Manual) │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────┴────────────────────┐
         │            Filter by sourceType          │
         └────────────────────┬────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   ┌──────────┐        ┌──────────┐        ┌──────────┐
   │ Article A │        │ Article B │        │  Manual  │
   │  View     │        │  View     │        │  Uploads │
   └──────────┘        └──────────┘        └──────────┘
```

### 1.2 数据流

```
用户上传文章 ──┬──> splitIntoSentences() ──> 生成 Sentence[] ──> 存储到 sentences.json
              │
用户添加句子 ──┘

sentences.json <──> SentenceLoader (CRUD) <──> React State <──> UI Views
```

---

## 2. 数据模型设计

### 2.1 新增类型定义 (`types.ts`)

```typescript
// === Sentence Mode Types ===

/**
 * 回译对 - 系统的基本单元
 */
export interface SentencePair {
  id: string;                    // 唯一ID，格式见下方规则
  en: string;                    // 英文原文
  zh: string;                    // 中文原文

  // 来源信息
  sourceType: string;            // 来源标识：articleId | 'manual' | 自定义标签
  sourceIndex?: number;          // 在原文中的顺序索引（仅来自文章时有值）
  paragraphId?: string;          // 所属段落ID（仅来自文章时有值）

  // 用户练习数据
  userTranslationZh?: UserTranslation;  // EN->ZH 模式的用户译文
  userTranslationEn?: UserTranslation;  // ZH->EN 模式的用户译文

  // 元数据
  createdAt: number;             // 创建时间戳
  lastPracticed?: number;        // 最后练习时间
  tags?: string[];               // 用户自定义标签（可选，后续扩展）
}

/**
 * ID 生成规则：
 * - 来自文章: `{articleId}_{paragraphId}_{sentenceIndex}`
 *   例如: `article_123_p0_s0`, `article_123_p0_s1`
 * - 用户手动添加: `manual_{timestamp}_{randomSuffix}`
 *   例如: `manual_1766636093980_a1b2`
 */

/**
 * 句子库存储结构
 */
export interface SentenceStore {
  version: number;               // 数据版本号，用于迁移
  sentences: SentencePair[];     // 所有回译对
  lastModified: number;          // 最后修改时间
}

/**
 * 过滤/分组选项
 */
export type SentenceFilterType =
  | { type: 'article'; articleId: string }   // 按文章筛选
  | { type: 'time'; order: 'asc' | 'desc' }  // 按时间排序
  | { type: 'random'; count?: number }       // 随机抽取
  | { type: 'tag'; tag: string };            // 按标签筛选（预留）
```

### 2.2 更新 AppSettings

```typescript
export interface AppSettings {
  autoSave: {
    enabled: boolean;
    delay: number;
  };
  llmThreshold: number;
  hotkeys: { [commandId: string]: string };

  // 新增：练习模式设置
  practiceGranularity: 'sentence' | 'paragraph';  // 默认 'sentence'
}
```

---

## 3. 存储设计

### 3.1 文件结构

```
public/
├── articles/                    # 现有文章存储（保留用于兼容）
│   ├── article_1.json
│   └── article_2.json
└── data/                        # 新增：核心数据目录
    └── sentences.json           # 句子库主文件
```

### 3.2 sentences.json 示例

```json
{
  "version": 1,
  "lastModified": 1766636093980,
  "sentences": [
    {
      "id": "article_123_p0_s0",
      "en": "The essence of learning is tranquility.",
      "zh": "学习的本质是宁静。",
      "sourceType": "article_123",
      "sourceIndex": 0,
      "paragraphId": "p0",
      "createdAt": 1766636093980,
      "lastPracticed": 1766877298717,
      "userTranslationZh": {
        "text": "学习的精髓在于平静。",
        "type": "diff",
        "timestamp": 1766877298717,
        "score": 85
      }
    },
    {
      "id": "manual_1766700000000_x1y2",
      "en": "Practice makes perfect.",
      "zh": "熟能生巧。",
      "sourceType": "manual",
      "createdAt": 1766700000000
    }
  ]
}
```

### 3.3 服务端 API 扩展 (`server.js`)

```javascript
// GET /api/sentences - 获取所有句子
// POST /api/sentences - 保存句子库
// POST /api/sentences/import - 从文章导入句子
```

---

## 4. 核心模块设计

### 4.1 句子加载器 (`utils/sentenceLoader.ts`)

```typescript
// 核心功能：
export const fetchSentences = async (): Promise<SentencePair[]>
export const saveSentences = async (sentences: SentencePair[]): Promise<boolean>
export const importFromArticle = async (article: Article): Promise<SentencePair[]>
export const addSentence = async (en: string, zh: string): Promise<SentencePair>
export const deleteSentence = async (id: string): Promise<boolean>

// 辅助功能：
export const filterSentences = (sentences: SentencePair[], filter: SentenceFilterType): SentencePair[]
export const groupBySource = (sentences: SentencePair[]): Map<string, SentencePair[]>
```

### 4.2 句子分解器 (`utils/sentenceSplitter.ts`)

```typescript
import { splitIntoSentences } from './textUtils';

/**
 * 将段落分解为句子对
 * 使用现有的 splitIntoSentences 函数
 */
export const splitParagraphToSentences = (
  enText: string,
  zhText: string,
  articleId: string,
  paragraphId: string
): SentencePair[] => {
  const enSentences = splitIntoSentences(enText);
  const zhSentences = splitIntoSentences(zhText);

  const maxLen = Math.max(enSentences.length, zhSentences.length);
  const pairs: SentencePair[] = [];

  for (let i = 0; i < maxLen; i++) {
    pairs.push({
      id: `${articleId}_${paragraphId}_s${i}`,
      en: enSentences[i] || '',
      zh: zhSentences[i] || '',
      sourceType: articleId,
      sourceIndex: i,
      paragraphId,
      createdAt: Date.now()
    });
  }

  return pairs;
};
```

---

## 5. UI/UX 设计 (Progressive Disclosure Pattern)

### 5.1 设计原则

遵循 **Progressive Disclosure** 原则：
- **减少认知负荷**：用户一次只看到必要的信息
- **层级导航**：第一层级展示来源分类，第二层级展示具体句子
- **流畅过渡**：使用动画引导用户注意力
- **极简主义**：移除 Articles Tab，统一为 SentenceBase 单一入口

### 5.2 整体布局

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SentenceBase                                      [Settings] [Theme]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌────────────────────────────────────────────┐   │
│  │    Sidebar       │  │              Content Area                   │   │
│  │  (Progressive)   │  │                                             │   │
│  │                  │  │   ┌────────────────────────────────────┐   │   │
│  │  Level 1:        │  │   │         Original Text              │   │   │
│  │  ┌────────────┐  │  │   │  "The essence of learning..."      │   │   │
│  │  │ Article A  │──┼──┼─→ │                        [EN↔ZH] [🔊]│   │   │
│  │  │ 12 句子    │  │  │   └────────────────────────────────────┘   │   │
│  │  └────────────┘  │  │                                             │   │
│  │  ┌────────────┐  │  │   ┌────────────────────────────────────┐   │   │
│  │  │ Article B  │  │  │   │         Your Translation           │   │   │
│  │  │ 8 句子     │  │  │   │                                     │   │   │
│  │  └────────────┘  │  │   │  [Textarea...]                      │   │   │
│  │  ┌────────────┐  │  │   │                                     │   │   │
│  │  │ Manual     │  │  │   │                        [Submit]     │   │   │
│  │  │ 3 句子     │  │  │   └────────────────────────────────────┘   │   │
│  │  └────────────┘  │  │                                             │   │
│  │                  │  │                                             │   │
│  │  [+ 添加句子]    │  │                                             │   │
│  │  [+ 导入文章]    │  │                                             │   │
│  └──────────────────┘  └────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Sidebar 两级导航状态

#### Level 1: 来源分类视图 (Source Categories)

```
┌──────────────────────┐
│  SOURCES             │  ← 标题
├──────────────────────┤
│                      │
│  ┌────────────────┐  │
│  │ 📄 The Art of  │  │  ← 文章卡片
│  │    Translation │  │
│  │    ──────────  │  │
│  │    12 句子  ●● │  │  ← 句子数 + 进度指示器
│  └────────────────┘  │
│                      │
│  ┌────────────────┐  │
│  │ 📄 Learning    │  │
│  │    English     │  │
│  │    ──────────  │  │
│  │    8 句子   ●○ │  │
│  └────────────────┘  │
│                      │
│  ┌────────────────┐  │
│  │ ✏️  Manual     │  │  ← 手动添加分类
│  │    Uploads     │  │
│  │    ──────────  │  │
│  │    3 句子   ○○ │  │
│  └────────────────┘  │
│                      │
├──────────────────────┤
│  [+ 添加句子]        │  ← 快捷操作
│  [+ 导入文章]        │
└──────────────────────┘

进度指示器说明：
● 已完成 (>80% 句子已练习)
◐ 进行中 (1-80% 句子已练习)
○ 未开始 (0% 句子已练习)
```

#### Level 2: 句子列表视图 (Sentence List)

点击来源分类后，sidebar 过渡到句子列表：

```
┌──────────────────────┐
│  ← The Art of Trans  │  ← 返回按钮 + 来源名称
├──────────────────────┤
│                      │
│  ┌────────────────┐  │
│  │ 1. The essence │  │  ← 句子预览 (截断显示)
│  │    of learning │  │
│  │           ● EN │  │  ← 练习状态 + 当前语言
│  └────────────────┘  │
│                      │
│  ┌────────────────┐  │  ← 当前选中项高亮
│  │ 2. Practice    │▌ │
│  │    makes per...│▌ │
│  │           ◐ EN │▌ │
│  └────────────────┘  │
│                      │
│  ┌────────────────┐  │
│  │ 3. Knowledge   │  │
│  │    is power... │  │
│  │           ○ EN │  │  ← 未练习状态
│  └────────────────┘  │
│                      │
│  ... (可滚动)        │
│                      │
├──────────────────────┤
│  1 / 12              │  ← 进度指示
└──────────────────────┘

状态图标：
● 已提交 (绿色)
◐ 草稿 (黄色)
○ 未开始 (灰色)
```

### 5.4 状态转换动画

```typescript
// Sidebar 状态管理
type SidebarLevel =
  | { level: 'sources' }                           // 第一层：来源列表
  | { level: 'sentences'; sourceType: string };    // 第二层：句子列表

// 过渡动画
const transitions = {
  // 进入第二层：向左滑入
  enterSentences: 'transform translate-x-0 opacity-100',
  exitSources: 'transform -translate-x-full opacity-0',

  // 返回第一层：向右滑入
  enterSources: 'transform translate-x-0 opacity-100',
  exitSentences: 'transform translate-x-full opacity-0',

  // 动画时长
  duration: 'duration-300 ease-out'
};
```

### 5.5 组件层级 (更新版)

```
App (index.tsx)
└── SentenceBase (唯一主视图，移除 Articles Tab)
    ├── Sidebar (Progressive Disclosure)
    │   ├── SourceListView (Level 1)
    │   │   ├── SourceCard (来源卡片，显示进度)
    │   │   └── ActionButtons (添加句子/导入文章)
    │   └── SentenceListView (Level 2)
    │       ├── BackButton (返回上一层)
    │       ├── SentenceItem (句子条目)
    │       └── ProgressIndicator
    │
    ├── PracticeArea (右侧内容区)
    │   ├── OriginalCard (原文/译文切换)
    │   ├── TranslationInput (用户输入)
    │   └── SubmitButton
    │
    └── Modals
        ├── AddSentenceModal (添加单个句子)
        └── ImportArticleModal (导入文章)
```

### 5.6 关键组件接口设计

#### Sidebar (带状态管理)

```typescript
interface SidebarProps {
  sentences: SentencePair[];
  selectedId: string | null;
  onSelectSentence: (id: string) => void;
  onAddSentence: () => void;
  onImportArticle: () => void;
}

// 内部状态
interface SidebarState {
  level: SidebarLevel;
  animationDirection: 'left' | 'right' | null;
}

// 核心交互
const Sidebar: React.FC<SidebarProps> = (props) => {
  const [state, setState] = useState<SidebarState>({
    level: { level: 'sources' },
    animationDirection: null
  });

  const navigateToSentences = (sourceType: string) => {
    setState({
      level: { level: 'sentences', sourceType },
      animationDirection: 'left'
    });
  };

  const navigateBack = () => {
    setState({
      level: { level: 'sources' },
      animationDirection: 'right'
    });
  };

  // ... render based on state.level
};
```

#### SourceCard (来源卡片)

```typescript
interface SourceCardProps {
  sourceType: string;
  title: string;                    // 文章标题或 "Manual Uploads"
  sentenceCount: number;
  practicedCount: number;
  onClick: () => void;
}

// 视觉设计
// - 使用 glass-panel 样式
// - 悬停时轻微上浮 (translateY -2px)
// - 进度条使用渐变色
```

#### SentenceItem (句子条目)

```typescript
interface SentenceItemProps {
  sentence: SentencePair;
  isSelected: boolean;
  practiceMode: PracticeMode;
  onClick: () => void;
}

// 显示内容：
// - 序号
// - 句子预览 (根据 practiceMode 显示 en 或 zh，截断至 30 字符)
// - 练习状态图标
// - 当前选中高亮边框
```

#### PracticeArea (练习区域)

```typescript
interface PracticeAreaProps {
  sentence: SentencePair | null;     // null 时显示空状态
  mode: PracticeMode;
  onModeToggle: () => void;
  onSubmit: (text: string) => void;
  appSettings: AppSettings;
}

// 状态流程：
// 1. 初始：显示原文 + 空输入框
// 2. 输入中：自动保存为草稿
// 3. 提交后：原文区域替换为参考译文
// 4. 可点击"继续编辑"返回输入状态
```

### 5.7 空状态设计

```
┌────────────────────────────────────────────┐
│                                            │
│                                            │
│            📚                              │
│                                            │
│      选择一个句子开始练习                   │
│                                            │
│      或者从左侧添加新内容                   │
│                                            │
│                                            │
└────────────────────────────────────────────┘
```

### 5.8 响应式设计

```typescript
// 断点设计
const breakpoints = {
  mobile: '< 768px',    // 侧边栏覆盖全屏，点击句子后滑入练习区
  tablet: '768-1024px', // 侧边栏 280px 固定
  desktop: '> 1024px'   // 侧边栏 320px 固定
};

// 移动端特殊处理
// - Level 1 和 Level 2 都是全屏
// - 练习区也是全屏
// - 使用 slide 动画在三个"屏幕"间切换
```

### 5.9 交互细节

| 交互 | 行为 | 动画 |
|------|------|------|
| 点击来源卡片 | 进入句子列表 | 向左滑动 300ms ease-out |
| 点击返回按钮 | 返回来源列表 | 向右滑动 300ms ease-out |
| 点击句子条目 | 右侧显示练习内容 | 淡入 200ms |
| 提交翻译 | 原文替换为参考译文 | 翻转动画 400ms |
| 切换 EN↔ZH | 切换显示语言 | 淡出淡入 150ms |

### 5.10 Glassmorphism 样式规范

```css
/* 延续现有 glass-panel 样式 */
.source-card {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.source-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  cursor: pointer;
}

.sentence-item {
  background: transparent;
  border-left: 3px solid transparent;
  transition: all 0.15s;
}

.sentence-item:hover {
  background: var(--surface-hover);
}

.sentence-item.selected {
  background: var(--surface-active);
  border-left-color: var(--text-main);
}
```

---

## 6. 状态管理

### 6.1 App 层状态扩展

```typescript
// index.tsx 新增状态
const [activeTab, setActiveTab] = useState<'articles' | 'sentences'>('sentences');
const [sentences, setSentences] = useState<SentencePair[]>([]);
const [selectedSentenceId, setSelectedSentenceId] = useState<string | null>(null);
const [practiceDirection, setPracticeDirection] = useState<PracticeMode>('EN_TO_ZH');

// 加载句子
useEffect(() => {
  const loadSentences = async () => {
    const data = await fetchSentences();
    setSentences(data);
  };
  loadSentences();
}, []);
```

### 6.2 更新句子进度

```typescript
const updateSentenceProgress = async (
  sentenceId: string,
  translation: UserTranslation
) => {
  setSentences(prev => prev.map(s => {
    if (s.id !== sentenceId) return s;

    const updated = { ...s, lastPracticed: Date.now() };
    if (practiceDirection === 'EN_TO_ZH') {
      updated.userTranslationZh = translation;
    } else {
      updated.userTranslationEn = translation;
    }
    return updated;
  }));

  // 持久化
  await saveSentences(sentences);
};
```

---

## 7. 数据迁移策略

### 7.1 迁移方案

由于切换到句子为中心的架构，需要处理现有文章数据：

```typescript
// utils/migration.ts

/**
 * 将现有文章转换为句子库格式
 * 此操作应在用户首次进入 Sentence Mode 时执行
 */
export const migrateArticlesToSentences = async (
  articles: Article[]
): Promise<SentencePair[]> => {
  const allSentences: SentencePair[] = [];

  for (const article of articles) {
    for (const paragraph of article.content) {
      const enText = paragraph.en[0] || '';
      const zhText = paragraph.zh[0] || '';

      const sentences = splitParagraphToSentences(
        enText,
        zhText,
        article.id,
        paragraph.id
      );

      // 迁移用户翻译数据
      sentences.forEach((s, idx) => {
        if (paragraph.userTranslationZh) {
          // 尝试匹配句子级别的翻译（简化处理：只迁移到第一个句子）
          if (idx === 0) {
            s.userTranslationZh = paragraph.userTranslationZh;
          }
        }
        if (paragraph.userTranslationEn && idx === 0) {
          s.userTranslationEn = paragraph.userTranslationEn;
        }
      });

      allSentences.push(...sentences);
    }
  }

  return allSentences;
};
```

### 7.2 向后兼容

- 保留现有 `public/articles/` 目录和文章格式
- 在设置中提供「Paragraph Mode」开关，开启后使用旧的段落级练习界面
- 迁移为一次性操作，执行后句子库独立于文章存储

---

## 8. 实现计划

### Phase 1: 基础架构 (优先级: 高)

| 任务 | 文件 | 说明 |
|------|------|------|
| 1.1 | `types.ts` | 添加 SentencePair, SentenceStore 类型 |
| 1.2 | `server.js` | 添加 `/api/sentences` 端点 |
| 1.3 | `utils/sentenceLoader.ts` | 实现句子 CRUD |
| 1.4 | `utils/sentenceSplitter.ts` | 实现句子分解逻辑 |

### Phase 2: 核心 UI (优先级: 高)

| 任务 | 文件 | 说明 |
|------|------|------|
| 2.1 | `views/SentenceMode.tsx` | 主视图容器 |
| 2.2 | `components/SentenceSidebar.tsx` | 左侧句子列表 |
| 2.3 | `components/SentencePracticeArea.tsx` | 右侧练习区 |
| 2.4 | `components/AddSentenceModal.tsx` | 添加句子弹窗 |

### Phase 3: 集成与导航 (优先级: 高)

| 任务 | 文件 | 说明 |
|------|------|------|
| 3.1 | `index.tsx` | 添加 Tab 导航和状态管理 |
| 3.2 | `index.tsx` | 集成句子加载和更新逻辑 |

### Phase 4: 迁移与设置 (优先级: 中)

| 任务 | 文件 | 说明 |
|------|------|------|
| 4.1 | `utils/migration.ts` | 文章到句子迁移工具 |
| 4.2 | `components/SettingsModal.tsx` | 添加 Paragraph Mode 开关 |
| 4.3 | - | 首次启动迁移提示 |

### Phase 5: 增强功能 (优先级: 低，后续迭代)

| 任务 | 说明 |
|------|------|
| 5.1 | 批量导入句子（TSV/JSON 格式） |
| 5.2 | 标签系统 |
| 5.3 | LLM 句子分解 |
| 5.4 | 随机练习模式 |

---

## 9. 技术决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| 存储方式 | 独立 sentences.json | 句子作为基本单元，便于独立管理和扩展 |
| 句子分解 | 使用现有 splitIntoSentences | 已有成熟实现，LLM 分解可后续添加 |
| 反馈模式 | 移除 diff/LLM，直接显示参考译文 | 符合需求文档，简化用户体验 |
| 迁移策略 | 一次性迁移 + 保留旧文章 | 平滑过渡，支持 Paragraph Mode 回退 |

---

## 10. 风险与注意事项

1. **句子对齐问题**：中英文句子数量可能不一致，需要处理边界情况
2. **大规模数据**：sentences.json 可能变大，考虑分页加载
3. **用户进度迁移**：段落级翻译无法精确映射到句子级，需要说明
4. **并发修改**：多标签页打开时的数据同步问题（暂不处理，后续优化）

---

## 11. 实现进度记录

### Phase 1: 基础架构 ✅ 完成

**实现日期**: 2026-02-05
**分支**: `feature/sentence-mode-phase1`

#### 完成的任务

| 任务 | 文件 | 状态 | 说明 |
|------|------|------|------|
| 1.1 | `types.ts` | ✅ | 添加 `SentencePair`, `SentenceStore`, `SentenceFilterType` 接口；更新 `AppSettings` 添加 `practiceGranularity` |
| 1.2 | `server.js` | ✅ | 添加 `GET/POST /api/sentences` 端点，使用双写模式 (public + dist) |
| 1.2 | `vite.config.ts` | ✅ | 添加匹配的开发服务器端点，保持 API 一致性 |
| 1.3 | `utils/sentenceLoader.ts` | ✅ | 创建句子 CRUD 操作模块 |
| 1.4 | `utils/sentenceSplitter.ts` | ✅ | 创建句子分解模块，复用现有 `splitIntoSentences` |

#### 文件变更统计

```
Modified:
  types.ts                 (+45 lines) - 新增句子类型 + AppSettings 更新
  server.js                (+42 lines) - 句子 API 端点
  vite.config.ts           (+58 lines) - 开发服务器匹配端点

Created:
  utils/sentenceLoader.ts  (175 lines) - 句子 CRUD 操作
  utils/sentenceSplitter.ts (50 lines) - 段落到句子分解
  public/data/             (directory) - 句子库存储目录
```

#### 新增 API 端点

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/sentences` | GET | 返回 `SentenceStore`（若不存在则返回空存储） |
| `/api/sentences` | POST | 保存 `SentenceStore` 到 `public/data/sentences.json` |

#### sentenceLoader.ts 导出函数

```typescript
// CRUD 操作
fetchSentences(): Promise<SentencePair[]>
fetchSentenceStore(): Promise<SentenceStore>
saveSentences(sentences: SentencePair[]): Promise<boolean>
addSentence(en: string, zh: string): Promise<SentencePair | null>
deleteSentence(id: string): Promise<boolean>
updateSentence(id: string, updates: Partial<SentencePair>): Promise<boolean>

// 导入操作
importFromArticle(article: Article): Promise<SentencePair[]>
createManualSentence(en: string, zh: string): SentencePair

// 过滤与分组
filterSentences(sentences: SentencePair[], filter: SentenceFilterType): SentencePair[]
groupBySource(sentences: SentencePair[]): Map<string, SentencePair[]>
```

#### 代码审查结果

| 优先级 | 问题 | 处理方式 |
|--------|------|----------|
| 中 | fetch→modify→save 模式存在竞态条件 | 接受 - 单用户本地应用，符合现有模式 |
| 中 | 句子对齐使用索引匹配 | 已知限制 - LLM 对齐为 Phase 5 内容 |
| 低 | API 层代码重复 | 接受 - 遵循现有双服务器设计模式 |

**TypeScript 编译**: ✅ 通过，无错误

#### 下一步: Phase 2

准备实现核心 UI 组件：
- `views/SentenceMode.tsx` - 主视图容器
- `components/SentenceSidebar.tsx` - 渐进式披露侧边栏
- `components/SentencePracticeArea.tsx` - 翻译练习区域
- `components/AddSentenceModal.tsx` - 手动添加句子弹窗