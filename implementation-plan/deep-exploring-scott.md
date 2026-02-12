# 简化 Translation Type 设计

## Context

当前代码库中的 `FeedbackMode` 类型 (`'diff' | 'llm' | 'draft'`) 是旧版设计的遗留：
- `'diff'` 和 `'llm'` 是旧版 PracticeSession 组件中用于区分两种反馈模式（文本对比 vs AI 评分）
- 新版 SentenceMode 设计中只有一个 Check 按钮，硬编码使用 `'diff'` 类型
- `'llm'` 类型在新版中完全未被使用
- `type !== 'draft'` 的判断被用于控制提交后自动跳转到详情视图，这是用户报告的问题根源

**目标**：简化类型设计，只保留 `'draft'` 和 `'submitted'` 两种状态，移除不必要的复杂性。

---

## Implementation Plan

### Phase 1: 简化类型定义

**文件**: `types.ts`

```typescript
// 旧定义
export type FeedbackMode = 'diff' | 'llm' | 'draft';

// 新定义
export type SubmissionType = 'draft' | 'submitted';
```

更新 `TranslationRecord` 和 `PracticeHistoryEntry` 接口：

```typescript
export interface TranslationRecord {
  type: SubmissionType;  // 改名更清晰
  text: string;
  timestamp: number;
  score?: number;  // 保留以兼容历史数据，新版不使用
}

export interface PracticeHistoryEntry {
  // ...
  type: SubmissionType;
  // ...
}
```

---

### Phase 2: 更新 SentenceMode.tsx

**文件**: `views/SentenceMode.tsx`

1. **移除基于 type 的路由逻辑**（第 388-391 行）：
```typescript
// 删除这段代码
// Return to detail view after submission (if not a draft)
if (translation.type !== 'draft') {
  setViewMode('detail');
}
```

2. **保留统计更新逻辑**（第 376 行），但更新判断条件：
```typescript
// 旧: if (translation.type !== 'draft' && durationMs && durationMs > 0)
// 新:
if (translation.type === 'submitted' && durationMs && durationMs > 0) {
  updatedSentence.practiceStats = calculatePracticeStats(s.practiceStats, durationMs, now);
}
```

---

### Phase 3: 更新 SentencePracticeArea.tsx

**文件**: `components/sentence-mode/SentencePracticeArea.tsx`

1. **更新类型导入和使用**：
```typescript
// 导入 SubmissionType 而非 FeedbackMode
import { SubmissionType } from '../../types';
```

2. **更新草稿判断逻辑**（第 65、80 行）：
```typescript
// 旧: existingTranslation.type !== 'draft'
// 新: existingTranslation.type === 'submitted'

// 旧: existingTranslation.type === 'draft'
// 新: existingTranslation.type !== 'submitted'
```

3. **更新提交时的类型**（第 126 行）：
```typescript
// 旧: type: 'diff'
// 新: type: 'submitted'
```

---

### Phase 4: 更新历史记录相关文件

**文件**: `utils/historyUtils.ts`

1. **更新过滤逻辑**（第 64、98 行）：
```typescript
// 旧: .type !== 'draft'
// 新: .type === 'submitted'
```

2. **更新颜色函数**（第 177-185 行）：
```typescript
const getScoreColor = (type: SubmissionType, score?: number): string => {
  if (type === 'draft') return 'text-gray-400';
  // 已提交的翻译统一显示蓝色（不再区分 diff/llm）
  return 'text-blue-400';
};
```

**文件**: `components/HistoryModal/HistoryEntry.tsx`

更新标签显示（第 29-34 行）：
```typescript
const getTypeLabel = (entry: PracticeHistoryEntry): string => {
  if (entry.type === 'draft') return '草稿';
  // 已提交的翻译不再显示 diff/llm 标签
  return ''; // 或者显示 '已完成'
};
```

---

### Phase 5: 更新其他组件

**文件**: `components/sentence-mode/SentenceSidebar.tsx`

更新草稿状态判断（第 24 行）：
```typescript
// 旧: translation.type === 'draft'
// 新: translation.type !== 'submitted'
```

**文件**: `components/sentence-mode/cards/SentenceInfoCard.tsx`

更新已练习判断（第 343 行）：
```typescript
// 旧: translation && translation.type !== 'draft'
// 新: translation && translation.type === 'submitted'
```

---

### Phase 6: 数据迁移（兼容性）

**文件**: `utils/migration.ts` 或新建 `utils/submissionTypeMigration.ts`

添加迁移函数，处理现有数据中的 `'diff'` 和 `'llm'` 类型：

```typescript
/**
 * 迁移旧的 FeedbackMode 到新的 SubmissionType
 * - 'draft' -> 'draft'
 * - 'diff' -> 'submitted'
 * - 'llm' -> 'submitted'
 */
export function migrateFeedbackMode(oldType: 'diff' | 'llm' | 'draft'): SubmissionType {
  if (oldType === 'draft') return 'draft';
  return 'submitted';  // 'diff' 和 'llm' 都映射为 'submitted'
}

/**
 * 迁移句子数据中的类型
 */
export function migrateSentenceTypes(sentences: SentencePair[]): SentencePair[] {
  return sentences.map(sentence => {
    const updated = { ...sentence };

    if (updated.userTranslationZh) {
      updated.userTranslationZh = {
        ...updated.userTranslationZh,
        type: migrateFeedbackMode(updated.userTranslationZh.type as any),
      };
    }

    if (updated.userTranslationEn) {
      updated.userTranslationEn = {
        ...updated.userTranslationEn,
        type: migrateFeedbackMode(updated.userTranslationEn.type as any),
      };
    }

    return updated;
  });
}
```

在 `views/SentenceMode.tsx` 的 `loadSentences` effect 中添加迁移调用。

---

### Phase 7: 清理旧版代码（可选）

**文件**: `views/PracticeSession.tsx`

这个组件是旧版文章练习界面，如果不再使用可以考虑：
1. 保留但更新类型定义以兼容
2. 或者完全移除（如果确定不再需要）

如果保留，只需更新 `FeedbackMode` 为 `SubmissionType`，但保留组件内部的 UI 状态管理（因为这是组件内部逻辑，不应暴露到数据层）。

---

## Files to Modify

| 文件 | 修改内容 |
|------|----------|
| `types.ts` | 简化 `FeedbackMode` → `SubmissionType` |
| `views/SentenceMode.tsx` | 移除路由逻辑，更新统计判断 |
| `components/sentence-mode/SentencePracticeArea.tsx` | 更新类型使用 |
| `utils/historyUtils.ts` | 更新过滤和颜色逻辑 |
| `components/HistoryModal/HistoryEntry.tsx` | 更新标签显示 |
| `components/sentence-mode/SentenceSidebar.tsx` | 更新状态判断 |
| `components/sentence-mode/cards/SentenceInfoCard.tsx` | 更新已练习判断 |
| `utils/migration.ts` (或新建) | 添加数据迁移函数 |

---

## Verification

1. **功能测试**：
   - 输入译文，点击 Check → 应保持在练习界面
   - 自动保存 → 类型应为 'draft'
   - 提交 → 类型应为 'submitted'
   - 查看历史记录 → 已提交的记录显示蓝色

2. **数据迁移测试**：
   - 加载包含旧 'diff'/'llm' 类型的数据
   - 验证它们被正确映射为 'submitted'

3. **边界情况**：
   - 刷新页面后草稿状态保持
   - 切换句子后草稿正确恢复
   - 历史记录正确过滤掉草稿

---

## Notes

- `score` 字段保留在类型定义中是为了兼容历史数据，新版不使用
- 这次重构的核心是**简化语义**：`draft` vs `submitted` 比 `draft` vs `diff` vs `llm` 更清晰
- **关键变更**：移除 `type !== 'draft'` 导致的自动跳转，让用户控制是否查看详情
