# 移动端练习界面修复计划

## Context

用户报告了移动端练习界面的两个问题：
1. **用户译文不显示**：提交后输入框清空，退出再进入同一句子时看不到已提交的译文，但绿色圆圈却显示已完成
2. **需要移除提示功能**：去掉移动端练习界面中的提示组件及相关功能

## 问题分析

### 问题 1：用户译文不显示

**根本原因**：`MobilePractice.tsx` 第 52-60 行的 `useEffect` 逻辑问题

```typescript
React.useEffect(() => {
  if (existingTranslation?.type === 'draft') {
    setUserInput(existingTranslation.text);  // 只有草稿才回填
  } else {
    setUserInput('');  // ← 问题：已提交的译文 (type='diff') 会被清空
  }
  // ...
}, [sentence.id, existingTranslation]);
```

当用户提交后，译文类型从 `'draft'` 变为 `'diff'`，导致 `else` 分支执行，输入框被清空。

### 问题 2：提示功能需移除

涉及代码位置：
- `MobilePractice.tsx`：状态 `showHint`、处理函数 `handleHint`、提示文本渲染
- `PracticeToolbar.tsx`：提示按钮配置

## 修改计划

### 文件 1: [views/mobile/MobilePractice.tsx](views/mobile/MobilePractice.tsx)

#### 修改 1.1：修复用户译文回填逻辑

**位置**：第 52-60 行

**修改前**：
```typescript
React.useEffect(() => {
  if (existingTranslation?.type === 'draft') {
    setUserInput(existingTranslation.text);
  } else {
    setUserInput('');
  }
  setIsFlipped(false);
  setShowHint(false);
}, [sentence.id, existingTranslation]);
```

**修改后**：
```typescript
React.useEffect(() => {
  if (existingTranslation?.text) {
    setUserInput(existingTranslation.text);  // 无论 draft 还是 diff 都回填
  } else {
    setUserInput('');
  }
  setIsFlipped(false);
}, [sentence.id, existingTranslation]);
```

#### 修改 1.2：移除提示相关状态和函数

**删除内容**：
- 第 41 行：`const [showHint, setShowHint] = useState(false);`
- 第 140-143 行：`handleHint` 函数
- 第 146 行：`hintText` 常量
- 第 137 行：`setShowHint(false);`（在 `handleReset` 中）

#### 修改 1.3：移除提示组件渲染

**删除**：第 163-174 行的提示显示区域
```typescript
{showHint && !isFlipped && (
  <div ...>
    Hint: {hintText}
  </div>
)}
```

#### 修改 1.4：移除 PracticeToolbar 的提示相关 props

**修改**：第 188-196 行
```typescript
<PracticeToolbar
  onSubmit={handleSubmit}
  onSkip={handleSkip}
  onReset={handleReset}
  isSubmitDisabled={!userInput.trim() || isSubmitting}
/>
```

### 文件 2: [components/mobile/PracticeToolbar.tsx](components/mobile/PracticeToolbar.tsx)

#### 修改 2.1：移除提示按钮相关代码

**修改 Props 接口**（第 3-10 行）：
```typescript
interface PracticeToolbarProps {
  onSubmit: () => void;
  onSkip: () => void;
  onReset: () => void;
  isSubmitDisabled: boolean;
}
```

**删除 buttons 数组中的 hint 按钮**（第 30-41 行）

## 验证步骤

1. 启动开发服务器：`npm run dev`
2. 在移动端浏览器或开发者工具的移动模式下访问
3. 测试用户译文显示：
   - 选择一个句子进入练习
   - 输入译文并提交
   - 退出再进入同一句子，确认输入框显示已提交的译文
4. 确认提示按钮已移除：
   - 检查底部工具栏只有 3 个按钮（提交、跳过、重置）
   - 确认无提示显示区域
