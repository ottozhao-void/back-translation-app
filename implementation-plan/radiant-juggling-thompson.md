# Plan: Mobile Vocabulary Management

## Context

桌面端已实现完整的词汇管理功能（`VocabularySidebar` + `VocabularyDetailCard`），但移动端 `MobileApp.tsx` 使用独立的导航架构（底部标签栏），目前没有词汇管理入口。用户无法在移动设备上访问和管理工作收集的词汇。

## Goal

为移动端添加词汇管理功能，提供与桌面端对等的体验，包括：
- 词汇列表浏览（支持筛选、搜索）
- 词汇详情查看
- 编辑和删除操作
- AI 重新增强功能

## Design Decisions (User Approved)

| Aspect | Decision |
|--------|----------|
| **Tab Position** | Between Practice and History (`首页 → 练习 → **词汇** → 历史 → 设置`) |
| **Detail View Style** | Full-screen modal (slides up from bottom, covers entire screen) |
| **Search Behavior** | Inline search bar (always visible at top, like desktop) |
| **Feature Scope** | Core features only: View, filter, search, view details, delete (no editing/AI retry in v1) |

## Implementation Plan

### Phase 1: 创建移动端词汇视图组件

**文件**: `views/mobile/MobileVocabulary.tsx` (新建)

复用桌面端的核心逻辑和 UI 组件：
- `hooks/useVocabulary.ts` - 词汇状态管理
- `components/vocabulary/constants.ts` - 类型常量
- `utils/vocabularyLoader.ts` - 筛选和搜索工具函数

布局设计：
```
┌─────────────────────────────┐
│ 生词本                      │ MobileHeader
├─────────────────────────────┤
│ [全部] [单词] [短语] [模式]  │ 筛选标签栏
├─────────────────────────────┤
│ 🔍 Search vocabulary...     │ Inline search bar
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ serendipity      [word] │ │ 可滚动列表
│ │ The occurrence of events│ │ (mobile-optimized)
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ look forward to  [phr] │ │
│ │ to anticipate with...  │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
┌─────────────────────────────┐
│ [×]  serendipity            │ Full-screen Detail Modal
│                             │
│ word · Enriched             │
│                             │
│ The occurrence and develop- │
│ ment of events by chance in │
│ a happy or beneficial way.  │
│                             │
│ Examples:                   │
│ "They found each other by   │
│  pure serendipity."         │
│                             │
│ Sources (2)                 │
│ ┌─────────────────────────┐ │
│ │ The discovery was a... │ │
│ └─────────────────────────┘ │
│                             │
│ [Delete]                    │
└─────────────────────────────┘
```

### Phase 2: 扩展底部标签栏

**文件**: `components/mobile/BottomTabBar.tsx` (修改)

添加词汇标签（插入在 practice 和 history 之间）：
```typescript
type MobileTab = 'home' | 'practice' | 'vocabulary' | 'history' | 'settings';
```

标签栏布局（5个标签）：
- 首页 (Home)
- 练习 (Practice)
- **生词本 (Vocabulary)** ← 新增，插入位置
- 历史 (History)
- 设置 (Settings)

### Phase 3: 更新移动端应用路由

**文件**: `views/mobile/MobileApp.tsx` (修改)

1. 添加 `vocabulary` 到 `MobileTab` 类型
2. 添加词汇视图路由处理
3. 将 `activeTab` 状态扩展包含词汇页面

### Phase 4: 创建移动端列表项组件

**文件**: `components/mobile/VocabularyListItem.tsx` (新建)

移动端优化的列表项（核心功能）：
- 最小高度 56px（符合移动端触摸标准）
- 类型标签颜色复用 `VOCABULARY_TYPE_COLORS`
- pending 状态脉冲动画
- 点击打开详情模态框

**注意**: 核功能版本不包含左滑操作

### Phase 5: 创建全屏详情模态框

**文件**: `components/mobile/VocabularyDetailModal.tsx` (新建)

全屏模态框展示词汇详情：
- 固定顶部栏：标题 + 关闭按钮
- 类型标签和状态指示器
- 英文/中文定义
- 例句展示
- 来源句子列表（只读，点击可跳转）
- 底部删除按钮

**注意**: 核心版本不包含编辑功能

### Phase 6: 移除独立搜索组件

**决策**: 使用内联搜索栏（在 MobileVocabulary.tsx 中实现），无需单独的搜索模态框组件。

## Critical Files

### 新建文件
- `views/mobile/MobileVocabulary.tsx` - 主词汇视图
- `components/mobile/VocabularyListItem.tsx` - 移动端列表项
- `components/mobile/VocabularyDetailModal.tsx` - 全屏详情模态框

### 修改文件
- `views/mobile/MobileApp.tsx` - 添加词汇路由
- `components/mobile/BottomTabBar.tsx` - 添加词汇标签

### 复用文件（无需修改）
- `hooks/useVocabulary.ts` - 词汇状态管理（完整复用）
- `utils/vocabularyLoader.ts` - 筛选和搜索工具函数（完整复用）
- `components/vocabulary/constants.ts` - 类型颜色常量（完整复用）

## Implementation Order

1. **VocabularyListItem.tsx** - 创建移动端列表项组件（UI基础）
2. **VocabularyDetailModal.tsx** - 创建全屏详情模态框
3. **MobileVocabulary.tsx** - 创建主视图，连接数据层
4. **BottomTabBar.tsx** - 添加词汇标签
5. **MobileApp.tsx** - 集成路由和传递词汇 hook

## Verification

### 功能测试（核心功能）
- [ ] 底部标签栏显示"生词本"图标和标签
- [ ] 点击词汇标签进入词汇页面
- [ ] 词汇列表正确显示所有词汇
- [ ] 筛选标签（全部/单词/短语/模式）正常工作
- [ ] 搜索框输入返回正确结果
- [ ] 点击词汇项打开全屏详情模态框
- [ ] 详情中显示定义、例句、来源句子
- [ ] 删除按钮正确删除词汇

### UI/UX 测试
- [ ] 在 375px (iPhone SE) 宽度下正常显示
- [ ] 触摸目标符合 44px 最小尺寸
- [ ] 过渡动画流畅
- [ ] 颜色与桌面端保持一致

### 数据同步
- [ ] 桌面端添加的词汇在移动端可见
- [ ] 移动端删除的词汇在桌面端同步

### UI/UX 测试
- [ ] 在 375px (iPhone SE) 宽度下正常显示
- [ ] 触摸目标符合 44px 最小尺寸
- [ ] 过渡动画流畅
- [ ] 颜色与桌面端保持一致

### 数据同步
- [ ] 桌面端添加的词汇在移动端可见
- [ ] 移动端编辑的词摆在桌面端同步
- [ ] 删除操作两端同步

## Design Notes

### 移动端特性
- **底部导航**：符合移动端使用习惯
- **全屏详情**：利用移动端垂直空间
- **左滑操作**：快速访问常用操作
- **触摸优化**：所有交互元素 ≥44px

### 复用策略
- 复用桌面端的数据层（`useVocabulary`, `vocabularyLoader`）
- 复用业务逻辑（API 调用、状态管理）
- 重新实现 UI 层以适配移动端交互模式
