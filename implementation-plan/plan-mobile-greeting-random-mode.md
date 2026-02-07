# 实现计划：移动端主页与随机练习模式

## 背景

当前移动端应用直接打开到句子列表页面 (`MobileHome`)。用户希望实现类似桌面端的欢迎体验：

1. 每次打开应用时显示 Greeting 问候页面
2. 用户点击任意位置后，淡出动画
3. 淡入练习模式选择界面，按钮垂直排列
4. 首先实现"随机模式"，随机打乱所有句子进行练习

## 架构设计

### 组件层级

```
MobileApp.tsx (状态控制器)
├── MobileGreetingOverlay (全屏覆盖层, z-50)
│   └── GreetingDisplay (复用桌面端组件)
├── MobileModeSelector (全屏选择器, z-40)
│   └── "随机模式" 按钮
└── 正常标签页内容 (header, main, BottomTabBar)
```

### 状态流转

```
应用打开 → [showGreeting: true, showModeSelector: false]
    ↓ (点击任意位置)
淡出动画 → [showGreeting: false, showModeSelector: true]
    ↓ (选择模式)
淡出动画 → [showModeSelector: false] → 开始练习
```

---

## 需要创建的文件

### 1. `components/mobile/MobileGreetingOverlay.tsx`

**职责**：
- 全屏覆盖层，显示问候内容
- 复用现有的 `GreetingDisplay` 组件
- 点击任意位置触发淡出动画
- 底部显示"点击任意位置继续"提示

**接口定义**：
```typescript
interface MobileGreetingOverlayProps {
  userName?: string;
  greetingPrompt?: string;
  onDismiss: () => void;
}
```

**实现要点**：
- 使用内部 `isAnimatingOut` 状态控制动画
- 动画结束后（300ms）调用 `onDismiss`
- 全屏定位：`fixed inset-0 z-50`

### 2. `components/mobile/MobileModeSelector.tsx`

**职责**：
- 练习模式选择界面
- 垂直居中布局
- "随机模式"按钮（带打乱图标）
- 显示总句子数量

**接口定义**：
```typescript
interface MobileModeSelectorProps {
  onSelectRandomMode: () => void;
  totalSentenceCount: number;
  isLoading: boolean;
}
```

**UI 设计**：
```
┌─────────────────────────────┐
│                             │
│                             │
│      选择练习模式            │
│                             │
│   ┌───────────────────┐     │
│   │  🎲 随机模式       │     │
│   │  共 42 个句子      │     │
│   └───────────────────┘     │
│                             │
│   (未来: 顺序模式)          │
│   (未来: 按来源练习)        │
│                             │
└─────────────────────────────┘
```

---

## 需要修改的文件

### 3. `views/mobile/MobileApp.tsx`

**添加导入**：
```typescript
import { MobileGreetingOverlay } from '../../components/mobile/MobileGreetingOverlay';
import { MobileModeSelector } from '../../components/mobile/MobileModeSelector';
```

**添加状态**（约第 42 行后）：
```typescript
// 控制欢迎页和模式选择器的显示
const [showGreeting, setShowGreeting] = useState(true);
const [showModeSelector, setShowModeSelector] = useState(false);
```

**添加随机模式处理函数**（在 `handleStartPractice` 之后）：
```typescript
// Fisher-Yates 洗牌算法
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 处理随机模式选择
const handleRandomMode = () => {
  if (summaries.length === 0) return;
  const shuffledIds = shuffleArray(summaries.map(s => s.id));
  handleStartPractice(shuffledIds);
  setShowModeSelector(false);
};

// 处理欢迎页消失
const handleGreetingDismiss = () => {
  setShowGreeting(false);
  setShowModeSelector(true);
};
```

**修改渲染逻辑**（约第 197-217 行）：
```typescript
return (
  <div className="flex flex-col h-screen w-screen overflow-hidden" ...>
    {/* 欢迎覆盖层 */}
    {showGreeting && (
      <MobileGreetingOverlay
        userName={appSettings.userName}
        greetingPrompt={appSettings.greetingPrompt}
        onDismiss={handleGreetingDismiss}
      />
    )}

    {/* 模式选择器 */}
    {showModeSelector && (
      <MobileModeSelector
        onSelectRandomMode={handleRandomMode}
        totalSentenceCount={summaries.length}
        isLoading={isLoading}
      />
    )}

    {/* 正常内容 - 仅在覆盖层隐藏后可交互 */}
    {!showGreeting && !showModeSelector && (
      <>
        {renderHeader()}
        <main className="flex-1 overflow-auto pb-20">
          {renderContent()}
        </main>
        <BottomTabBar ... />
      </>
    )}
  </div>
);
```

### 4. `index.html`（添加 CSS 动画）

在现有 `<style>` 部分添加：
```css
/* 移动端欢迎页动画 */
.mobile-fade-out {
  animation: mobileGreetingFadeOut 0.3s ease-out forwards;
}

.mobile-fade-in {
  animation: mobileGreetingFadeIn 0.4s ease-out forwards;
}

@keyframes mobileGreetingFadeOut {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-10px); }
}

@keyframes mobileGreetingFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 尊重用户的动画偏好设置 */
@media (prefers-reduced-motion: reduce) {
  .mobile-fade-out,
  .mobile-fade-in {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

---

## 边界情况处理

| 场景 | 处理方式 |
|------|----------|
| 句子列表为空 | 禁用随机模式按钮，显示提示信息 |
| 数据加载中 | 模式选择器显示加载状态，禁用按钮 |
| 从练习返回 | 不再显示欢迎页（状态保持 `false`） |
| 用户开启减少动画 | 使用即时过渡代替动画 |

---

## 验证测试

1. **视觉检查**：打开移动端，验证 Greeting 正常显示
2. **点击消失**：点击任意位置，验证淡出和淡入动画
3. **随机模式**：点击随机模式按钮，验证句子顺序被打乱
4. **返回导航**：退出练习，验证直接返回主页标签
5. **空状态**：无句子时，验证按钮被禁用
6. **动画偏好**：检查 `prefers-reduced-motion` 设置被尊重

---

## 文件变更汇总

| 操作 | 文件路径 |
|------|----------|
| 创建 | `components/mobile/MobileGreetingOverlay.tsx` |
| 创建 | `components/mobile/MobileModeSelector.tsx` |
| 修改 | `views/mobile/MobileApp.tsx` |
| 修改 | `index.html` |

---

## 后续扩展

当前仅实现"随机模式"，未来可扩展：

1. **顺序模式** - 按句子顺序练习
2. **按来源练习** - 选择特定文章/段落
3. **复习模式** - 只练习已翻译过的句子
4. **薄弱项模式** - 优先练习低分句子
