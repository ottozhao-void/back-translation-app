# LLM Integration Roadmap

本文档记录了项目中计划或可以引入大语言模型（LLM）的功能点。

## 1. 用户明确提出的 LLM 功能

### 1.1 自动翻译功能 (Auto Translate)

**位置**: `components/sentence-mode/ImportModal.tsx`

**需求描述**:
- 在导入界面的双文本区域中，用户只需粘贴一种语言的文本
- 点击"自动翻译"按钮，系统调用 LLM 自动生成另一种语言的译文
- 支持双向翻译：EN → ZH 和 ZH → EN

**UI 预留**:
- `DualInputArea` 组件已预留扩展点，可添加翻译按钮
- 建议在每个 textarea 旁边添加 "Auto Translate" 按钮

**实现建议**:
```typescript
// 未来实现示例
const handleAutoTranslate = async (direction: 'en2zh' | 'zh2en') => {
  const source = direction === 'en2zh' ? enValue : zhValue;
  const result = await llmService.translate(source, direction);
  if (direction === 'en2zh') setZhValue(result);
  else setEnValue(result);
};
```

---

## 2. 可用 LLM 优化的现有功能

### 2.1 智能分句优化

**当前实现**: `utils/textUtils.ts` - `splitIntoSentences()`

**现状**:
- 使用正则表达式基于标点符号分割
- 无法处理复杂情况（如缩写 "Dr."、"U.S." 中的句点）

**LLM 优化方案**:
- 使用 LLM 进行语义级别的句子边界检测
- 更准确地处理中英文混合文本
- 识别并保持引用、对话等特殊结构

---

### 2.2 中英文对齐智能匹配

**当前实现**: Batch 导入要求用户手动保证行行对应

**痛点**:
- 中英文句子数量不一致时无法导入
- 用户需要手动调整对齐

**LLM 优化方案**:
- 使用 LLM 进行语义对齐（Semantic Alignment）
- 自动识别并匹配对应的中英文句子
- 处理一对多、多对一的翻译情况
- 提供对齐建议让用户确认

---

### 2.3 翻译质量评分 (LLM Scoring)

**当前状态**: 项目已有 `llm` 类型的反馈模式

**位置**: `types.ts` - `FeedbackMode = 'diff' | 'llm' | 'draft'`

**现有设计**:
- 用户翻译后可选择 LLM 评分模式
- 系统调用 LLM 对用户翻译进行打分和反馈

**优化方向**:
- 提供详细的翻译改进建议
- 指出具体的语法、用词问题
- 提供多个改进版本供参考

---

### 2.4 智能文章导入

**当前实现**: 用户需要分别粘贴中英文文本

**LLM 优化方案**:
- 用户只上传单语言文章，LLM 自动翻译全文
- 自动识别文章结构（标题、段落、列表等）
- 智能分段并保持中英文段落对应

---

### 2.5 学习进度分析

**潜在功能**:
- 基于用户的翻译历史，LLM 分析薄弱环节
- 推荐适合用户水平的练习内容
- 生成个性化的学习报告

---

### 2.6 TTS 语音合成增强

**当前实现**: `services/geminiService.ts` - Google GenAI TTS

**LLM 优化方案**:
- 使用 LLM 对文本进行预处理，优化朗读效果
- 识别专有名词、缩写并提供正确发音
- 根据语境调整语气和停顿

---

## 3. 技术实现建议

### 3.1 服务层设计

建议创建统一的 LLM 服务层：

```
services/
├── llmService.ts          # LLM 服务统一入口
├── translationService.ts  # 翻译相关
├── scoringService.ts      # 评分相关
└── alignmentService.ts    # 对齐相关
```

### 3.2 API 选择

项目已使用 Gemini API，可继续扩展：
- 翻译：Gemini Pro / GPT-4
- 评分：可用更小的模型降低成本
- 对齐：需要上下文理解能力强的模型

### 3.3 成本控制

- 实现请求缓存，避免重复调用
- 提供本地模型选项（如 Ollama）
- 批量处理以减少 API 调用次数

---

## 4. 优先级建议

| 优先级 | 功能 | 原因 |
|--------|------|------|
| P0 | 自动翻译 | 用户明确提出，UI 已预留 |
| P1 | 翻译质量评分 | 项目已有框架，只需集成 |
| P2 | 智能分句 | 提升用户体验 |
| P3 | 中英文对齐 | 解决核心痛点 |
| P4 | 学习进度分析 | 增值功能 |

---

*文档创建于: 2026-02-06*
*相关代码变更: 批量导入功能实现*
