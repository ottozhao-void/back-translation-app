# 标签系统设计与实现计划

## Context

用户希望通过标签系统实现句子过滤功能。有两种添加标签的方式：
1. **系统标签**：通过操作（如右键菜单"跳过"）自动添加
2. **用户自定义标签**：用户根据需求创建和管理

核心目标是让用户能够：
- 快速标记不想学习的句子（跳过）
- 自定义分类句子（如"语法难点"、"词汇"等）
- 在主页根据标签过滤句子

**关键发现**：代码库已预留标签基础设施：
- `types.ts:107` - `SentencePair.tags?: string[]` 已存在
- `types.ts:133` - `SentenceFilterType` 已定义 `{ type: 'tag'; tag: string }`
- `SentenceSidebar.tsx` 已有右键菜单实现

---

## 1. 数据模型变更

### 1.1 新增标签类型定义 (`types.ts`)

```typescript
// === 标签系统类型 ===

/** 系统标签（下划线前缀区分用户标签） */
export type SystemTagId = '_skip' | '_mastered' | '_difficult';

/** 标签元信息 */
export interface TagInfo {
  id: string;           // 标签ID（系统标签以_开头）
  label: string;        // 显示名称
  color?: string;       // 颜色（CSS颜色值）
  isSystem: boolean;    // 是否系统标签
  createdAt?: number;   // 创建时间（仅用户标签）
}

/** 预定义系统标签 */
export const SYSTEM_TAGS: Record<SystemTagId, TagInfo> = {
  '_skip': { id: '_skip', label: '跳过', color: '#6b7280', isSystem: true },
  '_mastered': { id: '_mastered', label: '已掌握', color: '#10b981', isSystem: true },
  '_difficult': { id: '_difficult', label: '困难', color: '#ef4444', isSystem: true },
};

/** 用户标签存储结构 */
export interface TagStore {
  version: number;
  userTags: TagInfo[];
  lastModified: number;
}
```

### 1.2 扩展侧边栏显示模式 (`types.ts:139`)

```typescript
export type SidebarDisplayMode = 'flat' | 'by-article' | 'by-paragraph' | 'by-tag';
```

### 1.3 扩展过滤类型 (`types.ts:126-133`)

```typescript
export type SentenceFilterType =
  | { type: 'all' }
  | { type: 'sourceType'; sourceType: SourceType }
  | { type: 'article'; articleId: string }
  | { type: 'paragraph'; paragraphId: string }
  | { type: 'time'; order: 'asc' | 'desc' }
  | { type: 'random'; count?: number }
  | { type: 'tag'; tag: string }
  | { type: 'untagged' }                      // 新增：无标签句子
  | { type: 'excludeTags'; tags: string[] };  // 新增：排除特定标签
```

### 1.4 更新 ContextFilter (`SentenceSidebar.tsx:75-79`)

```typescript
export interface ContextFilter {
  type: 'paragraph' | 'article' | 'tag';  // 新增 'tag'
  id: string;
  label: string;
}
```

### 1.5 新增设置项 (`types.ts` - AppSettings)

```typescript
export interface AppSettings {
  // ... 现有字段 ...
  hideSkippedByDefault?: boolean;  // 默认隐藏跳过的句子（默认true）
}
```

---

## 2. API 变更

### 2.1 更新 `/api/sentences/summary` 端点

**文件**：`vite.config.ts` (开发) + `server.js` (生产)

在 summary 映射中添加 tags 字段：
```typescript
const summary = (store.sentences || []).map((s: any) => ({
  // ... 现有字段 ...
  tags: s.tags || [],  // 新增
}));
```

### 2.2 更新 SentenceSummary 接口 (`utils/sentenceLoader.ts`)

```typescript
export interface SentenceSummary {
  // ... 现有字段 ...
  tags: string[];  // 新增
}
```

### 2.3 新增标签管理 API

**存储位置**：`public/data/tags.json`

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/tags` | GET | 获取所有用户标签 |
| `/api/tags` | POST | 创建新用户标签 `{ label, color? }` |
| `/api/tags?id=xxx` | DELETE | 删除用户标签 |
| `/api/tags/:id` | PATCH | 更新标签 `{ label?, color? }` |

---

## 3. UI 组件设计

### 3.1 组件层次结构

```
SentenceMode.tsx
├── SentenceSidebar.tsx
│   ├── ViewModeSelector (扩展 'by-tag' 模式)
│   ├── TagFilterBar (新增：标签筛选条)
│   ├── GroupItem (扩展：支持标签分组)
│   ├── SentenceItem (扩展：显示标签指示器)
│   ├── ContextMenu (扩展：系统标签操作)
│   └── TagPickerModal (新增：标签选择弹窗)
├── SentenceDetailView.tsx
│   └── TagChip (新增：标签展示组件)
└── SettingsModal.tsx
    └── TagsTab (新增：标签管理页)
```

### 3.2 新组件：TagChip

**文件**：`components/sentence-mode/TagChip.tsx`

```typescript
interface TagChipProps {
  tag: TagInfo;
  size?: 'sm' | 'md';
  onRemove?: () => void;     // 可移除时显示X按钮
  onClick?: () => void;      // 可点击时作为筛选器
  isActive?: boolean;        // 激活状态
}
```

用途：
- 句子列表项中显示标签（小尺寸色点）
- 详情视图显示完整标签
- 筛选条中作为筛选器

### 3.3 新组件：TagPickerModal

**文件**：`components/sentence-mode/TagPickerModal.tsx`

```typescript
interface TagPickerModalProps {
  isOpen: boolean;
  sentenceId: string;
  currentTags: string[];
  allTags: TagInfo[];           // 系统标签 + 用户标签
  onToggleTag: (tagId: string) => void;
  onCreateTag: (label: string, color?: string) => void;
  onClose: () => void;
}
```

UI 布局：
- 搜索框
- 系统标签区（不可删除）
- 用户标签区（可删除）
- "创建新标签"输入框

### 3.4 扩展右键菜单 (`SentenceSidebar.tsx`)

当前菜单仅有"删除"，扩展为：

```
┌──────────────────────┐
│ 标签                 │ ← 分组标题
├──────────────────────┤
│ ○ 跳过               │ ← 系统标签（勾选时显示✓）
│ ○ 已掌握             │
│ ○ 困难               │
├──────────────────────┤
│ 管理标签...          │ ← 打开 TagPickerModal
├──────────────────────┤
│ 删除                 │ ← 现有功能（红色）
└──────────────────────┘
```

### 3.5 标签筛选条

**位置**：侧边栏列表上方（flat 模式下显示）

```
┌─────────────────────────────────────┐
│ [跳过 ×] [困难 ×]  [+ 添加筛选]    │
└─────────────────────────────────────┘
```

- 显示当前激活的标签筛选
- 点击标签可移除筛选
- "+ 添加筛选"打开标签选择器

### 3.6 句子列表项标签指示

在 `SentenceItem` 组件中显示标签色点：

```
┌────────────────────────────────────────┐
│ 1. This is a sample sentence...    ○  │
│    🔴🟢🔵 +2                           │ ← 最多显示3个色点
└────────────────────────────────────────┘
```

### 3.7 设置页面：标签管理

**位置**：Settings → Tags 选项卡

功能：
- 用户标签列表（编辑/删除）
- 创建新标签表单
- "默认隐藏跳过的句子"开关

---

## 4. 状态管理

### 4.1 SentenceMode 新增状态

```typescript
// 标签管理状态
const [userTags, setUserTags] = useState<TagInfo[]>([]);
const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);

// 从设置读取
const hideSkippedByDefault = appSettings.hideSkippedByDefault ?? true;

// 加载用户标签
useEffect(() => {
  fetchUserTags().then(setUserTags);
}, []);
```

### 4.2 SentenceSidebar 新增 Props

```typescript
interface SentenceSidebarProps {
  // ... 现有 props ...
  onUpdateSentenceTags?: (id: string, tags: string[]) => void;  // 新增
  hideSkippedByDefault?: boolean;                                // 新增
  activeTagFilters?: string[];                                   // 新增
  onTagFiltersChange?: (tags: string[]) => void;                 // 新增
  allTags?: TagInfo[];                                           // 新增
}
```

### 4.3 句子过滤逻辑

更新 `displayedSentences` useMemo：

```typescript
const displayedSentences = useMemo(() => {
  let filtered = sentences;

  // 1. 默认隐藏跳过的句子（除非正在查看"跳过"标签）
  if (hideSkippedByDefault &&
      !(contextFilter?.type === 'tag' && contextFilter.id === '_skip')) {
    filtered = filtered.filter(s => !s.tags?.includes('_skip'));
  }

  // 2. 应用激活的标签筛选（AND 逻辑）
  if (activeTagFilters?.length > 0) {
    filtered = filtered.filter(s =>
      activeTagFilters.every(tag => s.tags?.includes(tag))
    );
  }

  // 3. 应用上下文筛选
  if (contextFilter) {
    if (contextFilter.type === 'tag') {
      filtered = filtered.filter(s => s.tags?.includes(contextFilter.id));
    }
    // ... 现有 paragraph/article 逻辑
  }

  return [...filtered].sort((a, b) => b.createdAt - a.createdAt);
}, [sentences, contextFilter, hideSkippedByDefault, activeTagFilters]);
```

### 4.4 标签分组逻辑

更新 `groupList` useMemo 支持 `by-tag` 模式：

```typescript
if (displayMode === 'by-tag') {
  const tagCounts = new Map<string, number>();
  let untaggedCount = 0;

  sentences.forEach(s => {
    if (!s.tags || s.tags.length === 0) {
      untaggedCount++;
    } else {
      s.tags.forEach(tagId => {
        tagCounts.set(tagId, (tagCounts.get(tagId) || 0) + 1);
      });
    }
  });

  // 添加无标签分组
  if (untaggedCount > 0) {
    groups.set('_untagged', { label: '无标签', count: untaggedCount });
  }

  // 添加标签分组
  tagCounts.forEach((count, tagId) => {
    const tagInfo = getTagInfo(tagId);
    groups.set(tagId, { label: tagInfo.label, count, color: tagInfo.color });
  });
}
```

---

## 5. 默认行为

### 隐藏跳过的句子

- 设置项 `hideSkippedByDefault` 默认为 `true`
- 在 flat 模式下自动过滤掉带 `_skip` 标签的句子
- 在 `by-tag` 模式下点击"跳过"分组可查看所有跳过的句子
- 用户可在设置中关闭此行为

---

## 6. 关键文件清单

| 文件路径 | 变更类型 | 变更内容 |
|----------|----------|----------|
| `types.ts` | 修改 | 添加标签类型、扩展 SidebarDisplayMode、SentenceFilterType、AppSettings |
| `utils/sentenceLoader.ts` | 修改 | SentenceSummary 添加 tags 字段 |
| `vite.config.ts` | 修改 | /api/sentences/summary 返回 tags、新增 /api/tags 端点 |
| `server.js` | 修改 | 同步 vite.config.ts 的 API 变更 |
| `components/sentence-mode/SentenceSidebar.tsx` | 修改 | ContextFilter、右键菜单、by-tag 模式、标签筛选条 |
| `components/sentence-mode/TagChip.tsx` | 新增 | 标签展示组件 |
| `components/sentence-mode/TagPickerModal.tsx` | 新增 | 标签选择弹窗 |
| `views/SentenceMode.tsx` | 修改 | 标签状态管理、传递 props |
| `components/SettingsModal.tsx` | 修改 | 添加 Tags 选项卡 |
| `components/settings/TagsTab.tsx` | 新增 | 标签管理设置页 |
| `public/data/tags.json` | 新增 | 用户标签存储 |

---

## 7. 实现顺序

### Phase 1: 数据层（基础）
1. 更新 `types.ts` 添加标签类型
2. 更新 `SentenceSummary` 接口
3. 更新 `/api/sentences/summary` 暴露 tags
4. 实现 `/api/tags` 端点

### Phase 2: 核心 UI 组件
1. 创建 `TagChip.tsx`
2. 创建 `TagPickerModal.tsx`
3. 扩展右键菜单添加系统标签操作

### Phase 3: 过滤集成
1. 添加 `by-tag` 显示模式
2. 实现标签分组逻辑
3. 实现标签筛选条
4. 更新 ContextFilter 支持 tag 类型

### Phase 4: 设置与默认行为
1. 添加 Tags 设置页
2. 实现 `hideSkippedByDefault` 设置
3. 实现默认跳过过滤

### Phase 5: 完善
1. 句子列表项标签指示器
2. 详情视图标签展示
3. 测试端到端流程

---

## 8. 验证方法

1. **右键菜单测试**：右键句子 → 点击"跳过" → 句子从列表消失（默认隐藏）
2. **标签分组测试**：切换到 by-tag 模式 → 看到"跳过"分组 → 点击进入查看所有跳过的句子
3. **自定义标签测试**：右键 → 管理标签 → 创建新标签 → 应用到句子 → 标签筛选条中出现
4. **设置测试**：Settings → Tags → 关闭"默认隐藏跳过" → 跳过的句子重新出现
5. **API 测试**：`curl localhost:3000/api/tags` 返回用户标签列表
