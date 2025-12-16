# 功能概览
我发现仅仅基于原译文和用户译文找不同的方式来学习反馈有点反直觉，并且一些地方可能会遭到忽视。所以我打算添加基于LLM的反馈模式，原文字不同的反馈模式依旧保留。

我打算将基于LLM的反馈模式设计为“Prompt为核心，用户自由选择模型"。预置一个 Prompt 模版，用户触发某些操作后会将填充后的 Prompt 拷贝到粘贴板上，供随后对特定模型的提问。

# UI/UX 设计
系统应该在 "Your Translation"  卡片的左下角提供一个胶囊样式的 Mode Toggles, 当未激活时，呈现透明背景，内部文字是当前默认模式，即 Diff 模式，文字采用与整体背景色高对比度的颜色。当激活时，模式切换到 LLM，背景色与文字颜色应该与整体背景呈现高对比度。

在模式选定后，如果是以 Diff 模式进入的反馈面板，保持原有逻辑不变。

当以 LLM 模式进入的反馈面板，反馈面板应该包括一个得分输入框，限定数字范围为1-100，且在该分数输入框的右侧是一个包含"prompt"字样的按钮，可以通过点击来将提示词复制到粘贴板上。分数输入框的下方是 "Submit" 按钮，点击该按钮可以将得分和时间以某种格式记录到服务器对应的文档中，具体格式可以见数据存储格式部分。


# Prompt 模版

```markdown

# Original Text

{{original_text}}

# Original Translation

{{original_translation}}

Please evalutate my translation below and provide detailed feedback and a score on a scale of 1 to 100

# My Translation

{{user_translation}}


```

{{}}代表占位符，即待填充内容

# 数据存储格式

修改当前的用户上传和数据存储逻辑，描述如下：

- 当用户上传一篇文章时，已经按照现有的逻辑进行格式校验，不符合要求的直接拒绝。
- 对于符合格式要求的文章，进行文件格式的转换，从 markdown 文件转化为 JSON 文件，转换的逻辑如下：
    1. 方便读取中英原译文
    2. 对于用户输入的中英译文，具有的格式大致如下, 根据需要可以扩充：
    ```json
        {
           "type": "diff" | "llm",
           "user": "用户输入的译文",
           "timestamp": "提交的时间",
           "score": "如果是diff模式的话，为空，如果是llm的话，为提交的分数。"
        }
    ```
    即最后保存在 ./articles 目录下的应该是格式转换后的 JSON 文件。用户之后每次登入该系统后，显示的译文都是之前最新的一次



