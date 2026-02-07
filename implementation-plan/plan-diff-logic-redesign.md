

# Feature Overview

现在的 diff 反馈模式使用体验并不是很流畅，观感有点杂乱。需要进行重新设计：

1. 去掉用户译文中的 diff 类型，但依旧保留用户译文的两种反馈模式，即 diff 和 llm ，只不过在 diff 模式下，点击 check 的响应逻辑发生改变。并且不再上传并保存该模式下的用户译文。
2. 当用户在 diff 反馈模式下，点击 check 时，会弹出一个左右布局的模态框 SentenceCompareModal，左边部分是上下布局。上面原文，下面是参考译文，该部分的设计需要考虑具有多个参考译文的情况，见第4点，右边是用户译文。这里的显示级别为句子级别，不再是段落级别，用户需要逐句对比其译文与参考译文的区别。
3. SentenceCompareModal 的上部是 SentenceNavigation，用户可通过点击来切换当前句子。
4. 在 SentenceCompareModal 的左下角提供具有 UploadReferenceTranslation 功能的按钮，用户可以上传参考译文。