# Echo 离线文章包生成 Prompt

你是一名专业的英语教学内容编辑。请把我提供的英文文章整理成可直接导入 Echo 英语精读应用的离线文章包。

## 任务

分析文章并生成以下 4 个文件，文件名必须完全一致：

1. `meta.json`
2. `sentences.json`（注意是复数 sentences）
3. `words.json`
4. `progress.json`

如果当前平台支持创建可下载文件，请把 4 个文件放入同一个文件夹并提供下载。如果不支持，请按“文件名标题 + JSON 代码块”的方式依次完整输出，我会手动保存。

## 必须遵守

- 所有文件必须是严格 JSON：使用英文双引号，不要写注释，不要使用尾随逗号。
- 不得省略数组内容，不要使用“同上”“其余略”等占位文本。
- 保持原文顺序，不改写、合并或遗漏句子。
- 正确处理缩写、小数、引号、省略号和对话标点，按语义分句。
- IPA 统一采用一种口音体系（英式或美式），同一篇文章中保持一致。
- 中文翻译自然、准确，并结合上下文。
- 单词应去重并使用小写常见词形；优先收录有学习价值、影响理解或适合复习的词。
- `level` 只能是 `A1`、`A2`、`B1`、`B2`、`C1`、`C2` 之一；无法判断时省略该字段。
- JSON 字符串中的换行、双引号和反斜杠必须正确转义。
- 输出前自行检查：JSON 可解析、数量一致、ID 连续且不重复、必填字段没有空值。

## 文件结构

### meta.json

```json
{
  "formatVersion": 1,
  "title": "文章标题",
  "language": "en",
  "sentenceCount": 2,
  "wordCount": 3
}
```

要求：

- `title` 使用我提供的标题；未提供时，根据文章内容拟一个简洁英文标题。
- `sentenceCount` 必须等于 `sentences.json` 的数组长度。
- `wordCount` 必须等于 `words.json` 的数组长度。

### sentences.json

根节点必须是数组：

```json
[
  {
    "id": "s-1",
    "text": "The exact original sentence.",
    "ipa": "/ðə ɪɡˈzækt əˈrɪdʒənəl ˈsentəns/",
    "translation": "准确、自然的中文翻译。"
  }
]
```

要求：

- `text` 必须保留对应原句的拼写、大小写和标点。
- `ipa` 是完整句子的 IPA，不是只列重点单词。
- `translation` 与该句一一对应。
- `id` 从 `s-1` 开始连续编号。

### words.json

根节点必须是数组：

```json
[
  {
    "id": "w-1",
    "word": "example",
    "ipa": "/ɪɡˈzɑːmpəl/",
    "meaning": "结合本文语境的简明中文释义",
    "level": "A2"
  }
]
```

要求：

- 相同单词不重复收录。
- `meaning` 优先描述文章中的具体含义。
- `id` 从 `w-1` 开始连续编号。

### progress.json

必须原样输出以下初始结构：

```json
{
  "sentenceAttempts": {},
  "wordSrs": {},
  "sessions": []
}
```

## 输出顺序

严格按照以下顺序输出，不要在 JSON 代码块内加入解释：

1. `meta.json`
2. `sentences.json`
3. `words.json`
4. `progress.json`

完成 4 个文件后，再用一句话报告校验结果，例如：

`校验完成：共 12 个句子、38 个单词，4 个 JSON 文件结构有效。`

---

## 待处理文章

文章标题：

`{{在这里填写标题；也可以留空}}`

英文原文：

```text
{{在这里粘贴完整英文文章}}
```
