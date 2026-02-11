# Fix Anthropic Provider Format Issue

## Context

用户报告：即使在设置中选择了 Anthropic 提供商和 Anthropic 格式，系统仍然发送 OpenAI 格式的请求。

### 环境信息

- **运行方式**: `npm run build && npm run preview`
- **使用的代码**: `server/llm/executor.ts`（preview 服务器）
- **配置文件**: `data/llm-config.json` 中有 `"providerType": "anthropic"`
- **代理服务器**: `https://ottovoid.qzz.io/v1`（支持两种格式）

### 问题现象

服务器日志显示发送的是 OpenAI 格式的请求体（system 消息在 messages 数组中），而不是 Anthropic 格式（system 作为单独的字段）。

### 问题根源（已确认）

**`server/llm/providers.ts` 中的配置文件路径问题**

```typescript
const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'llm-config.json');
```

在 `vite preview` 模式下：
- `process.cwd()` 返回的是 **`dist/`** 目录（Vite preview 的工作目录）
- 代码实际查找的是 `dist/data/llm-config.json`
- 但配置文件实际在项目根目录的 `data/llm-config.json`
- 结果：**配置文件找不到，返回空的默认设置**
- 导致 provider 配置丢失或使用了错误值

**验证**:
```bash
$ ls dist/data/
# 有 sentences.json, vocabulary.json, 但没有 llm-config.json
```

---

## Implementation Plan

### 修改文件

**[server/llm/providers.ts](server/llm/providers.ts)** - 修复配置文件路径

### 修改方案

使用 `import.meta.url` 获取项目根目录，而不是依赖 `process.cwd()`：

```typescript
// 文件顶部添加 import
import { fileURLToPath } from 'url';

// 修改 DATA_DIR 和 CONFIG_FILE 的计算方式（第 12-13 行）
// 修改前：
const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'llm-config.json');

// 修改后：
const __filename = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(__filename, '../..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'llm-config.json');
```

### 为什么这个方案有效

1. `import.meta.url` 是当前模块的文件 URL（如 `file:///.../server/llm/providers.ts`）
2. `fileURLToPath()` 将其转换为文件系统路径
3. 向上两级 (`../..`) 得到项目根目录（从 `server/llm/` → `server/` → 项目根）
4. 这样无论从哪里运行代码（dev 或 preview），都能正确定位到项目根目录下的 `data/` 文件夹

### 路径结构说明

```
项目根/
  ├─ data/              ← 配置文件位置 (llm-config.json)
  ├─ server/
  │   └─ llm/
  │       └─ providers.ts  ← 当前文件 (向上两级: .. => server/, ../.. => 项目根)
  ├─ dist/
  │   └─ data/          ← 只有 sentences.json, vocabulary.json (从 public/ 复制)
  └─ public/
      └─ data/          ← 被 Vite 复制到 dist/data/
```

### 备选方案（不推荐）

也可以在 `vite.config.ts` 的插件中添加 `llm-config.json` 到 `dist/data/`，但：
1. 配置文件包含 API 密钥，不应被复制到 dist/
2. 这会让敏感信息进入构建产物
3. 使用正确的路径是更好的方案

---

## Critical Files

| 文件 | 修改类型 |
|------|----------|
| [server/llm/providers.ts:1](server/llm/providers.ts#L1) | 添加 `import { fileURLToPath } from 'url'` |
| [server/llm/providers.ts:12-13](server/llm/providers.ts#L12-L13) | 修改路径计算方式 |

---

## Verification

### 测试步骤

1. 修改 `server/llm/providers.ts` 中的路径计算方式
2. 重新构建：`npm run build`
3. 启动 preview：`npm run preview`
4. 触发一个 LLM 请求（如句子分割）
5. 验证请求格式：
   - 检查服务器日志或网络请求
   - Anthropic 格式应该包含：
     - API 路径: `/v1/messages`
     - Header: `anthropic-version: 2023-06-01`
     - 请求体包含 `system` 字段（不是在 messages 数组中）

### 预期修复后的结果

- 配置文件从正确的位置（`data/llm-config.json`）被加载
- `provider.providerType` 正确为 `'anthropic'`
- 发送的是 Anthropic 格式请求

### 回归测试

确保以下场景仍然正常工作：
- `npm run dev` 模式下也能正常加载配置
- OpenAI 提供商发送 OpenAI 格式请求
- 配置保存和加载功能正常
