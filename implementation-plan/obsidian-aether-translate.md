# Obsidian Custom Component for Aether Translate

## Context

用户希望将 Aether Translate 作为后端服务，在 Obsidian 中创建一个 Custom Component 作为前端，从而在 Obsidian 中进行英语学习。

**为什么这个方案可行：**
- Aether Translate 已有完整的 REST API（句子 CRUD、练习记录保存）
- Obsidian Components 支持 `Obsidian.requestUrl()` 进行 HTTP 请求
- 组件支持完整的 React hooks 和持久化存储

---

## 实施计划

### Phase 1: 后端 CORS 配置

需要为 Aether Translate 服务器添加 CORS 支持，允许来自 Obsidian 的跨域请求。

**修改文件：**

1. **[server.js](server.js)** - 生产环境 Express 服务器
   ```javascript
   // 在 express 初始化后添加
   app.use((req, res, next) => {
     res.header('Access-Control-Allow-Origin', '*');
     res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
     res.header('Access-Control-Allow-Headers', 'Content-Type');
     if (req.method === 'OPTIONS') return res.sendStatus(200);
     next();
   });
   ```

2. **[vite.config.ts](vite.config.ts)** - 开发服务器中间件
   - 在 `setupMiddleware` 函数开头添加相同的 CORS headers

### Phase 2: Obsidian Custom Component 开发

在 Obsidian 中创建名为 `aether-translate` 的 Custom Component。

**组件结构：**
```
App()
├── Header (连接状态指示器、设置、刷新按钮)
├── MainContent
│   ├── ListView (句子列表、搜索、筛选)
│   ├── PracticeView (练习界面)
│   └── SettingsView (配置面板)
└── StatusBar (统计信息)
```

**核心功能：**

| 功能 | 实现方式 |
|------|----------|
| 获取句子列表 | `GET /api/sentences/summary` |
| 获取句子详情 | `GET /api/sentences/:id` |
| 保存练习结果 | `PATCH /api/sentences/:id` |
| 数据持久化 | `useDataStorage()` 存储设置 |
| HTTP 请求 | `Obsidian.requestUrl()` |

**UI 设计 - 列表视图：**
```
┌─────────────────────────────────┐
│ ● Aether Translate    ⚙️ 🔄    │
├─────────────────────────────────┤
│ 🔍 Search...                    │
├─────────────────────────────────┤
│ [EN→ZH] [ZH→EN]                 │
├─────────────────────────────────┤
│ │ 1. The quick brown fox...  ○ │
│ │ 2. She sells seashells... ● │
│ │ 3. Hello world...         ◐ │
├─────────────────────────────────┤
│ 42 sentences | 15 practiced     │
└─────────────────────────────────┘
```

**UI 设计 - 练习视图：**
```
┌─────────────────────────────────┐
│ ← Back              [Submit]    │
├─────────────────────────────────┤
│ ORIGINAL                        │
│ The quick brown fox jumps...    │
├─────────────────────────────────┤
│ YOUR TRANSLATION                │
│ [textarea for user input]       │
├─────────────────────────────────┤
│ DIFF (提交后显示)               │
│ [-敏捷-]{+快速+}的棕色狐狸...   │
└─────────────────────────────────┘
```

### Phase 3: 分步实施顺序

1. **基础结构**
   - 创建 App 组件框架和状态管理
   - 实现 CSS 样式（使用 Obsidian CSS 变量）
   - 创建 Settings 面板（服务器 URL 配置）

2. **API 集成**
   - 创建 API 请求封装函数
   - 实现连接检测和错误处理
   - 获取并显示句子列表

3. **列表视图**
   - 句子列表组件（带状态指示器）
   - 搜索和筛选功能
   - 句子选择和导航

4. **练习视图**
   - 原文显示面板
   - 用户输入区域
   - 提交和保存逻辑

5. **Diff 比较**
   - 实现字符级 diff 算法（LCS）
   - 渲染高亮差异

6. **优化完善**
   - 键盘快捷键支持
   - 离线状态处理
   - 练习统计显示

---

## 关键技术点

### API 请求封装
```javascript
async function apiRequest(endpoint, options = {}) {
  const url = `${settings.serverUrl}${endpoint}`;
  try {
    const response = await Obsidian.requestUrl({
      url,
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    return { success: true, data: JSON.parse(response.text) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### CSS 样式策略
- 使用 Obsidian CSS 变量：`var(--background-primary)`, `var(--text-normal)` 等
- 所有类名必须带组件前缀：`aether--ClassName`
- 支持深色/浅色主题自适应

### 状态管理
- 使用 `useState` 管理 UI 状态（视图、选中句子、用户输入）
- 使用 `useDataStorage()` 持久化设置（服务器 URL、练习模式）
- 使用 `useInterval()` 定期刷新数据

---

## 验证步骤

1. **CORS 配置验证**
   - 启动 Aether Translate 开发服务器 (`npm run dev`)
   - 在 Obsidian 中创建测试组件，调用 API
   - 确认无跨域错误

2. **组件功能验证**
   - 在 Obsidian 笔记中嵌入组件
   - 测试句子列表加载
   - 完成一次练习并验证数据保存到后端
   - 检查 Diff 比较显示正确

3. **离线/错误处理验证**
   - 关闭后端服务器，确认组件显示友好错误信息
   - 重启服务器后点击重试，确认恢复正常

---

## 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| [server.js](server.js) | 修改 | 添加 CORS 中间件 |
| [vite.config.ts](vite.config.ts) | 修改 | 添加 CORS headers |
| Obsidian Components | 新建 | 创建 `aether-translate` 组件（View Source + Settings Source + CSS） |
