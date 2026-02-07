export type FeedbackMode = 'diff' | 'llm' | 'draft';

export interface TranslationRecord {
  type: FeedbackMode;
  text: string;
  timestamp: number;
  score?: number;
}

export interface UserTranslation extends TranslationRecord {
  history?: TranslationRecord[];
}

export interface Paragraph {
  id: string;
  en: string[]; // English content (list of translations/versions)
  zh: string[]; // Chinese content (list of translations/versions)
  userTranslationZh?: UserTranslation; // User's Chinese translation (for EN_TO_ZH)
  userTranslationEn?: UserTranslation; // User's English translation (for ZH_TO_EN)
  lastPracticed?: number; // Timestamp
  referenceTranslations?: string[]; // Additional reference translations
}

export interface Article {
  id: string;
  title: string;
  category: string;
  date: string;
  coverImage?: string;
  content: Paragraph[];
}

export type PracticeMode = 'EN_TO_ZH' | 'ZH_TO_EN';

// --- Settings Types ---
export interface AppSettings {
  autoSave: {
    enabled: boolean;
    delay: number; // ms
  };
  llmThreshold: number;
  hotkeys: { [commandId: string]: string };
  practiceGranularity: 'sentence' | 'paragraph';  // Default: 'sentence'
  llm?: LLMSettings;  // LLM platform settings (optional for backward compatibility)
  hideReferenceInDetailView?: boolean;  // Hide reference translation in detail view before practice

  // User profile settings
  userName?: string;  // User's display name for personalized greetings
  greetingPrompt?: string;  // Custom LLM prompt for generating greetings
}

// --- Storage Keys ---
export const STORAGE_KEYS = {
  UPLOADS: 'aether_uploads_v1',
  DELETED_STATIC: 'aether_deleted_static_v1',
  PROGRESS: 'aether_progress_v1',
};

// === Sentence Mode Types ===

/**
 * 练习统计数据
 * Tracks practice performance metrics for a sentence
 */
export interface PracticeStats {
  attempts: number;           // Total practice attempts
  totalTimeMs: number;        // Cumulative time spent (milliseconds)
  bestTimeMs?: number;        // Personal best time
  lastAttemptMs?: number;     // Duration of last attempt
  lastPracticedAt?: number;   // Timestamp of last practice
}

/**
 * 导入来源类型
 * Defines how the sentence was imported and its hierarchical context
 */
export type SourceType = 'article' | 'paragraph' | 'sentence';

/**
 * 回译对 - 系统的基本单元
 * A sentence pair is the fundamental unit for translation practice
 *
 * Hierarchy:
 * - article mode: articleId + paragraphId + paragraphOrder + order (full hierarchy)
 * - paragraph mode: paragraphId + order (single paragraph context)
 * - sentence mode: standalone sentences (batch import or manual)
 */
export interface SentencePair {
  id: string;                    // Unique ID (UUID/nanoid)
  en: string;                    // English text
  zh: string;                    // Chinese text

  // Hierarchical relationship fields
  sourceType: SourceType;        // Import mode: 'article' | 'paragraph' | 'sentence'
  articleId?: string;            // Article ID (only when sourceType='article')
  paragraphId?: string;          // Paragraph ID (when sourceType='article' or 'paragraph')
  paragraphOrder?: number;       // Position of paragraph within article (only for article mode)
  order: number;                 // Position of sentence within paragraph (-1 for sentence mode)

  // User practice data
  userTranslationZh?: UserTranslation;  // EN->ZH mode user translation
  userTranslationEn?: UserTranslation;  // ZH->EN mode user translation

  // Metadata
  createdAt: number;             // Creation timestamp
  lastPracticed?: number;        // Last practice timestamp
  tags?: string[];               // User-defined tags for filtering
  practiceStats?: PracticeStats; // Practice performance metrics

  // Legacy field (for migration compatibility)
  sourceIndex?: number;          // @deprecated Use 'order' instead
}

/**
 * Sentence store structure for persistence
 */
export interface SentenceStore {
  version: number;               // Data version for migrations
  sentences: SentencePair[];     // All sentence pairs
  lastModified: number;          // Last modification timestamp
}

/**
 * Filter/grouping options for sentences
 */
export type SentenceFilterType =
  | { type: 'all' }                              // All sentences
  | { type: 'sourceType'; sourceType: SourceType } // Filter by source type
  | { type: 'article'; articleId: string }       // Filter by article
  | { type: 'paragraph'; paragraphId: string }   // Filter by paragraph
  | { type: 'time'; order: 'asc' | 'desc' }      // Sort by time
  | { type: 'random'; count?: number }           // Random selection
  | { type: 'tag'; tag: string };                // Filter by tag

/**
 * Sidebar 显示模式
 * Controls how sentences are displayed in the sidebar
 */
export type SidebarDisplayMode = 'flat' | 'by-article' | 'by-paragraph';

// === LLM Platform Types ===

/**
 * LLM 提供商配置
 * Configuration for an LLM provider (OpenAI, Gemini, Ollama, etc.)
 */
export interface LLMProviderConfig {
  id: string;                    // Unique identifier, e.g., 'openai', 'gemini', 'custom-1'
  name: string;                  // Display name, e.g., 'OpenAI', 'Google Gemini'
  baseUrl: string;               // API Base URL
  apiKey: string;                // API Key (stored securely)
  isEnabled: boolean;            // Whether this provider is enabled
  models?: string[];             // Cached list of available models
  lastFetched?: number;          // Timestamp of last model list fetch
}

/**
 * 模型参数配置
 * User-adjustable parameters for LLM API calls
 */
export interface LLMModelParams {
  temperature: number;           // Temperature (0-2), controls randomness, default 0
  topP: number;                  // Top-P sampling (0-1), default 1
  maxTokens?: number;            // Maximum tokens to generate, undefined = no limit
  frequencyPenalty: number;      // Frequency penalty (-2 to 2), default 0
  presencePenalty: number;       // Presence penalty (-2 to 2), default 0
  seed?: number;                 // Random seed for reproducible results
}

/**
 * 默认模型参数
 * Default parameters optimized for deterministic tasks like segmentation
 */
export const DEFAULT_MODEL_PARAMS: LLMModelParams = {
  temperature: 0,                // Deterministic output for segmentation tasks
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

/**
 * LLM 模型信息
 * Information about an available model
 */
export interface LLMModel {
  id: string;                    // Model ID, e.g., 'gpt-4', 'gemini-2.0-flash'
  name: string;                  // Display name
  providerId: string;            // ID of the provider this model belongs to
  contextLength?: number;        // Context window size limit
  supportsJson?: boolean;        // Whether the model supports JSON mode
}

/**
 * LLM 任务类型
 * Types of tasks that can be executed via the LLM platform
 */
export type LLMTaskType =
  | 'segment'           // Split text into sentences (single language)
  | 'segment-align'     // Semantically align and split EN+ZH texts together
  | 'translate'         // Translate text
  | 'score'             // Score user translation quality
  | 'greeting'          // Generate personalized greetings
  | 'custom';           // Custom task with user-provided prompt

/**
 * LLM 任务请求
 * Request structure for executing an LLM task
 */
export interface LLMTaskRequest {
  taskType: LLMTaskType;
  modelId: string;               // Model to use
  providerId: string;            // Provider to use
  params: Record<string, unknown>; // Task-specific parameters
  modelParams?: Partial<LLMModelParams>;  // Optional model parameter overrides
}

/**
 * LLM 任务响应
 * Response structure from an LLM task execution
 */
export interface LLMTaskResponse<T = unknown> {
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
 * 任务模型配置
 * Configuration for a specific task's model selection
 */
export interface TaskModelConfig {
  providerId: string;
  modelId: string;
  params?: Partial<LLMModelParams>;  // Task-level parameter overrides
}

/**
 * LLM 设置
 * Complete LLM platform settings
 */
export interface LLMSettings {
  providers: LLMProviderConfig[];
  defaultProvider?: string;      // Default provider ID
  defaultModel?: string;         // Default model ID
  defaultParams: LLMModelParams; // Global default model parameters
  taskModels: {                  // Per-task model configuration
    [K in LLMTaskType]?: TaskModelConfig;
  };
}

/**
 * 默认 LLM 设置
 * Default settings for new installations
 */
export const DEFAULT_LLM_SETTINGS: LLMSettings = {
  providers: [],
  defaultParams: DEFAULT_MODEL_PARAMS,
  taskModels: {},
};

// === Practice History Types ===

/**
 * 练习历史条目 - 用于历史面板展示
 * Unified history entry aggregated from all sentences
 */
export interface PracticeHistoryEntry {
  id: string;                              // 组合ID: `${sentenceId}-${direction}-${timestamp}`
  sentenceId: string;                      // 关联的句子ID
  direction: 'en-to-zh' | 'zh-to-en';      // 练习方向
  timestamp: number;                       // 练习时间戳
  text: string;                            // 用户的翻译文本
  type: FeedbackMode;                      // 反馈类型: 'diff' | 'llm' | 'draft'
  score?: number;                          // AI评分 (仅 LLM 模式)
  // 反规范化字段，用于展示
  originalEn: string;                      // 原句英文
  originalZh: string;                      // 原句中文
  articleId?: string;                      // 来源文章ID
}

/**
 * 时间过滤预设
 */
export type TimeFilterPreset = 'today' | 'week' | 'month' | 'all';

/**
 * 历史过滤状态
 */
export interface HistoryFilterState {
  preset: TimeFilterPreset;
  customRange?: { start: number; end: number };  // 未来扩展：自定义日期范围
}
