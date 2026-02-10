# AI 模块设置重构计划

## Context

当前 AI 模块设置存在两个主要问题：

1. **前端任务类型不完整**：前端 `AIModelsTab.tsx` 中只展示了 5 个任务类型，但后端 `server/llm/prompts.ts` 实际实现了 9 个任务类型。这导致新增的 `greeting`、`enrich-vocab`、`suggest-pattern`、`analyze-sentence` 任务无法在设置中配置独立模型。

2. **缺少任务级参数配置**：虽然数据模型 `TaskModelConfig` 中已定义 `params?: Partial<LLMModelParams>` 字段，但 UI 层未实现。当前只能设置全局默认参数，无法为每个任务单独配置温度、Top P 等参数。

## 后端实际实现的任务类型

| 任务类型 | 用途 | 参数要求 |
|---------|------|---------|
| `segment` | 文本分句 | text, language |
| `segment-align` | 双语语义对齐 | enText, zhText |
| `translate` | 翻译（保留） | text, from, to |
| `score` | 翻译评分（保留） | original, reference, userTranslation |
| `greeting` | 个性化问候生成 | count, name, customPrompt |
| `enrich-vocab` | 词汇扩展 | text, type, contextSentence |
| `suggest-pattern` | 语法模式提取 | sentenceEn, sentenceZh |
| `analyze-sentence` | 句子语义分析 | sentence, translation |
| `custom` | 自定义任务 | systemPrompt, userMessage |

## 实施方案

### Phase 1: 更新任务类型定义

**文件**: `types.ts`

确保 `LLMTaskType` 包含所有任务类型（已完成）：
```typescript
export type LLMTaskType =
  | 'segment'           // Split text into sentences (single language)
  | 'segment-align'     // Semantically align and split EN+ZH texts together
  | 'translate'         // Translate text
  | 'score'             // Score user translation quality
  | 'greeting'          // Generate personalized greetings
  | 'enrich-vocab'      // Generate definition + examples for vocabulary
  | 'suggest-pattern'   // Extract patterns from sentence
  | 'analyze-sentence'  // Semantic analysis for vocabulary collection
  | 'custom';           // Custom task with user-provided prompt
```

### Phase 2: 创建任务元数据配置

**新建文件**: `constants.tsx` (在 components/settings/ 目录下)

创建统一的任务元数据配置，供 UI 组件使用：

```typescript
import { LLMTaskType } from '../../types';

export interface TaskMetadata {
  id: LLMTaskType;
  label: string;
  description: string;
  category: 'segmentation' | 'translation' | 'learning' | 'analysis' | 'general';
  recommendedParams?: Partial<LLMModelParams>;
}

export const TASK_METADATA: TaskMetadata[] = [
  {
    id: 'segment',
    label: 'Sentence Segmentation',
    description: 'Split text into individual sentences',
    category: 'segmentation',
    recommendedParams: { temperature: 0 }
  },
  {
    id: 'segment-align',
    label: 'Semantic Alignment',
    description: 'Align bilingual texts into sentence pairs',
    category: 'segmentation',
    recommendedParams: { temperature: 0 }
  },
  {
    id: 'translate',
    label: 'Translation',
    description: 'Translate text between languages',
    category: 'translation',
    recommendedParams: { temperature: 0.3 }
  },
  {
    id: 'score',
    label: 'Translation Scoring',
    description: 'Score and provide feedback on translations',
    category: 'translation',
    recommendedParams: { temperature: 0.2 }
  },
  {
    id: 'greeting',
    label: 'Personalized Greetings',
    description: 'Generate warm, encouraging practice greetings',
    category: 'learning',
    recommendedParams: { temperature: 0.8 }
  },
  {
    id: 'enrich-vocab',
    label: 'Vocabulary Enrichment',
    description: 'Generate definitions and examples for vocabulary',
    category: 'learning',
    recommendedParams: { temperature: 0.3 }
  },
  {
    id: 'suggest-pattern',
    label: 'Pattern Suggestion',
    description: 'Extract grammatical patterns from sentences',
    category: 'analysis',
    recommendedParams: { temperature: 0 }
  },
  {
    id: 'analyze-sentence',
    label: 'Sentence Analysis',
    description: 'Semantic analysis for vocabulary collection',
    category: 'analysis',
    recommendedParams: { temperature: 0 }
  },
  {
    id: 'custom',
    label: 'Custom Task',
    description: 'Custom task with user-provided prompt',
    category: 'general',
    recommendedParams: { temperature: 0.7 }
  },
];
```

### Phase 3: 重构 AIModelsTab 组件

**文件**: `components/settings/AIModelsTab.tsx`

#### 3.1 任务模型配置区域重构

将当前的线性列表改为按分类分组的手风琴式界面：

```
Task-Specific Models
├── Segmentation (2 tasks)
│   ├── Sentence Segmentation
│   └── Semantic Alignment
├── Translation (2 tasks)
│   ├── Translation
│   └── Translation Scoring
├── Learning (2 tasks)
│   ├── Personalized Greetings
│   └── Vocabulary Enrichment
├── Analysis (2 tasks)
│   ├── Pattern Suggestion
│   └── Sentence Analysis
└── General (1 task)
    └── Custom Task
```

#### 3.2 任务参数配置面板

为每个任务添加独立的参数配置功能：

1. 点击任务配置项时展开详情面板
2. 显示当前使用的模型（默认 or 任务特定）
3. 显示任务描述
4. 允许配置以下参数：
   - 模型选择（复用 ModelSelector）
   - Temperature
   - Top P
   - Max Tokens
   - Frequency Penalty
   - Presence Penalty
   - Seed

#### 3.3 UI 结构

```
┌─────────────────────────────────────────────────┐
│ Default Model & Parameters                       │
│ ─────────────────────────────────────────────── │
│ Model: [gpt-4o ▼]                               │
│ Temperature: ━━━●━━━ 0.7                       │
│ Top P: ━━━━━●━━ 1.0                            │
│                                                  │
│ [Advanced Parameters ▶]                         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Task-Specific Configuration                     │
│ ─────────────────────────────────────────────── │
│                                                  │
│ ▼ Segmentation (2)                              │
│   • Sentence Segmentation  Use Default          │
│   • Semantic Alignment     gpt-4o-mini          │
│                                                  │
│ ▼ Translation (2)                               │
│   • Translation            Use Default          │
│   • Translation Scoring    Use Default          │
│                                                  │
│ ▼ Learning (2)                                  │
│   • Personalized Greetings  gpt-4o              │
│   • Vocabulary Enrichment  Use Default          │
│                                                  │
│ ▼ Analysis (2)                                  │
│   • Pattern Suggestion     Use Default          │
│   • Sentence Analysis      Use Default          │
│                                                  │
│ ▶ General (1)                                    │
└─────────────────────────────────────────────────┘
```

#### 3.4 任务详情展开面板

当用户点击某个任务时，展开详情面板：

```
┌─────────────────────────────────────────────────┐
│ Sentence Segmentation                     [✕]   │
│ Split text into individual sentences            │
│ ─────────────────────────────────────────────── │
│                                                  │
│ Model:     [Use Default ▼]                       │
│           (gpt-4o from OpenAI)                  │
│           or                                     │
│           [gpt-4o-mini ▼] (Override)            │
│                                                  │
│ Parameters:                                      │
│ Temperature:  ━━━●━━━ 0.0  (Override)          │
│ Top P:         Use default (1.0)                 │
│ Max Tokens:    4096                              │
│                                                  │
│ [Reset to Default]  [Apply]                     │
└─────────────────────────────────────────────────┘
```

### Phase 4: 保存逻辑更新

更新 `handleTaskModelChange` 函数以支持参数保存：

```typescript
const handleTaskConfigChange = (
  taskType: LLMTaskType,
  config: TaskModelConfig | null  // null = clear override
) => {
  const newTaskModels = { ...settings.taskModels };

  if (config === null) {
    // Clear task-specific override
    delete newTaskModels[taskType];
  } else {
    // Set task-specific config (including params)
    newTaskModels[taskType] = config;
  }

  handleSaveSettings({ ...settings, taskModels: newTaskModels });
};
```

### Phase 5: 服务层验证

**文件**: `services/llmService.ts`

确认服务层已正确使用任务级参数：

```typescript
// 1. Check task-specific config
const taskConfig = settings.taskModels[taskType];
const providerId = taskConfig?.providerId || settings.defaultProvider;
const modelId = taskConfig?.modelId || settings.defaultModel;

// 2. Merge params: default -> task-specific -> request-level
const params = {
  ...settings.defaultParams,
  ...(taskConfig?.params || {}),
  ...(requestParams?.modelParams || {})
};
```

## 关键文件清单

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `types.ts` | 验证 | 确认 LLMTaskType 包含所有任务 |
| `components/settings/AIModelsTab.tsx` | 重构 | 主要修改：任务列表 + 参数面板 |
| `components/settings/taskMetadata.tsx` | 新建 | 任务元数据配置 |
| `services/llmService.ts` | 验证 | 确认参数合并逻辑正确 |

## 验证步骤

1. **任务列表完整性**
   - 打开设置 → AI Models 标签
   - 确认所有 9 个任务类型都显示在任务列表中
   - 确认任务按分类正确分组

2. **模型配置功能**
   - 为某个任务选择不同的模型
   - 保存后刷新页面，确认配置持久化
   - 清除任务配置，确认回退到默认模型

3. **参数配置功能**
   - 修改全局默认参数
   - 为某个任务设置不同的参数
   - 验证任务执行时使用正确的参数

4. **端到端测试**
   - 使用导入功能（segment-align 任务）
   - 使用词汇收集功能（analyze-sentence 任务）
   - 使用问候生成功能（greeting 任务）
   - 确认各任务使用配置的模型和参数
