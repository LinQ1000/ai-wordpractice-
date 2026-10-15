# AI Vocabulary + IELTS

Vue 3 + TypeScript 单词练习入口，保留 IELTS 原生 JavaScript 应用。

```sh
npm install
npm run dev
npm run typecheck
npm run build
```

- `/`：Vue 单词首页，每批最多 20 个待复习词和新词，释义、例句、浏览器朗读和本地复习记录。
- `/ielts/index.html`：复制自 `/Users/linqian/IELTS-practice` 的完整项目（不含 Git 元数据），原 JavaScript 保留。
- `/original-word-practice.html`：当前项目原来的静态单词练习页备份。

词库使用 `public/ielts/assets/wordlists/ielts_core.json`。原项目许可证位于 `public/ielts/LICENSE`。

新模块的学习记录使用 localStorage 的 `ai-vocabulary-progress`，与 IELTS 旧模块的记录独立。复制文件不会迁移浏览器中旧地址的学习数据。原始 IELTS 文件夹未修改。

## 单词学习功能

- 今日学习：优先到期词，再补充新词，每组 5–100 词。
- 到期复习：仅练习已到复习时间的词。
- 错词巩固：练习不认识或模糊的词，评价为认识后移出。
- 复习间隔：不认识 1 分钟，模糊 1 天；连续认识依次为 1、3、7、14、30 天。
- 首页与统计：显示今日不同词数、自评认识率、学习时长、连续学习天数和已掌握词数（连续认识至少 3 次）。
- 设置：调整每组词数，下一组生效。移动端可通过顶部导航访问各功能。

旧版单词进度可继续使用；旧记录缺少日期，不会补造每日统计。新增评价历史存于 `ai-vocabulary-activities`，每组词数存于 `ai-vocabulary-batch`。数据仅保存在当前浏览器中。
