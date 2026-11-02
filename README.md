# IELTS Practice

基于 Vue 3、TypeScript 和 Vite 的雅思阅读与词汇练习应用。阅读题库作为首页，阅读与词汇学习在同一应用中切换，默认采用 Apple 风格的浅色界面。

## 功能

- 阅读题库：238 篇既有文章，支持搜索、Part 筛选、来源筛选和分页。
- 题库管理：按 ReadingExam v1 JSON 格式创建、导入、编辑、复制、导出和删除自建题目。内置题目可复制为自建副本。
- 阅读答题：文章与题目分栏，支持填空、判断、选择和匹配；多项选择限制选择数量，答案和用时自动保存。
- 自动判分：核对大小写、全角字符和空格；处理可接受答案、可选词和多选无序部分得分；不提供未经验证的 IELTS 分数换算。
- 练习记录：保存答案、文章快照、得分、用时和来源；支持搜索、只读回看、删除和 JSON 导出。
- 阅读生词：选中文章或题目中的英文单词或短语，查询本地释义，修改语境含义后收藏；保留上下文与文章来源，在原文标记已收藏词。
- 单词练习：阅读生词、IELTS 核心词汇、月份、星期和季节词库；支持拼写、释义记忆、到期复习、错词巩固、统计与学习设置。

## 本地运行

使用满足 Vite 8 要求的 Node.js 版本与 npm。

```sh
npm ci
npm run dev
```

题库 JSON 已包含在 `public/reading/`，如修改原始数据，可执行 `npm run prepare:reading` 重新生成。

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | Vite 开发服务器 |
| `npm run prepare:reading` | 将既有题目和词典资源转换为纯 JSON |
| `npm run typecheck` | Vue 与服务端类型检查 |
| `npm test` | 独立判分逻辑测试，测试命令使用 Node.js 的 TypeScript 类型擦除功能 |
| `npm run test:browser` | 临时 Chrome 中的全量适配与交互测试；非 macOS 环境可设置 `CHROME_BIN` |
| `npm run build` | 数据准备、类型检查与生产构建 |
| `npm run preview` | 预览构建结果 |
| `npm start` | 使用 Node.js 提供构建后的静态文件，默认端口 3000 |

部署时以 `dist/` 为站点根目录，当前资源使用根路径。

## 技术与结构

应用使用 Vue 3 Composition API、TypeScript、Vite 和 CSS。阅读与单词练习使用 Vue 组件直接整合，不再通过 iframe 嵌套。新版阅读不加载旧阅读模块的 JavaScript 业务代码。

```text
src/main.ts                      应用入口
src/reading/ReadingApp.vue        页面导航与阅读资源加载
src/reading/QuestionBank.vue      题库检索、导入、JSON 编辑与导出
src/reading/ReadingPractice.vue   阅读展示、答题、选词和结果展示
src/reading/ReadingRecords.vue    练习记录管理
src/reading/ReadingWordBank.vue   阅读生词管理
src/reading/WordDialog.vue        查词和收藏窗口
src/reading/model.ts             数据模型
src/reading/adapter.ts           既有数据适配与自建题库校验
src/reading/grading.ts           独立判分逻辑
src/reading/html.ts              展示 HTML 过滤
src/reading/repository.ts        按需加载题目和词典
src/reading/storage.ts           草稿、记录、自建题目和生词存储
src/reading/reading.css          新阅读界面样式
src/App.vue                     单词练习导航、统计与设置
src/Study.vue                   单词练习
public/reading/                 纯 JSON 阅读资源和词典
scripts/prepare-reading-data.mjs 数据转换脚本
server/index.ts                 静态文件服务
```

## 数据保存与兼容性

新版阅读数据存储在浏览器 `localStorage`：

| 存储键 | 内容 |
| --- | --- |
| `ielts-practice-reading-bank-v1` | 自建题库 |
| `ielts-practice-reading-draft-v1:*` | 每篇文章的答案、会话编号与用时 |
| `ielts-practice-reading-records-v1` | 已提交记录与题目快照 |
| `ielts-practice-reading-words-v1` | 阅读生词、释义、语境与来源 |
| `ai-vocabulary-*` | 沿用的单词学习记录、设置和练习草稿 |

存储失败会提示用户；不能保存的提交不会显示为保存成功。结果快照保留提交时的题目，自建题目后续修改或删除不会改写已保存记录。多次保存同一会话不会重复创建记录。

旧版 `public/ielts/` 的代码和资源保留为历史文件和数据转换输入；其首页入口跳转新版首页。旧版 IndexedDB、备份文件和历史阅读记录不会被覆盖，也没有自动迁移到新版。请保留原备份，不能把新版导出与旧版完整备份视为相同格式。

## 内容来源与开发范围

详见 [资源来源](docs/CONTENT_SOURCES.md) 与 [实现及参与说明](docs/IMPLEMENTATION.md)。内置文章、题目和词典是复用的数据，不应描述为本次原创内容。每篇内置题目保存来源项目链接及原始资源引用；自建题目要求填写来源。
