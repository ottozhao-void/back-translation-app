# Plan: AI Feedback Persistence

用户每次点击"AI 反馈"后，生成的 feedback（score + feedback + suggestions）持久化到 `UserTranslation` 上。再次点击时直接展示缓存数据，无需重复调用 LLM。当译文内容变更（重新提交）后，旧 feedback 自动清除。

## Steps

1. **扩展数据模型** — 在 [types.ts](types.ts) 的 `UserTranslation` 接口中添加可选字段 `aiFeedback`：
   ```typescript
   aiFeedback?: {
     score: number;
     feedback: string;
     suggestions: string[];
     generatedAt: number; // 生成时间戳
   };
   ```
   放在 `UserTranslation` 而非 `TranslationRecord` 上，因为 feedback 始终对应当前译文，不需要跟随历史记录。

2. **译文变更时自动清除缓存** — 在 [SentenceMode.tsx](views/SentenceMode.tsx) 的 `handleSubmit` 函数（[约 L371](views/SentenceMode.tsx#L371)）中，当设置 `userTranslationZh` / `userTranslationEn` 时，确保新的 `UserTranslation` 对象不携带旧的 `aiFeedback`。当前逻辑是直接替换整个 `translation` 对象（来自 `onSubmit` 参数），新对象本身没有 `aiFeedback` 字段，所以**默认行为已经满足**——新提交会自然覆盖旧的含 feedback 的对象。只需确认 auto-save draft 路径同样如此（draft 保存时也是生成新 `UserTranslation` 对象，同理无需额外处理）。

3. **Desktop: 修改 handleGetFeedback** — 在 [SentencePracticeArea.tsx](components/sentence-mode/SentencePracticeArea.tsx) 的 `handleGetFeedback`（[L160](components/sentence-mode/SentencePracticeArea.tsx#L160)）中：
   - **读取缓存**：函数开始时，检查当前 `sentence` 的 `userTranslation`（根据 `practiceMode`）上是否存在 `aiFeedback` 字段。如果存在，直接 `setFeedbackData(aiFeedback)` + `setIsFeedbackOpen(true)`，跳过 LLM 调用。
   - **写入缓存**：LLM 调用成功后，通过 `onSubmit` 的同级回调（需新增 `onSaveFeedback` prop）或直接调用 `patchSentence` 持久化 `aiFeedback` 到当前 sentence。

   具体方案：新增 prop `onSaveFeedback: (sentenceId: string, feedback: FeedbackData) => void`，由父组件 `SentenceMode` 处理持久化。这保持了组件的单一职责——practice area 不直接调用 API。

4. **Mobile: 同步修改 handleGetFeedback** — 在 [MobilePractice.tsx](views/mobile/MobilePractice.tsx) 的 `handleGetFeedback`（[L150](views/mobile/MobilePractice.tsx#L150)）中，应用与步骤 3 完全相同的逻辑：
   - 检查 `aiFeedback` 缓存
   - 命中缓存则直接展示
   - 未命中则调 LLM，成功后通过 `onSaveFeedback` 持久化

5. **父组件 SentenceMode: 实现 onSaveFeedback** — 在 [SentenceMode.tsx](views/SentenceMode.tsx) 中：
   - 添加 `handleSaveFeedback(sentenceId: string, feedback: FeedbackData)` 函数
   - 逻辑：更新 `sentences` state 中对应 sentence 的 `userTranslationZh.aiFeedback` 或 `userTranslationEn.aiFeedback`（根据 `practiceMode`）
   - 调用 `saveSentences(updated)` 持久化到文件
   - 将 `handleSaveFeedback` 作为 prop 传入 `SentencePracticeArea` 和 mobile 练习组件

6. **FeedbackSheet: 添加"重新生成"按钮** — 当展示的是缓存数据时，在 [FeedbackSheet.tsx](components/common/FeedbackSheet.tsx) 的 footer 区域（[约 L160](components/common/FeedbackSheet.tsx#L160)）添加一个"Regenerate"按钮，允许用户手动触发重新生成。需要：
   - 新增 prop `isCached?: boolean` 标识当前展示的是缓存数据
   - 新增 prop `onRegenerate?: () => void` 回调，调用时强制忽略缓存再次调用 LLM
   - Desktop/Mobile 的 `handleGetFeedback` 接受一个 `forceRefresh` 参数来支持这个操作

## Verification
- 提交翻译 → 点击 AI 反馈 → 看到 LLM 生成结果 → 关闭 → 再次点击 → 立即展示相同内容（无 loading）
- 修改译文重新提交 → 点击 AI 反馈 → 应重新调用 LLM（旧缓存已清除）
- 点击 "Regenerate" → 强制重新请求 LLM 并更新缓存
- 检查 `public/data/sentences.json` 文件，确认 `aiFeedback` 字段被正确写入和更新
