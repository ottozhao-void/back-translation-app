# Sentence Mode - 待实现功能清单

本文档记录 Sentence Mode 中尚未实现的功能，按优先级和类别组织。

---

## Phase 5: 增强功能

### 5.1 批量导入句子

**优先级**: 低
**状态**: 未实现

**需求描述**:
- 支持 TSV 格式批量导入（制表符分隔：英文\t中文）
- 支持 JSON 格式批量导入
- 导入时自动去重（按内容哈希或 ID）
- 提供导入预览和确认界面

**技术方案**:
```typescript
// 新增 utils/batchImport.ts
interface ImportResult {
  success: number;
  duplicates: number;
  errors: string[];
}

export const importFromTSV = (content: string): SentencePair[];
export const importFromJSON = (content: string): SentencePair[];
export const validateImport = (pairs: SentencePair[]): ValidationResult;
```

**UI 变更**:
- 在 Sidebar 添加 "批量导入" 按钮
- 新增 `BatchImportModal.tsx` 组件
- 支持文件拖拽上传

---

### 5.2 标签系统

**优先级**: 低
**状态**: 未实现（类型已预留 `tags?: string[]`）

**需求描述**:
- 为句子添加自定义标签（如：#难句 #商务 #日常）
- 按标签筛选句子
- 标签管理界面（创建、删除、重命名）
- 标签颜色自定义

**技术方案**:
```typescript
// types.ts 中已有
interface SentencePair {
  tags?: string[];  // 已预留
}

// 新增过滤逻辑（sentenceLoader.ts 已支持）
{ type: 'tag'; tag: string }

// 需要新增
interface TagMetadata {
  name: string;
  color: string;
  count: number;
}
```

**UI 变更**:
- 在 SentenceItem 显示标签徽章
- 在 Sidebar Level 1 添加 "按标签" 分组视图
- 句子详情中添加标签编辑器

---

### 5.3 LLM 句子分解

**优先级**: 低
**状态**: 未实现

**需求描述**:
- 调用 LLM API 智能分解段落为对齐的中英句子对
- 解决传统算法句子数量不一致的问题
- 支持用户手动调整分解结果

**技术方案**:
```typescript
// 新增 services/llmSplitter.ts
interface SplitResult {
  pairs: Array<{ en: string; zh: string }>;
  confidence: number;
}

export const splitWithLLM = async (
  enParagraph: string,
  zhParagraph: string
): Promise<SplitResult>;
```

**实现要点**:
- 使用现有的 Gemini API 配置
- Prompt 设计：要求 LLM 返回对齐的句子对 JSON
- 添加结果缓存避免重复调用
- 提供回退到传统分解的选项

---

### 5.4 随机练习模式

**优先级**: 低
**状态**: 未实现（过滤逻辑已支持）

**需求描述**:
- 从句子库中随机抽取 N 个句子进行练习
- 支持设置随机数量
- 可选：排除已完成的句子
- 可选：按来源/标签限定随机范围

**技术方案**:
```typescript
// sentenceLoader.ts 已支持
filterSentences(sentences, { type: 'random', count: 10 })

// 需要新增 UI 入口
```

**UI 变更**:
- 在 Sidebar Level 1 添加 "随机练习" 卡片
- 点击后弹出配置面板（数量、范围）
- 直接进入练习模式

---

## 已实现但行为未激活

### Paragraph Mode 切换

**状态**: 设置已保存，行为未实现

**当前情况**:
- `AppSettings.practiceGranularity` 可保存 `'sentence' | 'paragraph'`
- SettingsModal 中有 Paragraph Mode 开关
- 切换后不改变任何 UI 行为

**待实现**:
- 当 `practiceGranularity === 'paragraph'` 时，HOME 视图显示 ArticleList
- 或者在 SentenceMode 中以段落为单位显示和练习

---

## UI/UX 增强

### 响应式设计 (移动端适配)

**优先级**: 中
**状态**: 未实现

**需求描述** (来自文档 5.8 节):
```typescript
const breakpoints = {
  mobile: '< 768px',    // 侧边栏覆盖全屏，点击句子后滑入练习区
  tablet: '768-1024px', // 侧边栏 280px 固定
  desktop: '> 1024px'   // 侧边栏 320px 固定
};
```

**移动端特殊处理**:
- Level 1 和 Level 2 都是全屏
- 练习区也是全屏
- 使用 slide 动画在三个"屏幕"间切换

---

## 性能与稳定性

### 大规模数据分页

**优先级**: 中（当句子数量 > 1000 时）
**状态**: 未实现

**问题描述**:
- `sentences.json` 文件可能变大
- 一次性加载所有句子可能影响性能

**解决方案**:
- 实现分页加载（每页 50-100 条）
- 虚拟滚动列表
- 服务端分页 API

---

### 并发修改同步

**优先级**: 低
**状态**: 未处理

**问题描述**:
- 多标签页同时打开时，数据修改可能冲突

**解决方案**:
- 使用 localStorage 事件监听
- 或 WebSocket 实时同步
- 或简单的"刷新检测"提示

---

## 更新记录

| 日期 | 更新内容 |
|------|----------|
| 2026-02-05 | 创建文档，整理 Phase 5 待实现功能 |
