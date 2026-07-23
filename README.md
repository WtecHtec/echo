# Echo

Echo 是一款本地优先的英语精听、精读与默写桌面应用。导入英文文章后，
应用通过用户配置的大模型生成分句、IPA、中文翻译和语境词义；除首次解析外，
精读、系统朗读、整句默写和单词复习均可离线使用。

## 功能

- 粘贴英文文本或导入 `.txt` 文件
- 使用任意 Web 大模型生成离线文章包并导入整个文件夹
- OpenAI 兼容接口与 Anthropic Messages API
- 文章/单词朗读、全局语速和阅读字号
- 整句默写、词级差异定位和训练总结
- 基于 SM-2 的文章词库与全局生词本复习
- 纯 JSON 本地存储、原子写入和文章删除引用清理
- Windows、macOS、Linux Electron 客户端

## 开发

```bash
npm install
npm start
```

质量检查：

```bash
npm run lint
npm test -- --runInBand
npm run build
```

## 数据目录

默认数据保存在系统“文档”目录下的 `EchoData` 文件夹：

```text
EchoData/
├── articles/{文章ID}-{标题slug}/
│   ├── meta.json
│   ├── sentences.json
│   ├── words.json
│   └── progress.json
├── vocabulary/index.json
└── settings.json
```

设置页可直接在系统文件管理器中打开该目录。

## 使用 Web 大模型离线生成文章包

不配置 API 时，也可以在“导入文章”页面复制专用 Prompt，将文章交给任意
Web 大模型处理。把模型生成的以下 4 个文件保存到同一个文件夹，再点击
“导入文章文件夹”：

```text
my-article/
├── meta.json
├── sentences.json
├── words.json
└── progress.json
```

独立 Prompt 位于
[`assets/prompts/echo-web-llm-article-prompt.md`](assets/prompts/echo-web-llm-article-prompt.md)。
Echo 会在导入时校验结构、重新生成内部 ID 和统计信息，并以全新学习进度
保存，原文件夹不会被修改。

## 大模型配置

在设置页填写 API URL、API Key 和模型名。API Key 仅保存在本地
`settings.json`，界面默认隐藏。导入文章时，原文会发送到用户配置的第三方
模型服务；解析完成后的学习数据不会上传到 Echo 自有服务器。
