# LLM Platform & Intelligent Sentence Segmentation - Implementation Plan

## Overview

本文档描述了一个**通用 LLM 调用平台**的实现计划，以及基于此平台的第一个功能：智能分句。

**核心设计理念**：
1. **用户可配置** - 用户可自定义 Base URL + API Key，系统动态获取可用模型
2. **任务无关** - 平台只负责调用 LLM，不同任务只需更换 prompt
3. **可扩展** - 未来的翻译、语义对齐等功能都复用同一框架

---

## Part 1: 通用 LLM 平台框架

### 1.1 架构设计

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                              │
├─────────────────────────────────────────────────────────────────────┤
│  Settings UI          │  Task-Specific UI                           │
│  ┌─────────────────┐  │  ┌─────────────────┐  ┌─────────────────┐   │
│  │ LLM Provider    │  │  │ Segmentation    │  │ Translation     │   │
│  │ Configuration   │  │  │ (分句)          │  │ (翻译) [future] │   │
│  └─────────────────┘  │  └─────────────────┘  └─────────────────┘   │
│           │           │           │                   │              │
│           ▼           │           ▼                   ▼              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              llmService.ts (Frontend Abstraction)            │    │
│  │  - executeTask(taskType, params) → Promise<Result>           │    │
│  │  - getAvailableModels() → Promise<Model[]>                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
├──────────────────────────────┼───────────────────────────────────────┤
│                              ▼                                       │
│                    Backend API Gateway                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  POST /api/llm/models     - 获取可用模型列表                  │    │
│  │  POST /api/llm/execute    - 执行 LLM 任务                    │    │
│  │  GET  /api/llm/config     - 获取当前配置                      │    │
│  │  POST /api/llm/config     - 保存配置                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              LLM Provider (OpenAI-Compatible API)            │    │
│  │  - User-configured Base URL + API Key                        │    │
│  │  - Supports: OpenAI, Gemini, Claude, Ollama, etc.            │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

`★ Insight ─────────────────────────────────────`
**为什么选择 OpenAI-Compatible API 格式**：
1. 大多数 LLM 提供商（包括 Gemini、Claude、Ollama）都支持 OpenAI 兼容的 API 格式
2. 用户只需配置 Base URL 和 API Key，无需关心具体实现
3. 统一的接口使得切换模型变得非常简单
`─────────────────────────────────────────────────`

---

### 1.2 数据模型

#### LLM 配置 (新增到 `types.ts`)

```typescript
// === LLM Platform Types ===

/**
 * LLM 提供商配置
 */
export interface LLMProviderConfig {
  id: string;                    // 唯一标识，如 'openai', 'gemini', 'custom-1'
  name: string;                  // 显示名称，如 'OpenAI', 'Google Gemini'
  baseUrl: string;               // API Base URL
  apiKey: string;                // API Key (加密存储)
  isEnabled: boolean;            // 是否启用
  models?: string[];             // 缓存的可用模型列表
  lastFetched?: number;          // 上次获取模型列表的时间
}

/**
 * 模型参数配置
 * 用户可调整的 LLM 调用参数
 */
export interface LLMModelParams {
  temperature: number;           // 温度 (0-2)，控制随机性，默认 0
  topP: number;                  // Top-P 采样 (0-1)，默认 1
  maxTokens?: number;            // 最大生成 token 数，默认不限制
  frequencyPenalty: number;      // 频率惩罚 (-2 to 2)，默认 0
  presencePenalty: number;       // 存在惩罚 (-2 to 2)，默认 0
  seed?: number;                 // 随机种子，用于可复现结果
}

/**
 * 默认模型参数
 */
export const DEFAULT_MODEL_PARAMS: LLMModelParams = {
  temperature: 0,                // 分句等任务需要确定性输出
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

/**
 * LLM 模型信息
 */
export interface LLMModel {
  id: string;                    // 模型 ID，如 'gpt-4', 'gemini-2.0-flash'
  name: string;                  // 显示名称
  providerId: string;            // 所属提供商 ID
  contextLength?: number;        // 上下文长度限制
  supportsJson?: boolean;        // 是否支持 JSON 模式
}

/**
 * LLM 任务类型
 */
export type LLMTaskType =
  | 'segment'           // 分句
  | 'segment-align'     // 语义对齐分句 (同时处理 EN+ZH)
  | 'translate'         // 翻译
  | 'score'             // 评分
  | 'custom';           // 自定义任务

/**
 * LLM 任务请求
 */
export interface LLMTaskRequest {
  taskType: LLMTaskType;
  modelId: string;               // 使用的模型
  providerId: string;            // 使用的提供商
  params: Record<string, any>;   // 任务参数（由具体任务定义）
  modelParams?: Partial<LLMModelParams>;  // 可选的模型参数覆盖
}

/**
 * LLM 任务响应
 */
export interface LLMTaskResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * LLM 设置 (扩展 AppSettings)
 */
export interface LLMSettings {
  providers: LLMProviderConfig[];
  defaultProvider?: string;      // 默认提供商 ID
  defaultModel?: string;         // 默认模型 ID
  defaultParams: LLMModelParams; // 全局默认模型参数
  taskModels: {                  // 每个任务可单独指定模型
    [taskType in LLMTaskType]?: {
      providerId: string;
      modelId: string;
      params?: Partial<LLMModelParams>;  // 任务级别参数覆盖
    };
  };
}
```

#### 扩展 AppSettings

```typescript
export interface AppSettings {
  autoSave: {
    enabled: boolean;
    delay: number;
  };
  llmThreshold: number;
  hotkeys: { [commandId: string]: string };
  practiceGranularity: 'sentence' | 'paragraph';

  // 新增 LLM 设置
  llm: LLMSettings;
}
```

---

### 1.3 后端 API 设计

#### `/api/llm/models` - 获取可用模型

```typescript
// Request
POST /api/llm/models
{
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-..."
}

// Response
{
  "success": true,
  "models": [
    { "id": "gpt-4", "name": "GPT-4" },
    { "id": "gpt-4-turbo", "name": "GPT-4 Turbo" },
    { "id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo" }
  ]
}
```

**实现逻辑**：
```typescript
// 调用 OpenAI-compatible /models 端点
const response = await fetch(`${baseUrl}/models`, {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});
const data = await response.json();
return data.data.map(m => ({ id: m.id, name: m.id }));
```

#### `/api/llm/execute` - 执行 LLM 任务

```typescript
// Request
POST /api/llm/execute
{
  "taskType": "segment",
  "providerId": "openai",
  "modelId": "gpt-4",
  "params": {
    "text": "Hello world. How are you?",
    "language": "en"
  }
}

// Response
{
  "success": true,
  "data": {
    "segments": ["Hello world.", "How are you?"]
  },
  "usage": {
    "promptTokens": 50,
    "completionTokens": 20,
    "totalTokens": 70
  }
}
```

**核心实现**：
```typescript
async function executeLLMTask(request: LLMTaskRequest): Promise<LLMTaskResponse> {
  const { taskType, providerId, modelId, params, modelParams } = request;

  // 1. 获取提供商配置
  const provider = getProviderConfig(providerId);

  // 2. 获取任务对应的 system prompt
  const systemPrompt = getTaskPrompt(taskType, params);

  // 3. 构建用户消息
  const userMessage = buildUserMessage(taskType, params);

  // 4. 合并模型参数 (默认 < 任务级别 < 请求级别)
  const settings = getLLMSettings();
  const taskSettings = settings.taskModels[taskType];
  const finalParams: LLMModelParams = {
    ...DEFAULT_MODEL_PARAMS,
    ...settings.defaultParams,
    ...(taskSettings?.params || {}),
    ...(modelParams || {})
  };

  // 5. 调用 OpenAI-compatible API
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: 'json_object' },
      // 应用模型参数
      temperature: finalParams.temperature,
      top_p: finalParams.topP,
      max_tokens: finalParams.maxTokens,
      frequency_penalty: finalParams.frequencyPenalty,
      presence_penalty: finalParams.presencePenalty,
      seed: finalParams.seed
    })
  });

  // 6. 解析响应
  const data = await response.json();
  const content = JSON.parse(data.choices[0].message.content);

  return {
    success: true,
    data: content,
    usage: data.usage
  };
}
```

---

### 1.4 任务 Prompt 注册系统

**新文件**: `server/llm/prompts.ts`

```typescript
/**
 * LLM 任务 Prompt 注册表
 * 每个任务类型定义：系统提示词 + 用户消息构建器 + 响应解析器
 */

export interface TaskPromptConfig {
  systemPrompt: string | ((params: any) => string);
  buildUserMessage: (params: any) => string;
  parseResponse: (raw: any) => any;
}

export const TASK_PROMPTS: Record<string, TaskPromptConfig> = {

  // ============ 分句任务 ============
  segment: {
    systemPrompt: (params) => `
You are a precise text segmentation assistant. Split the following ${params.language === 'en' ? 'English' : 'Chinese'} text into individual sentences.

Rules:
1. Keep abbreviations intact (Mr., Dr., U.S., etc.)
2. Keep decimal numbers intact (3.14, 2.0, etc.)
3. Keep quoted speech as single units when appropriate
4. Preserve the original text exactly - do not translate or modify
5. Return a JSON object: { "segments": ["sentence1", "sentence2", ...] }
`,
    buildUserMessage: (params) => params.text,
    parseResponse: (raw) => ({ segments: raw.segments || [] })
  },

  // ============ 语义对齐分句任务 ============
  'segment-align': {
    systemPrompt: `
You are a bilingual text alignment assistant. Given parallel English and Chinese texts, split them into semantically aligned sentence pairs.

Rules:
1. Each pair should contain semantically equivalent content
2. Handle 1:N and N:1 mappings (one sentence in one language may correspond to multiple in the other)
3. Preserve original text exactly
4. Return JSON: { "pairs": [{ "en": "...", "zh": "..." }, ...] }

If alignment is ambiguous, prefer keeping related content together rather than splitting.
`,
    buildUserMessage: (params) => `
English text:
${params.enText}

Chinese text:
${params.zhText}
`,
    parseResponse: (raw) => ({ pairs: raw.pairs || [] })
  },

  // ============ 翻译任务 (预留) ============
  translate: {
    systemPrompt: (params) => `
You are a professional translator. Translate the following text from ${params.from} to ${params.to}.
Maintain the original meaning, tone, and style.
Return JSON: { "translation": "..." }
`,
    buildUserMessage: (params) => params.text,
    parseResponse: (raw) => ({ translation: raw.translation || '' })
  },

  // ============ 评分任务 (预留) ============
  score: {
    systemPrompt: `
You are a translation quality assessor. Compare the user's translation with the reference and provide:
1. A score from 0-100
2. Specific feedback on accuracy, fluency, and style
3. Suggested improvements

Return JSON: { "score": number, "feedback": "...", "suggestions": ["..."] }
`,
    buildUserMessage: (params) => `
Original: ${params.original}
Reference: ${params.reference}
User's translation: ${params.userTranslation}
`,
    parseResponse: (raw) => ({
      score: raw.score || 0,
      feedback: raw.feedback || '',
      suggestions: raw.suggestions || []
    })
  }
};
```

`★ Insight ─────────────────────────────────────`
**Prompt 注册系统的优势**：
1. **集中管理** - 所有 prompt 在一个文件中，易于维护和优化
2. **类型安全** - 每个任务定义输入输出格式
3. **可扩展** - 添加新任务只需注册新的 prompt 配置
`─────────────────────────────────────────────────`

---

### 1.5 Settings UI 扩展

**修改文件**: `components/SettingsModal.tsx`

新增 **"AI Models"** 设置标签页：

```
┌─────────────────────────────────────────────────────────────────────┐
│  Settings                                                           │
├─────────────────┬───────────────────────────────────────────────────┤
│  ○ General      │  AI Model Providers                               │
│  ○ Hotkeys      │                                                   │
│  ● AI Models    │  ┌─────────────────────────────────────────────┐  │
│                 │  │ ✓ OpenAI                           [Edit]   │  │
│                 │  │   https://api.openai.com/v1                 │  │
│                 │  │   Models: gpt-4, gpt-3.5-turbo              │  │
│                 │  └─────────────────────────────────────────────┘  │
│                 │                                                   │
│                 │  ┌─────────────────────────────────────────────┐  │
│                 │  │ ○ Google Gemini                    [Edit]   │  │
│                 │  │   https://generativelanguage.googleapis.com │  │
│                 │  │   Models: gemini-2.0-flash, gemini-pro      │  │
│                 │  └─────────────────────────────────────────────┘  │
│                 │                                                   │
│                 │  [+ Add Provider]                                 │
│                 │                                                   │
│                 │  ─────────────────────────────────────────────── │
│                 │                                                   │
│                 │  Default Model for Tasks:                         │
│                 │                                                   │
│                 │  Segmentation:    [gpt-4 ▼]                       │
│                 │  Translation:     [gpt-4 ▼]                       │
│                 │  Scoring:         [gpt-3.5-turbo ▼]               │
│                 │                                                   │
│                 │  ─────────────────────────────────────────────── │
│                 │                                                   │
│                 │  Model Parameters (Global Defaults):              │
│                 │                                                   │
│                 │  Temperature      [====○━━━━━━━━━] 0.0            │
│                 │  (Lower = more deterministic)                     │
│                 │                                                   │
│                 │  Top P            [━━━━━━━━━━━━○] 1.0             │
│                 │  (Nucleus sampling threshold)                     │
│                 │                                                   │
│                 │  Max Tokens       [        ] (empty = no limit)   │
│                 │                                                   │
│                 │  ▼ Advanced Parameters                            │
│                 │  ┌─────────────────────────────────────────────┐  │
│                 │  │ Frequency Penalty  [━━━━━○━━━━━] 0.0        │  │
│                 │  │ Presence Penalty   [━━━━━○━━━━━] 0.0        │  │
│                 │  │ Seed               [        ] (optional)    │  │
│                 │  └─────────────────────────────────────────────┘  │
│                 │                                                   │
└─────────────────┴───────────────────────────────────────────────────┘
```

**Provider 编辑对话框**：

```
┌─────────────────────────────────────────────┐
│  Edit Provider                              │
├─────────────────────────────────────────────┤
│  Name:     [OpenAI                    ]     │
│                                             │
│  Base URL: [https://api.openai.com/v1 ]     │
│                                             │
│  API Key:  [sk-••••••••••••••••••••   ] 👁  │
│                                             │
│  [Fetch Models]                             │
│                                             │
│  Available Models:                          │
│  ┌─────────────────────────────────────┐    │
│  │ ☑ gpt-4                             │    │
│  │ ☑ gpt-4-turbo                       │    │
│  │ ☑ gpt-3.5-turbo                     │    │
│  │ ☐ dall-e-3 (image model)            │    │
│  └─────────────────────────────────────┘    │
│                                             │
│            [Cancel]  [Save]                 │
└─────────────────────────────────────────────┘
```

---

## Part 2: 智能分句功能

基于上述平台框架，智能分句成为第一个具体实现的功能。

### 2.1 功能流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   INPUT     │ ──▶ │  SEGMENT    │ ──▶ │   ALIGN     │ ──▶ │   SAVE      │
│  (Raw Text) │     │  (LLM Call) │     │  (User Fix) │     │  (Import)   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ llmService.executeTask │
              │ taskType: 'segment'    │
              │ or 'segment-align'     │
              └───────────────────────┘
```

### 2.2 两种分句模式

#### 模式 A: 独立分句 (`segment`)
- 分别对 EN 和 ZH 文本调用 LLM
- 各自返回句子数组
- 用户手动对齐

```typescript
// 并行调用两次
const [enResult, zhResult] = await Promise.all([
  llmService.executeTask('segment', { text: enText, language: 'en' }),
  llmService.executeTask('segment', { text: zhText, language: 'zh' })
]);
```

#### 模式 B: 语义对齐分句 (`segment-align`)
- 同时将 EN 和 ZH 文本送入 LLM
- LLM 返回已对齐的句对
- 更智能，但 token 消耗更高

```typescript
// 单次调用，同时处理
const result = await llmService.executeTask('segment-align', {
  enText,
  zhText
});
// result.pairs = [{ en: "Hello.", zh: "你好。" }, ...]
```

### 2.3 AlignmentEditor 组件

```typescript
interface AlignmentEditorProps {
  initialPairs: Array<{ en: string; zh: string }>;
  mode: 'independent' | 'semantic';  // 显示不同的操作提示
  onSave: (pairs: Array<{ en: string; zh: string }>) => void;
  onCancel: () => void;
}
```

**操作功能**：
- **Insert Gap** - 在某一侧插入空行，推移后续内容
- **Remove Gap** - 删除空行
- **Merge Up** - 与上一行合并
- **Split** - 在光标处拆分为两行
- **Edit** - 直接编辑文本内容

---

## Part 3: 文件结构

### 新增文件

```
back-translation-app/
├── server/
│   └── llm/
│       ├── index.ts              # LLM 服务入口
│       ├── prompts.ts            # Prompt 注册表
│       ├── executor.ts           # 任务执行器
│       └── providers.ts          # 提供商管理
├── services/
│   └── llmService.ts             # 前端 LLM 服务封装
├── components/
│   ├── settings/
│   │   ├── AIModelsTab.tsx       # AI 模型设置标签页
│   │   └── ProviderEditModal.tsx # 提供商编辑对话框
│   └── sentence-mode/
│       └── AlignmentEditor.tsx   # 对齐编辑器
└── types.ts                      # 新增 LLM 相关类型
```

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `types.ts` | 新增 LLM 类型定义 |
| `vite.config.ts` | 添加 `/api/llm/*` 路由 |
| `server.js` | 镜像添加 `/api/llm/*` 路由 |
| `components/SettingsModal.tsx` | 添加 "AI Models" 标签页 |
| `components/sentence-mode/ImportModal.tsx` | 集成分句流程 |

---

## Part 4: 实现阶段

### Phase 1: 类型定义与数据结构 ✅ COMPLETED

**目标**: 建立 LLM 平台的类型基础

**修改文件**:
- `types.ts`

**任务清单**:
- [x] 1.1 定义 `LLMProviderConfig` 接口（提供商配置）
- [x] 1.2 定义 `LLMModelParams` 接口（模型参数：temperature、topP 等）
- [x] 1.3 定义 `DEFAULT_MODEL_PARAMS` 常量
- [x] 1.4 定义 `LLMModel` 接口（模型信息）
- [x] 1.5 定义 `LLMTaskType` 类型（任务类型枚举）
- [x] 1.6 定义 `LLMTaskRequest` 和 `LLMTaskResponse` 接口
- [x] 1.7 定义 `LLMSettings` 接口
- [x] 1.8 扩展 `AppSettings` 接口，添加 `llm: LLMSettings` 字段

**验收标准**: ✅ TypeScript 编译通过，类型定义完整

---

### Phase 2: 后端 API 基础设施 ✅ COMPLETED

**目标**: 实现 LLM 调用的后端代理层

**新增文件**:
- `server/llm/index.ts` - LLM 服务入口
- `server/llm/prompts.ts` - Prompt 注册表
- `server/llm/executor.ts` - 任务执行器
- `server/llm/providers.ts` - 提供商管理

**修改文件**:
- `vite.config.ts` - 添加开发环境 API 路由
- `server.js` - 添加生产环境 API 路由

**任务清单**:
- [x] 2.1 创建 `server/llm/` 目录结构
- [x] 2.2 实现 `providers.ts` - 提供商配置的读取/保存
  - [x] `getProviderConfig(providerId)` - 获取单个提供商配置
  - [x] `getAllProviders()` - 获取所有提供商
  - [x] `saveProviderConfig(config)` - 保存提供商配置
  - [x] `deleteProvider(providerId)` - 删除提供商
- [x] 2.3 实现 `prompts.ts` - Prompt 注册表
  - [x] 定义 `TaskPromptConfig` 接口
  - [x] 注册 `segment` 任务 prompt
  - [x] 注册 `segment-align` 任务 prompt
  - [x] 注册 `translate` 任务 prompt（预留）
  - [x] 注册 `score` 任务 prompt（预留）
- [x] 2.4 实现 `executor.ts` - 核心执行逻辑
  - [x] `executeLLMTask(request)` - 执行 LLM 任务
  - [x] 模型参数合并逻辑（默认 < 任务级别 < 请求级别）
  - [x] 错误处理和 fallback 逻辑
- [x] 2.5 实现 `index.ts` - API 路由处理器
  - [x] `POST /api/llm/models` - 获取可用模型列表
  - [x] `POST /api/llm/execute` - 执行 LLM 任务
  - [x] `GET /api/llm/config` - 获取 LLM 配置
  - [x] `POST /api/llm/config` - 保存 LLM 配置
- [x] 2.6 在 `vite.config.ts` 中集成 API 路由
- [x] 2.7 在 `server.js` 中镜像 API 路由
- [x] 2.8 创建 `data/llm-config.json` 配置文件（加入 .gitignore）

**验收标准**: ✅ API 路由已实现，可通过 curl 测试

---

### Phase 3: 前端服务层 ✅ COMPLETED

**目标**: 封装前端 LLM 调用接口

**新增文件**:
- `services/llmService.ts`

**任务清单**:
- [x] 3.1 实现 `fetchModels(baseUrl, apiKey)` - 获取模型列表
- [x] 3.2 实现 `executeTask(taskType, params, options?)` - 执行任务
- [x] 3.3 实现 `getConfig()` - 获取当前 LLM 配置
- [x] 3.4 实现 `saveConfig(config)` - 保存 LLM 配置
- [x] 3.5 实现 `segmentText(text, language)` - 分句便捷方法
- [x] 3.6 实现 `segmentAndAlign(enText, zhText)` - 语义对齐分句便捷方法
- [x] 3.7 添加错误处理和 fallback 到 regex 的逻辑

**验收标准**: ✅ 前端可调用 `llmService.segmentText()` 并获得结果

---

### Phase 4: Settings UI - 提供商管理 ✅ COMPLETED

**目标**: 用户可在设置中添加/编辑 LLM 提供商

**新增文件**:
- `components/settings/AIModelsTab.tsx` - AI 模型设置标签页
- `components/settings/ProviderEditModal.tsx` - 提供商编辑对话框

**修改文件**:
- `components/SettingsModal.tsx` - 添加 "AI Models" 标签页入口

**任务清单**:
- [x] 4.1 创建 `components/settings/` 目录
- [x] 4.2 实现 `ProviderEditModal.tsx`
  - [x] 名称输入框
  - [x] Base URL 输入框
  - [x] API Key 输入框（带显示/隐藏切换）
  - [x] "Fetch Models" 按钮
  - [x] 模型列表展示（可勾选启用/禁用）
  - [x] 保存/取消按钮
- [x] 4.3 实现 `AIModelsTab.tsx`
  - [x] 提供商列表展示
  - [x] 添加提供商按钮
  - [x] 编辑/删除提供商
  - [x] 默认任务模型选择下拉框
- [x] 4.4 修改 `SettingsModal.tsx`
  - [x] 添加 "AI Models" 侧边栏项
  - [x] 添加 AI 图标 (SparklesIcon)
  - [x] 条件渲染 `AIModelsTab` 组件

**验收标准**: ✅
- 用户可添加新的 LLM 提供商
- 点击 "Fetch Models" 可获取模型列表
- 配置保存后刷新页面仍保留

---

### Phase 5: Settings UI - 模型参数配置 ✅ COMPLETED

**目标**: 用户可调整模型参数（temperature 等）

**修改文件**:
- `components/settings/AIModelsTab.tsx`

**任务清单**:
- [x] 5.1 添加 "Model Parameters" 区域
- [x] 5.2 实现 Temperature 滑块 (0-2)
- [x] 5.3 实现 Top P 滑块 (0-1)
- [x] 5.4 实现 Max Tokens 输入框
- [x] 5.5 添加 "Advanced Parameters" 折叠区域
  - [x] Frequency Penalty 滑块 (-2 to 2)
  - [x] Presence Penalty 滑块 (-2 to 2)
  - [x] Seed 输入框
- [x] 5.6 实现任务级别参数覆盖 UI（Task-Specific Models 下拉框）
- [x] 5.7 保存参数到配置

**验收标准**: ✅
- 调整参数后执行任务，后端收到正确的参数值
- 参数保存后刷新页面仍保留

---

### Phase 6: 对齐编辑器组件 ✅ COMPLETED

**目标**: 创建用于手动调整句子对齐的编辑器

**新增文件**:
- `components/sentence-mode/AlignmentEditor.tsx`
- `utils/alignmentHelpers.ts` - 对齐操作辅助函数

**任务清单**:
- [x] 6.1 实现 `alignmentHelpers.ts`
  - [x] `insertGapSimple(pairs, index, side)` - 插入空行
  - [x] `removeGap(pairs, index, side)` - 删除空行
  - [x] `mergeUp(pairs, index, side)` - 与上一行合并
  - [x] `splitAt(pairs, index, side, charPos)` - 在指定位置拆分
  - [x] `updateText(pairs, index, side, newText)` - 更新文本
  - [x] `cleanEmptyPairs(pairs)` - 清理空对
  - [x] `getAlignmentStats(pairs)` - 获取对齐统计
- [x] 6.2 实现 `AlignmentEditor.tsx` 基础布局
  - [x] 双栏布局（English | 中文）
  - [x] 句子数量统计显示
  - [x] 匹配/不匹配状态指示器
- [x] 6.3 实现单行组件 `SegmentRow`
  - [x] 可编辑文本区域（点击编辑，自动调整高度）
  - [x] Insert Gap 按钮 (↓)
  - [x] Remove Gap 按钮 (×) - 仅空行显示
  - [x] Merge Up 按钮 (↑)
  - [x] Ctrl+Enter 拆分功能
- [x] 6.4 实现同步滚动（可开关）
- [x] 6.5 实现底部操作栏
  - [x] Cancel 按钮
  - [x] Import 按钮（显示将导入的句对数量）
- [x] 6.6 添加键盘快捷键支持（Escape 关闭，Ctrl+Enter 拆分）

**验收标准**: ✅
- 可插入/删除空行调整对齐
- 可合并相邻句子
- 显示正确的句对数量

---

### Phase 7: ImportModal 集成 ✅ COMPLETED

**目标**: 将 LLM 分句和对齐编辑器集成到导入流程

**修改文件**:
- `components/sentence-mode/ImportModal.tsx`

**任务清单**:
- [x] 7.1 添加导入步骤状态 (`'input' | 'loading' | 'align' | 'importing'`)
- [x] 7.2 修改 Paragraph/Article 模式的处理流程
  - [x] 点击 "Next" 后调用 LLM 分句
  - [x] 显示加载状态（带 spinner 和提示文字）
  - [x] 分句完成后进入对齐步骤
- [x] 7.3 集成 `AlignmentEditor` 组件
- [x] 7.4 实现分句模式选择（独立分句 vs 语义对齐）
  - [x] Independent: 分别对 EN/ZH 调用 LLM
  - [x] Semantic Align: 单次调用同时处理双语对齐
- [x] 7.5 添加 fallback 逻辑
  - [x] LLM 失败时回退到 regex
  - [x] 显示警告提示 "Using simple segmentation"
  - [x] 无 LLM 配置时自动使用 regex
- [x] 7.6 处理对齐编辑器的保存回调
- [x] 7.7 更新 UI 样式以适应多步流程
  - [x] Batch 模式保持直接 Import 按钮
  - [x] Paragraph/Article 模式使用 Next → 按钮

**验收标准**: ✅
- Paragraph/Article 模式使用 LLM 分句
- 分句结果进入对齐编辑器
- LLM 失败时自动回退

---

### Phase 8: 测试与错误处理 ✅ COMPLETED

**目标**: 确保功能稳定可靠

**任务清单**:
- [x] 8.1 错误处理已内置于各层
  - [x] executor.ts: API 错误、网络错误、JSON 解析错误
  - [x] llmService.ts: 自动 fallback 到 regex
  - [x] ImportModal.tsx: 显示警告提示
- [x] 8.2 错误场景覆盖
  - [x] API Key 无效 → 返回 API error 并 fallback
  - [x] 网络超时 → 返回 Network error 并 fallback
  - [x] 模型不存在 → 返回错误信息
  - [x] JSON 解析失败 → 返回解析错误
- [x] 8.3 边界情况处理
  - [x] 空文本 → 直接返回空结果
  - [x] 无 LLM 配置 → 自动使用 regex
- [x] 8.4 错误提示信息清晰
  - [x] 警告用黄色显示
  - [x] 错误用红色显示
  - [x] 成功用绿色显示
- [x] 8.5 Loading 状态动画已实现
- [x] 8.6 代码审查完成，无遗留问题

**验收标准**: ✅
- 所有错误场景有合理处理
- 错误信息清晰易懂
- 无未处理的异常

---

### Phase 9: 文档与收尾 ✅ COMPLETED

**目标**: 完善文档，清理代码

**任务清单**:
- [x] 9.1 更新 CLAUDE.md 添加 LLM 平台相关说明
  - [x] 添加 LLM Platform Architecture 章节
  - [x] 添加 LLM API Endpoints 列表
  - [x] 更新 Application Structure 目录树
- [x] 9.2 更新实现计划文档标记已完成
- [x] 9.3 代码审查：console.log 均为合理的错误日志
- [x] 9.4 TypeScript 编译通过，无类型错误

**验收标准**: ✅ 功能完整可用，文档完善

---

## Part 5: 常见 LLM 提供商配置参考

| 提供商 | Base URL | 备注 |
|--------|----------|------|
| OpenAI | `https://api.openai.com/v1` | 标准格式 |
| Azure OpenAI | `https://{resource}.openai.azure.com/openai/deployments/{deployment}` | 需要额外 header |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | OpenAI 兼容端点 |
| Anthropic Claude | `https://api.anthropic.com/v1` | 需要适配器 |
| Ollama (本地) | `http://localhost:11434/v1` | 完全兼容 |
| OpenRouter | `https://openrouter.ai/api/v1` | 多模型代理 |

---

## Part 6: 安全考虑

1. **API Key 存储**:
   - 开发环境：存储在 `.env` 文件
   - 生产环境：建议使用加密存储或环境变量

2. **API Key 不暴露到前端**:
   - 所有 LLM 调用通过后端代理
   - 前端只传递 providerId，不传 API Key

3. **配置文件**:
   - 用户配置存储在 `data/llm-config.json`
   - 加入 `.gitignore` 防止泄露

---

## 成功标准

1. **可配置性**: 用户可添加任意 OpenAI-compatible 提供商
2. **通用性**: 添加新任务只需注册 prompt，无需改动框架代码
3. **可靠性**: LLM 失败时自动回退到 regex
4. **性能**: 分句响应时间 < 5s
5. **易用性**: 对齐编辑器操作直观

---

*文档更新: 2026-02-06*
*版本: 2.0 - 通用 LLM 平台架构*
