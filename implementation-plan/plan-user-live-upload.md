

# Feature Overview

拓展文章添加逻辑，现在用户除了可以自己上传文件外，还可以直接在前端创建新的文章，随后交由系统解析并以JSON格式保存在服务器中.


# Workflow

当用户点击 Articles 页面下的 Upload article 时，会弹出一个文件上传模态框，显示两个按钮，一个是Upload，一个是Create。Upload按钮与原文章上传逻辑保持一致。Create按钮点击后会显示一个markdown编辑器，只接受markdown格式的内容编辑。用户在其中输入文章之后，同样需要经过格式校验等相关工作。编辑器眉头是文章文章标题输入处。


# Design Principle

- 整体设计应该保持美观、简约和现代
- 点击 Upload article 时，文章上传模态框的出现应该具有一些动画效果。
- 文件上传模态框一定要做到简约和美观，不需要使用过多的边框，恰到好处即可