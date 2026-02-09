# 搜索功能实现计划

## Context

用户希望在 PC 端和移动端主页添加搜索功能，支持按文本内容和标签搜索句子。这将提升用户在大量句子中快速定位目标内容的效率。

**需求摘要：**
- PC 端：搜索图标替换侧边栏的历史图标位置，历史图标移至右上角导航栏（与主页图标同一水平线）
- 移动端：搜索图标放置在首页右上角（MobileHeader 的 rightContent）
- UI 形式：点击后弹出 Spotlight 风格的搜索框，实时显示结果
- 搜索范围：句子文本（英文/中文）和标签
- 结果操作：点击跳转到句子详情视图

---

## 实现步骤

### Step 1: 添加 SearchIcon 组件

**文件**: `components/Icons.tsx`

在现有图标后添加 SearchIcon（放大镜图标），使用与其他图标一致的 SVG 样式。

```tsx
export const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);
```

---

### Step 2: 创建搜索 Hook

**新建文件**: `components/search/useSearch.ts`

封装搜索逻辑为可复用的 Hook：
- 接收句子列表和标签列表
- 支持文本搜索（en/zh 字段，不区分大小写）
- 支持标签搜索（以 `#` 开头触发）
- 内置 debounce（150ms）避免频繁计算
- 返回匹配结果（限制 50 条）

```typescript
interface SearchResult {
  sentence: SentencePair;
  matchType: 'text' | 'tag';
  matchField?: 'en' | 'zh';
  matchedTag?: string;
}

export function useSearch(sentences: SentencePair[], allTags?: TagInfo[]): {
  query: string;
  setQuery: (q: string) => void;
  results: SearchResult[];
}
```

---

### Step 3: 创建 SearchModal 组件

**新建文件**: `components/SearchModal.tsx`

Spotlight 风格的搜索弹窗：
- 半透明背景 + 模糊效果
- 居中显示（PC 40-60% 宽度，移动端 90%）
- 自动聚焦输入框
- 键盘导航（↑↓ 选择，Enter 确认，Esc 关闭）
- 实时显示搜索结果（最多 10 条可见，支持滚动）
- 高亮匹配文本

**Props**:
```typescript
interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  sentences: SentencePair[];
  allTags?: TagInfo[];
  onSelectResult: (sentenceId: string) => void;
}
```

---

### Step 4: 更新 PC 端侧边栏

**文件**: `components/sentence-mode/SentenceSidebar.tsx`

**修改内容**:
1. 将 `onOpenHistory` prop 改为 `onOpenSearch`
2. 将历史图标按钮替换为搜索图标按钮
3. 更新按钮的 title 和图标

**修改位置**: 第 359-368 行

```tsx
// 替换前
{onOpenHistory && (
  <button onClick={onOpenHistory} ...>
    <HistoryIcon />
  </button>
)}

// 替换后
{onOpenSearch && (
  <button onClick={onOpenSearch} title="Search" ...>
    <SearchIcon />
  </button>
)}
```

---

### Step 5: 更新 SentenceMode 组件

**文件**: `views/SentenceMode.tsx`

**修改内容**:
1. 添加 `showSearchModal` 状态
2. 添加 `handleOpenSearch` 回调
3. 添加新 prop `onOpenHistory` 传递给父组件（index.tsx）
4. 渲染 `SearchModal` 组件
5. 更新传给 SentenceSidebar 的 props

```tsx
// 新增状态
const [showSearchModal, setShowSearchModal] = useState(false);

// 新增回调
const handleOpenSearch = useCallback(() => {
  setShowSearchModal(true);
}, []);

// 渲染 SearchModal
{showSearchModal && (
  <SearchModal
    isOpen={showSearchModal}
    onClose={() => setShowSearchModal(false)}
    sentences={sentences}
    allTags={[...Object.values(SYSTEM_TAGS), ...userTags]}
    onSelectResult={(id) => {
      setSelectedId(id);
      setViewMode('detail');
      setShowSearchModal(false);
    }}
  />
)}
```

---

### Step 6: 更新 PC 端导航栏

**文件**: `index.tsx`

**修改内容**:
1. 添加 `showHistoryModal` 状态
2. 在右上角导航栏添加历史图标按钮（紧邻 Home 按钮）
3. 从 SentenceMode 接收 `onOpenHistory` 回调
4. 渲染 HistoryModal（从 SentenceMode 移动到这里，或通过 prop 控制）

**修改位置**: 第 327-355 行导航栏区域

```tsx
// 在 Home 按钮后添加 History 按钮
{view === 'HOME' && (
  <button
    onClick={() => setShowHistoryModal(true)}
    className="p-2 rounded-full transition-all duration-300 hover:scale-110"
    style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-high-contrast)' }}
    title="Practice History"
  >
    <HistoryIcon />
  </button>
)}
```

---

### Step 7: 更新移动端

**文件**: `views/mobile/MobileApp.tsx`

**修改内容**:
1. 添加 `showSearchModal` 状态
2. 在 `renderHeader` 的 `home` case 中添加搜索图标到 `rightContent`
3. 渲染 `SearchModal` 组件
4. 使用已有的 `fullSentences` 数据（复用 history tab 的懒加载逻辑）

**修改位置**: 第 186-214 行 renderHeader 函数

```tsx
case 'home':
  return (
    <MobileHeader
      title="Aether Translate"
      rightContent={
        <button
          onClick={() => setShowSearchModal(true)}
          className="p-2 rounded-lg"
          style={{ color: 'var(--text-secondary)' }}
        >
          <SearchIcon />
        </button>
      }
    />
  );
```

---

## 文件修改清单

| 文件 | 操作 |
|------|------|
| `components/Icons.tsx` | 添加 SearchIcon |
| `components/search/useSearch.ts` | 新建 |
| `components/SearchModal.tsx` | 新建 |
| `components/sentence-mode/SentenceSidebar.tsx` | 修改 props，替换图标 |
| `views/SentenceMode.tsx` | 添加搜索模态框状态和渲染 |
| `index.tsx` | 添加历史图标到导航栏 |
| `views/mobile/MobileApp.tsx` | 添加搜索图标和模态框 |

---

## 可复用的现有代码

- **图标样式模式**: 参考 `components/Icons.tsx` 中的 HistoryIcon
- **模态框渲染模式**: 参考 `views/SentenceMode.tsx:504-511` 的 HistoryModal 条件渲染
- **按钮样式模式**: 参考 `SentenceSidebar.tsx:360-367` 的图标按钮样式
- **MobileHeader rightContent**: 参考 `MobileApp.tsx:196-203` 的 practice 模式切换按钮
- **标签数据**: 复用 `SYSTEM_TAGS` 和 `userTags` 状态

---

## 验证方案

### PC 端测试
1. 启动开发服务器: `npm run dev`
2. 确认侧边栏头部显示搜索图标（而非历史图标）
3. 确认右上角导航栏显示历史图标（在 Home 图标旁边）
4. 点击搜索图标，确认弹出 Spotlight 风格搜索框
5. 输入英文/中文文本，确认实时显示匹配结果
6. 输入 `#` 开头的标签名，确认按标签过滤
7. 点击结果或按 Enter，确认跳转到句子详情
8. 按 Esc 或点击背景，确认关闭搜索框
9. 点击右上角历史图标，确认打开历史模态框

### 移动端测试
1. 使用浏览器开发者工具模拟移动设备
2. 确认首页右上角显示搜索图标
3. 点击搜索图标，确认弹出搜索框（适配移动端宽度）
4. 测试搜索和结果跳转功能
5. 确认触摸交互正常工作

---

## 可选增强（后续迭代）

- 添加 `Cmd/Ctrl + K` 全局快捷键打开搜索（PC 端）
- 搜索框显示最近搜索历史
- 热门标签快捷选择
- 搜索结果分组显示（按来源类型）
