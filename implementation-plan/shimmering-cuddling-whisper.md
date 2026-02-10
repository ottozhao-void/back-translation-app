# Plan: AI服务设置 Tab 布局重构

## Context

当前的 AI Models 设置模块使用基于类别的分层结构：用户先选择类别（分割、翻译、学习等），然后在网格中点击任务卡片，最后在模态框中配置模型和参数。这需要多次点击才能完成配置。

用户希望简化为扁平化的 Tab 布局：第一个 Tab 包含全局设置（提供商、默认模型、默认参数），后续每个 AI 任务各占一个 Tab，配置直接在 Tab 中展示，无需打开模态框。

---

## 推荐方案

### 架构设计

```
AIModelsTab (主容器)
├── Tab 导航条 (10个 Tab)
│   ├── Tab 0: 全局设置 (General)
│   ├── Tab 1: Sentence Segmentation (segment)
│   ├── Tab 2: Semantic Alignment (segment-align)
│   ├── Tab 3: Translation (translate)
│   ├── Tab 4: Translation Scoring (score)
│   ├── Tab 5: Personalized Greeting (greeting)
│   ├── Tab 6: Vocabulary Enrichment (enrich-vocab)
│   ├── Tab 7: Pattern Suggestion (suggest-pattern)
│   ├── Tab 8: Sentence Analysis (analyze-sentence)
│   └── Tab 9: Custom Task (custom)
│
└── Tab 内容区
    ├── GlobalSettingsTab (提供商列表 + 默认模型 + 默认参数)
    └── TaskConfigTab (任务特定的模型选择 + 参数编辑器)
```

### 组件变更

#### 1. 创建新组件

| 文件 | 描述 |
|------|------|
| `components/settings/llm/GlobalSettingsTab.tsx` | 全局设置 Tab：提供商管理、默认模型、默认参数 |
| `components/settings/llm/TaskConfigTab.tsx` | 任务配置 Tab：单个任务的模型和参数配置 |

#### 2. 修改组件

| 文件 | 变更 |
|------|------|
| `components/settings/AIModelsTab.tsx` | 重构为 Tab 容器，管理 activeTab 状态，渲染对应的 Tab 内容 |
| `components/settings/llm/TaskConfigModal.tsx` | 可保留（作为备用）或废弃 |
| `components/settings/llm/TaskConfigurationView.tsx` | 废弃，功能由新的 Tab 结构替代 |
| `components/settings/llm/TaskCategoryTabs.tsx` | 废弃 |
| `components/settings/llm/TaskGrid.tsx` | 废弃 |
| `components/settings/llm/TaskCard.tsx` | 废弃 |

#### 3. 保持不变

| 文件 | 说明 |
|------|------|
| `components/settings/llm/taskMetadata.ts` | 任务元数据，Tab 标签和顺序从此获取 |
| `components/settings/llm/defaultTaskParams.ts` | 默认参数，TaskConfigTab 需要使用 |
| `components/settings/llm/ParameterEditor.tsx` | 参数编辑器，在两个 Tab 中复用 |
| `components/settings/ModelSelector.tsx` | 模型选择器，在两个 Tab 中复用 |
| `components/settings/ProviderEditModal.tsx` | 提供商编辑模态框，继续使用 |

---

## 实施步骤

### Step 1: 创建 GlobalSettingsTab 组件

```tsx
// components/settings/llm/GlobalSettingsTab.tsx
interface GlobalSettingsTabProps {
  settings: LLMSettings;
  allModels: Array<{...}>;
  onProviderSaved: (provider) => void;
  onProviderDeleted: (id) => void;
  onProviderToggled: (id) => void;
  onDefaultModelChange: (providerId, modelId) => void;
  onDefaultParamsChange: (params) => void;
  onAddProvider: () => void;
  onEditProvider: (provider) => void;
}
```

功能：
- 提供商列表（启用/禁用、编辑、删除）
- 默认模型选择器
- 默认参数编辑器

### Step 2: 创建 TaskConfigTab 组件

```tsx
// components/settings/llm/TaskConfigTab.tsx
interface TaskConfigTabProps {
  task: TaskDefinition;
  settings: LLMSettings;
  allModels: Array<{...}>;
  onSave: (taskType, config) => void;
  onClear: (taskType) => void;
}
```

功能：
- 任务标题和描述
- 模型选择器（下拉选择）
- 参数编辑器（复用 ParameterEditor）
- 清除配置按钮
- 推荐参数显示

### Step 3: 重构 AIModelsTab 主组件

```tsx
// components/settings/AIModelsTab.tsx

// 状态
const [activeTab, setActiveTab] = useState<number>(0);

// Tab 定义
const tabs = [
  { id: 'global', label: '全局设置', icon: <SettingsIcon /> },
  ...getAllTasks().map(task => ({ id: task.id, label: task.label }))
];

// Tab 导航渲染
// Tab 内容渲染（条件渲染对应组件）
```

### Step 4: 更新 taskMetadata.ts

添加 Tab 显示顺序和可选图标：

```typescript
// 在 TaskDefinition 中可选添加 icon 字段
// 确保 getAllTasks() 返回的顺序符合 Tab 显示顺序
```

### Step 5: 样式设计

Tab 导航样式：
- 横向滚动容器（Tab 较多时）
- 激活 Tab 高亮显示
- 图标 + 标签组合
- 已配置任务的 Tab 可添加小徽章

---

## 关键文件清单

### 新建文件

1. `components/settings/llm/GlobalSettingsTab.tsx`
2. `components/settings/llm/TaskConfigTab.tsx`

### 修改文件

1. `components/settings/AIModelsTab.tsx` - 重构为 Tab 容器

### 可删除文件（确认后）

1. `components/settings/llm/TaskConfigurationView.tsx`
2. `components/settings/llm/TaskCategoryTabs.tsx`
3. `components/settings/llm/TaskGrid.tsx`
4. `components/settings/llm/TaskCard.tsx`
5. `components/settings/llm/TaskConfigModal.tsx`（如果不再使用模态框）

---

## 验证步骤

1. **启动开发服务器**: `npm run dev`
2. **导航到设置**: 打开应用 → Settings → AI Models
3. **测试 Tab 切换**:
   - 切换到全局设置 Tab，验证提供商、默认模型、默认参数显示正常
   - 切换到各任务 Tab，验证模型选择器和参数编辑器工作正常
4. **测试配置保存**:
   - 修改全局参数，保存后刷新页面验证持久化
   - 修改任务特定模型和参数，保存后验证
5. **测试清除配置**:
   - 清除任务配置后，验证回退到使用全局默认
6. **测试提供商管理**:
   - 添加/编辑/删除提供商，验证所有 Tab 的模型选择器更新

---

## 复用现有资源

- **taskMetadata.ts**: `getAllTasks()` 提供任务列表和顺序
- **defaultTaskParams.ts**: `getRecommendedParamsForTask()` 提供推荐参数
- **ParameterEditor.tsx**: 直接复用
- **ModelSelector.tsx**: 直接复用
- **ProviderEditModal.tsx**: 继续用于提供商编辑
