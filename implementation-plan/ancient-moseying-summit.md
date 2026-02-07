# Tag System UI 布局调整

## Context

用户反馈当前桌面端 Tag 标签系统的 UI 设计存在两个问题：
1. Sidebar 不应该包含 tag 分类模式，应保留原有的三种显示方式
2. 详情卡片中 Tag UI 组件的位置不合适，应与中英切换按钮放在同一行

## 实施计划

### 1. 移除 Sidebar 的 Tag 分类模式

#### 1.1 修改类型定义
**文件**: [types.ts:172](types.ts#L172)

```typescript
// Before
export type SidebarDisplayMode = 'flat' | 'by-article' | 'by-paragraph' | 'by-tag';

// After
export type SidebarDisplayMode = 'flat' | 'by-article' | 'by-paragraph';
```

#### 1.2 移除 ViewModeSelector 中的 Tag 选项
**文件**: [SentenceSidebar.tsx](components/sentence-mode/SentenceSidebar.tsx)

从 `modes` 数组中移除 `{ value: 'by-tag', label: 'Tag', icon: '🏷' }` 选项。

#### 1.3 移除 Tag 分组逻辑
**文件**: [SentenceSidebar.tsx](components/sentence-mode/SentenceSidebar.tsx)

在 `groupList` useMemo 中移除 `displayMode === 'by-tag'` 分支的代码块。

#### 1.4 移除 Tag 点击处理
**文件**: [SentenceSidebar.tsx](components/sentence-mode/SentenceSidebar.tsx)

在 `handleGroupClick` 函数中移除 `displayMode === 'by-tag'` 分支的代码块。

> **注意**: 保留 `ContextFilter` 接口中的 tag 相关类型定义，以便未来可能通过其他入口（如详情卡片的 tag 点击）实现 tag 筛选功能。

---

### 2. 调整详情卡片中 Tag 的位置

#### 2.1 合并 Header Row 和 Tags Row
**文件**: [SentenceInfoCard.tsx:89-139](components/sentence-mode/cards/SentenceInfoCard.tsx#L89-L139)

将原来分开的两行合并为一行，布局结构：
```
[中英切换按钮] ─── [Tags 区域] ─── [Practiced 徽章]
     左侧              中间              右侧
```

**修改前**:
- 第一行 (L89-107): Mode Toggle 和 Practiced Badge
- 第二行 (L109-139): Tags 区域单独一行

**修改后**:
```tsx
{/* Header Row: Mode Toggle + Tags + Practiced Badge */}
<div className="flex items-center justify-between mb-6">
  {/* Left: Mode Toggle */}
  <button ... className="... flex-shrink-0">
    {practiceMode === 'EN_TO_ZH' ? 'EN → 中' : '中 → EN'}
  </button>

  {/* Center: Tags */}
  <div className="flex flex-wrap items-center gap-2 mx-4 min-w-0 flex-1 justify-center">
    {/* TagChips 和 + Tag 按钮 */}
  </div>

  {/* Right: Practiced Badge */}
  <div className="flex-shrink-0">
    {hasPracticed && <span>Practiced</span>}
  </div>
</div>
```

**布局要点**:
- 外层: `flex items-center justify-between mb-6`
- 切换按钮: `flex-shrink-0` 固定宽度
- Tags 区域: `flex-1 min-w-0 mx-4 justify-center` 弹性居中
- Badge 容器: `flex-shrink-0` 保持右侧位置稳定

---

## 需修改的文件

| 文件 | 修改内容 |
|------|----------|
| [types.ts](types.ts) | 从 `SidebarDisplayMode` 移除 `'by-tag'` |
| [SentenceSidebar.tsx](components/sentence-mode/SentenceSidebar.tsx) | 移除 tag 模式选项和相关逻辑 |
| [SentenceInfoCard.tsx](components/sentence-mode/cards/SentenceInfoCard.tsx) | 重构 header 布局，合并 tag 到第一行 |

---

## 验证步骤

1. **TypeScript 编译检查**: `npx tsc --noEmit` 确保无类型错误
2. **开发服务器**: `npm run dev` 启动并访问应用
3. **Sidebar 验证**:
   - 确认底部模式选择器只有 Flat/Article/Paragraph 三个选项
   - 确认切换各模式功能正常
4. **详情卡片验证**:
   - 确认 Tag 显示在与中英切换按钮同一行
   - 确认 Tag 的添加/删除功能正常
   - 确认 Practiced 徽章显示正常
5. **响应式检查**: 调整窗口大小，确认 Tags 区域在空间不足时正确换行
