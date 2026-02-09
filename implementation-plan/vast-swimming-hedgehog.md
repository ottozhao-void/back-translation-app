# 修复：移动端历史记录不显示刚完成练习的句子

## Context

**问题描述**：在移动端完成练习后（点击 Check），刚练习的句子在历史界面中不可见。但在 PC 端一切正常。

**根本原因**：移动端采用了**懒加载策略**来优化性能：

1. 首次打开 History Tab 时，`fullSentences` 为空，触发 `fetchSentences()` 从服务器加载完整数据
2. 练习完成后，`handleSentenceUpdate` 会更新 `fullSentences`（第 139-143 行）
3. **问题**：如果用户在打开 History Tab 之前就完成了练习，`fullSentences.length === 0`，所以更新逻辑不会执行
4. 之后用户打开 History Tab，加载的是服务器上的旧数据（虽然服务器数据是新的，但这里存在**竞态条件**或**缓存问题**）

实际上更准确的问题是：`fullSentences` 在 History Tab 首次访问时才加载，但此时加载的数据可能已经过时（取决于服务器响应时机）。而且关键问题是：**更新后的句子没有被正确同步到 `fullSentences`**。

```typescript
// MobileApp.tsx L139-143 - 当前逻辑
if (fullSentences.length > 0) {
  setFullSentences(prev => prev.map(s =>
    s.id === updatedSentence.id ? updatedSentence : s
  ));
}
```

这个条件 `fullSentences.length > 0` 意味着如果用户还没访问过 History Tab，更新的句子不会被记录。后续加载时，需要依赖服务器数据。

## 解决方案

**方案 A（推荐）：强制刷新策略**

当用户切换到 History Tab 时，如果有新的练习记录，强制重新加载数据。

**修改文件**：`views/mobile/MobileApp.tsx`

**具体改动**：

1. 添加一个 `needsHistoryRefresh` 标志位，当 `handleSentenceUpdate` 被调用时设为 `true`
2. 修改 History Tab 的加载逻辑：当 `needsHistoryRefresh` 为 `true` 时，即使 `fullSentences` 已有数据也重新加载
3. 加载完成后重置标志位

```typescript
// 新增状态
const [needsHistoryRefresh, setNeedsHistoryRefresh] = useState(false);

// 修改 handleSentenceUpdate
const handleSentenceUpdate = (updatedSentence: SentencePair) => {
  // ... existing code ...

  // 标记需要刷新历史
  setNeedsHistoryRefresh(true);

  // 如果已加载则立即更新
  if (fullSentences.length > 0) {
    setFullSentences(prev => prev.map(s =>
      s.id === updatedSentence.id ? updatedSentence : s
    ));
  }
};

// 修改懒加载 useEffect
useEffect(() => {
  const shouldLoad = activeTab === 'history' &&
    (fullSentences.length === 0 || needsHistoryRefresh) &&
    !isLoadingFullSentences;

  if (shouldLoad) {
    const loadFullSentences = async () => {
      setIsLoadingFullSentences(true);
      const sentences = await fetchSentences();
      setFullSentences(sentences);
      setIsLoadingFullSentences(false);
      setNeedsHistoryRefresh(false); // 重置标志
    };
    loadFullSentences();
  }
}, [activeTab, fullSentences.length, isLoadingFullSentences, needsHistoryRefresh]);
```

## 验证步骤

1. 启动开发服务器：`npm run dev`
2. 在移动端视图（Chrome DevTools 设备模拟）中：
   - 打开应用，选择一个句子进行练习
   - 输入翻译并点击 Check
   - 切换到 History Tab
   - **预期**：刚练习的句子应该出现在历史记录中
3. 测试边缘情况：
   - 在未访问 History Tab 的情况下连续练习多个句子
   - 然后切换到 History Tab，确认所有句子都可见
