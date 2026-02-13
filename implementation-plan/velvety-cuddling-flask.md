# 统一左右侧边栏 Collapse/Expand UX 逻辑

## Context

当前左右侧边栏的 collapse/expand 交互逻辑不一致：
- **左侧边栏**：使用独立的浮动 collapse 按钮（位于侧边栏右边缘外部）
- **右侧边栏**：collapse 按钮集成在 header 内部，紧贴标题右侧

这种差异导致视觉不对称和用户认知负担。需要统一为右侧边栏的交互模式。

## 目标

将左侧边栏的 collapse 按钮从"独立浮动"模式改为"集成在 header 内部"模式，与右侧边栏保持一致。

## 关键文件

### 需要修改的文件

1. **`components/sentence-mode/SentenceSidebar.tsx`** (第 302-340 行)
   - 当前 collapse 按钮是独立的（不在 header 内）
   - 需要在 header 的标题右侧添加 collapse 按钮

2. **`components/vocabulary/VocabularySidebar.tsx`** (参考实现)
   - 第 79-96 行展示了正确的 header 模式：
     - `flex items-center justify-between` 布局
     - 标题在左侧，collapse 按钮在右侧

3. **`views/SentenceMode.tsx`**
   - 状态管理已存在（`sidebarCollapsed`, `toggleSidebar`）
   - 无需修改

## 实施方案

### 步骤 1：修改 SentenceSidebar header 结构

**位置**：`SentenceSidebar.tsx` 第 304-343 行

**当前结构**：
```tsx
<div className="p-4 border-b border-[var(--glass-border)] flex-shrink-0">
  <div className="min-w-0">
    {contextFilter ? (
      <button>...</button>  // 返回按钮
    ) : (
      <div className="flex items-center justify-between">  // ← 这里有 justify-between 但 collapse 按钮不在里面
        <h2>All Sentences</h2>
        <div className="flex items-center gap-2">
          {/* Search 按钮 */}
          {/* 计数 */}
        </div>
      </div>
    )}
  </div>
</div>
```

**修改后结构**：
```tsx
<div className="p-4 border-b border-[var(--glass-border)] flex-shrink-0">
  <div className="min-w-0">
    {contextFilter ? (
      <button>...</button>  // 返回按钮（保持不变）
    ) : (
      <div className="flex items-center justify-between">
        <h2>All Sentences</h2>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Collapse 按钮 - 新增 */}
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-[var(--surface-hover)] transition-colors"
            title="Collapse"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          {/* Search 按钮 */}
          {/* 计数 */}
        </div>
      </div>
    )}
  </div>
</div>
```

### 步骤 2：确认收起状态保持一致

**位置**：`SentenceSidebar.tsx` 第 286-300 行

收起状态的代码已经是正确的（垂直文字显示，可点击展开），与 `VocabularySidebar.tsx` 第 56-73 行一致。无需修改。

### 步骤 3：同步动画时长

**当前差异**：
- 左侧边栏：`duration-300`
- 右侧边栏：`duration-200`

**修改**：将左侧边栏的 `duration-300` 改为 `duration-200`（第 303 行）

## 验证

1. 启动开发服务器：`npm run dev`
2. 测试左侧边栏：
   - 点击 header 右侧新的 collapse 按钮，侧边栏应收起为 40px 宽度
   - 点击收起状态下的垂直文字区域，侧边栏应展开为 288px
3. 测试右侧边栏：确保行为与左侧一致
4. 验证快捷键 `⌘B` 仍然正常工作

## 视觉参考

右侧边栏 header（`VocabularySidebar.tsx` 第 79-96 行）是目标模式：
- 标题和 collapse 按钮在同一行
- 使用 `justify-between` 分隔
- Collapse 按钮使用 `p-1` 的圆形设计
- Hover 时显示 `bg-[var(--surface-hover)]`
