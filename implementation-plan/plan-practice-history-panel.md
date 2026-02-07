# 练习历史面板 - 设计与实现文档

## Context

用户希望添加一个练习历史面板，用于回顾和管理过去的翻译练习记录。核心需求是能够按时间过滤历史条目，帮助用户追踪学习进度和复习过去的练习。

目前应用已有的数据结构 `UserTranslation.history: TranslationRecord[]` 存储了每个句子的练习历史，但缺少一个统一的 UI 界面来浏览和筛选这些记录。

---

## 1. 数据模型设计

### 方案选择：基于现有数据的派生视图

**不创建新的存储文件**，而是从现有 `sentences.json` 中的 `userTranslation.history` 字段提取并聚合数据。

**理由：**
- 避免数据重复和同步问题
- 现有 `TranslationRecord` 已包含所需字段 (`timestamp`, `type`, `text`, `score`)
- 客户端计算对于常规数据量（<1000 条历史）足够高效

### 新增类型定义 (types.ts)

```typescript
/**
 * 练习历史条目 - 用于历史面板展示
 * Unified history entry aggregated from all sentences
 */
export interface PracticeHistoryEntry {
  id: string;                      // 组合ID: `${sentenceId}-${direction}-${timestamp}`
  sentenceId: string;              // 关联的句子ID
  direction: 'en-to-zh' | 'zh-to-en';  // 练习方向
  timestamp: number;               // 练习时间戳
  text: string;                    // 用户的翻译文本
  type: FeedbackMode;              // 反馈类型: 'diff' | 'llm' | 'draft'
  score?: number;                  // AI评分 (仅 LLM 模式)
  // 反规范化字段，用于展示
  originalEn: string;              // 原句英文
  originalZh: string;              // 原句中文
  articleId?: string;              // 来源文章ID
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
```

---

## 2. UI/UX 设计

### 2.1 面板形式：Modal

采用与 `SettingsModal` 一致的全屏 Modal 模式，原因：
- 复用现有的 `glass-panel` 样式系统
- 不影响主界面布局
- 适配移动端

### 2.2 布局结构

```
┌─────────────────────────────────────────────────────────────────┐
│  📖 练习历史                                               [×]  │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [今天] [本周] [本月] [全部]                    共 24 条记录 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 2026年2月7日                                              │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ 🟢 14:32  EN→ZH  "The weather is nice..."          92分   │  │
│  │ 🔵 14:15  ZH→EN  "今天天气很好..."                  diff   │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ 2026年2月6日                                              │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ 🟡 10:20  EN→ZH  "She went to the store..."        65分   │  │
│  │ ...                                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 单条记录样式

```
┌────────────────────────────────────────────────────────────────┐
│ 🟢 14:32   EN→ZH   "The weather is nice today..."       92分  │
│            ↳ 你的翻译: "今天的天气真不错..."                    │
│                                              [跳转到句子] →    │
└────────────────────────────────────────────────────────────────┘
```

**状态指示器颜色：**
- 🟢 绿色：LLM 评分 ≥ 80
- 🟡 黄色：LLM 评分 60-79
- 🔴 红色：LLM 评分 < 60
- 🔵 蓝色：Diff 模式
- ⚪ 灰色：草稿

### 2.4 交互流程

1. 用户点击侧边栏头部的「历史」图标按钮
2. Modal 打开，默认显示「本周」的记录
3. 点击时间过滤按钮切换筛选范围
4. 记录按日期分组，组内按时间倒序
5. 点击「跳转到句子」关闭 Modal 并导航到对应句子
6. 按 Escape 或点击 × 关闭

---

## 3. 时间过滤实现

### 预设时间段（MVP 实现）

```typescript
// utils/historyUtils.ts

const TIME_PRESETS: Record<TimeFilterPreset, () => { start: number; end: number }> = {
  today: () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { start: start.getTime(), end: Date.now() };
  },
  week: () => {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return { start: start.getTime(), end: Date.now() };
  },
  month: () => {
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    start.setHours(0, 0, 0, 0);
    return { start: start.getTime(), end: Date.now() };
  },
  all: () => ({ start: 0, end: Date.now() }),
};
```

### 未来扩展：自定义日期范围

如需添加日期选择器，可使用原生 `<input type="date">` 或轻量级库如 `react-day-picker`。

---

## 4. 文件结构

### 新增文件

```
components/
└── HistoryModal/
    ├── HistoryModal.tsx        # 主 Modal 容器
    ├── HistoryFilter.tsx       # 时间过滤按钮组
    ├── HistoryList.tsx         # 按日期分组的列表
    └── HistoryEntry.tsx        # 单条历史记录组件

hooks/
└── usePracticeHistory.ts       # 历史数据聚合 Hook

utils/
└── historyUtils.ts             # 提取、过滤、分组工具函数
```

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `types.ts` | 添加 `PracticeHistoryEntry`, `TimeFilterPreset`, `HistoryFilterState` 类型 |
| `views/SentenceMode.tsx` | 添加 `showHistoryModal` 状态和触发逻辑 |
| `components/sentence-mode/SentenceSidebar.tsx` | 在头部添加历史按钮图标 |
| `components/Icons.tsx` | 添加 `HistoryIcon` 组件 |

---

## 5. API 设计

### 无需新增 API

现有 `GET /api/sentences` 已返回完整数据（包含 `userTranslation.history`），客户端可直接从内存中的 `sentences` 数组提取历史。

### 可选优化（数据量大时）

如历史记录超过 500 条导致性能问题，可考虑：
```
GET /api/history?from=<timestamp>&to=<timestamp>&limit=50&offset=0
```
但 MVP 阶段不需要。

---

## 6. 核心实现逻辑

### 6.1 历史提取 (historyUtils.ts)

```typescript
export function extractAllHistory(sentences: SentencePair[]): PracticeHistoryEntry[] {
  const entries: PracticeHistoryEntry[] = [];

  for (const sentence of sentences) {
    // 提取 EN→ZH 历史
    const zhHistory = sentence.userTranslationZh?.history ?? [];
    // 也包含当前翻译（如果存在且非草稿）
    if (sentence.userTranslationZh && sentence.userTranslationZh.type !== 'draft') {
      zhHistory.push(sentence.userTranslationZh);
    }

    for (const record of zhHistory) {
      entries.push({
        id: `${sentence.id}-zh-${record.timestamp}`,
        sentenceId: sentence.id,
        direction: 'en-to-zh',
        timestamp: record.timestamp,
        text: record.text,
        type: record.type,
        score: record.score,
        originalEn: sentence.en,
        originalZh: sentence.zh,
        articleId: sentence.articleId,
      });
    }

    // 同理提取 ZH→EN 历史
    const enHistory = sentence.userTranslationEn?.history ?? [];
    if (sentence.userTranslationEn && sentence.userTranslationEn.type !== 'draft') {
      enHistory.push(sentence.userTranslationEn);
    }

    for (const record of enHistory) {
      entries.push({
        id: `${sentence.id}-en-${record.timestamp}`,
        sentenceId: sentence.id,
        direction: 'zh-to-en',
        timestamp: record.timestamp,
        text: record.text,
        type: record.type,
        score: record.score,
        originalEn: sentence.en,
        originalZh: sentence.zh,
        articleId: sentence.articleId,
      });
    }
  }

  // 按时间倒序排列
  return entries.sort((a, b) => b.timestamp - a.timestamp);
}
```

### 6.2 按日期分组

```typescript
export function groupByDate(
  entries: PracticeHistoryEntry[]
): Map<string, PracticeHistoryEntry[]> {
  const groups = new Map<string, PracticeHistoryEntry[]>();

  for (const entry of entries) {
    const dateKey = new Date(entry.timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(entry);
  }

  return groups;
}
```

### 6.3 usePracticeHistory Hook

```typescript
export function usePracticeHistory(
  sentences: SentencePair[],
  filter: HistoryFilterState
) {
  return useMemo(() => {
    const all = extractAllHistory(sentences);
    const range = TIME_PRESETS[filter.preset]();

    const filtered = all.filter(
      (e) => e.timestamp >= range.start && e.timestamp <= range.end
    );

    const grouped = groupByDate(filtered);

    return {
      entries: filtered,
      grouped,
      totalCount: filtered.length,
    };
  }, [sentences, filter.preset]);
}
```

---

## 7. 实现步骤

### Phase 1: 核心功能（优先级：高）

| 步骤 | 任务 | 文件 |
|------|------|------|
| 1.1 | 添加类型定义 | `types.ts` |
| 1.2 | 实现 `historyUtils.ts` | `utils/historyUtils.ts` |
| 1.3 | 实现 `usePracticeHistory` Hook | `hooks/usePracticeHistory.ts` |
| 1.4 | 创建 `HistoryModal.tsx` 框架 | `components/HistoryModal/HistoryModal.tsx` |
| 1.5 | 实现 `HistoryFilter.tsx` | `components/HistoryModal/HistoryFilter.tsx` |
| 1.6 | 实现 `HistoryList.tsx` | `components/HistoryModal/HistoryList.tsx` |
| 1.7 | 实现 `HistoryEntry.tsx` | `components/HistoryModal/HistoryEntry.tsx` |
| 1.8 | 添加 `HistoryIcon` | `components/Icons.tsx` |
| 1.9 | 集成到 `SentenceMode` | `views/SentenceMode.tsx` |
| 1.10 | 在侧边栏添加触发按钮 | `components/sentence-mode/SentenceSidebar.tsx` |

### Phase 2: 增强功能（优先级：中）

| 步骤 | 任务 |
|------|------|
| 2.1 | 「跳转到句子」导航功能 |
| 2.2 | 空状态 UI |
| 2.3 | 键盘导航 (↑↓ 选择, Escape 关闭) |
| 2.4 | 移动端响应式适配 |

### Phase 3: 未来扩展（优先级：低）

- 自定义日期范围选择器
- 导出历史为 CSV
- 练习统计可视化图表
- 历史记录搜索

---

## 8. 验证方案

### 功能验证

1. 启动开发服务器 `npm run dev`
2. 进行几次翻译练习（EN→ZH 和 ZH→EN 各几次）
3. 点击历史按钮打开面板
4. 验证：
   - 历史记录正确显示
   - 时间过滤按钮工作正常
   - 按日期分组正确
   - 点击「跳转到句子」能正确导航

### 边界情况

- 无历史记录时显示空状态
- 只有草稿（无提交记录）时的处理
- 大量历史记录（>100条）的滚动性能

---

## 9. 关键文件参考

| 文件 | 参考内容 |
|------|----------|
| [types.ts](types.ts) | 现有 `TranslationRecord`, `UserTranslation`, `SentencePair` 定义 |
| [views/SentenceMode.tsx](views/SentenceMode.tsx) | Modal 状态管理模式，`selectedId` 导航逻辑 |
| [components/SettingsModal.tsx](components/SettingsModal.tsx) | Modal 样式和布局参考 |
| [components/sentence-mode/SentenceSidebar.tsx](components/sentence-mode/SentenceSidebar.tsx) | 分组列表 UI 模式，头部按钮布局 |
