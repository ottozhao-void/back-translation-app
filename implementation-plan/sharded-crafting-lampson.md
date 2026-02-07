# 移动端 History Tab 实现计划

## Context

用户希望在移动端添加一个 History Tab，以便能够查看练习历史记录。目前：
- **桌面端**：已有 `HistoryModal` 组件，通过侧边栏按钮触发显示
- **移动端**：使用独立的组件树（`MobileApp`），底部有三个 Tab（首页、练习、设置），**尚未实现**练习历史入口

本次改动将在移动端底部导航栏添加第四个 "历史" Tab，复用桌面端的核心逻辑组件。

---

## 实现方案

### 1. 扩展 MobileTab 类型

**文件**: [MobileApp.tsx](views/mobile/MobileApp.tsx#L12)

```typescript
// 修改前
export type MobileTab = 'home' | 'practice' | 'settings';

// 修改后
export type MobileTab = 'home' | 'practice' | 'history' | 'settings';
```

### 2. 修改 BottomTabBar 添加新 Tab

**文件**: [BottomTabBar.tsx](components/mobile/BottomTabBar.tsx#L24-L57)

在 `tabs` 数组中 `practice` 和 `settings` 之间插入新条目：

```typescript
{
  id: 'history',
  label: '历史',
  icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
},
```

### 3. 创建 MobileHistory 组件

**新文件**: `views/mobile/MobileHistory.tsx`

设计决策：**复用内部组件，重新包装布局**
- 直接复用 `HistoryFilter` 和 `HistoryList` 组件
- 使用 `usePracticeHistory` hook 处理数据
- 去除模态框 UI（背景遮罩、关闭按钮）
- 适配移动端全屏 Tab 布局

```typescript
interface MobileHistoryProps {
  sentences: SentencePair[];
  isLoading: boolean;
  onNavigateToSentence: (sentenceId: string) => void;
}
```

### 4. 数据流：懒加载完整句子数据

**问题**：`MobileApp` 目前使用轻量级 `SentenceSummary[]`，而 `usePracticeHistory` 需要完整的 `SentencePair[]`。

**方案**：首次切换到 History Tab 时加载完整数据

在 [MobileApp.tsx](views/mobile/MobileApp.tsx) 中添加：

```typescript
const [fullSentences, setFullSentences] = useState<SentencePair[]>([]);
const [isLoadingFullSentences, setIsLoadingFullSentences] = useState(false);

useEffect(() => {
  if (activeTab === 'history' && fullSentences.length === 0) {
    const loadFullSentences = async () => {
      setIsLoadingFullSentences(true);
      const response = await fetchSentences();
      if (response.success) {
        setFullSentences(response.data);
      }
      setIsLoadingFullSentences(false);
    };
    loadFullSentences();
  }
}, [activeTab, fullSentences.length]);
```

### 5. 导航逻辑：从历史跳转到练习

点击历史记录中的句子 → 加载该句子 → 切换到 Practice Tab

```typescript
const handleNavigateFromHistory = async (sentenceId: string) => {
  const response = await fetchSentenceById(sentenceId);
  if (response.success && response.data) {
    setSelectedSentence(response.data);
    const startIndex = summaries.findIndex(s => s.id === sentenceId);
    const queue = summaries.slice(startIndex).map(s => s.id);
    setPracticeQueue(queue);
    setPracticeIndex(0);
    setActiveTab('practice');
  }
};
```

### 6. 更新 renderHeader() 和 renderContent()

```typescript
// renderHeader()
case 'history':
  return <MobileHeader title="练习历史" />;

// renderContent()
case 'history':
  return (
    <MobileHistory
      sentences={fullSentences}
      isLoading={isLoadingFullSentences}
      onNavigateToSentence={handleNavigateFromHistory}
    />
  );
```

---

## 文件修改清单

| 文件 | 操作 | 描述 |
|------|------|------|
| `views/mobile/MobileApp.tsx` | 修改 | 扩展类型、添加状态、更新渲染逻辑 |
| `components/mobile/BottomTabBar.tsx` | 修改 | 添加 history tab 定义 |
| `views/mobile/MobileHistory.tsx` | **新建** | 移动端历史视图组件 |

### 复用的现有组件（无需修改）

- `components/HistoryModal/HistoryFilter.tsx` - 时间筛选器
- `components/HistoryModal/HistoryList.tsx` - 历史列表
- `hooks/usePracticeHistory.ts` - 数据处理 hook

---

## 验证方案

1. **开发服务器测试**
   ```bash
   npm run dev
   ```
   在浏览器开发者工具中切换到移动端视图

2. **功能验证**
   - 底部导航栏显示 4 个 Tab（首页、练习、历史、设置）
   - 点击历史 Tab 显示练习历史
   - 筛选器（本周/本月/全部）正常工作
   - 点击历史记录项跳转到对应句子的练习界面

3. **边界情况**
   - 无练习历史时显示空状态
   - 数据加载中显示 loading 状态
