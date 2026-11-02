# 文章、试题与词典来源

## 阅读资源

目前的 238 篇文章与题目取自项目已有的 `public/ielts/assets/generated/reading-exams/` 数据文件，该部分资源来自：

- 既有资源项目：https://github.com/sallowayma-git/IELTS-practice
- 新版转换结果：`public/reading/catalog.json` 与 `public/reading/exams/*.json`
- 转换程序：`scripts/prepare-reading-data.mjs`

转换程序只执行本地数据文件中的注册语句，以提取文章、题干、选项、参考答案和来源路径，不执行旧界面或判分代码。转换不表示对题目内容重新创作。

每篇 JSON 的 `provenance` 保留资源项目链接及 `sourceRefs` 的原始路径。新版标准题目中的 `source` 供界面与导出文件引用。资源路径不能替代出版社、作者或原始出版物信息，目前并未逐篇核实原始作者、考试年份及官方真题身份。论文中应写“既有阅读资源”，不能统一声称“自行编写文章”或“官方历年真题”。

如后续取得原始文章或试卷，应在对应题目 `source.label`、`source.url` 和 `source.reference` 中补充可核实的作者、出版物、日期及页码。

## 词典与词库

- 核心词汇来自项目已有的 `public/ielts/assets/wordlists/ielts_core.json`。
- 较广的本地释义来自项目已有的 ECDICT 派生词典数据，原始词典项目：https://github.com/skywind3000/ECDICT。
- 新版将二者转换为 `public/reading/dictionary.json`，前端仅按需查询该 JSON，不加载旧词典业务脚本。
- 自动查询可能缺词或与文章语境不符；用户可以手动修改释义。收藏记录保留选词时的语境和来源文章。

## 自建示例

题库管理中的 “A small library” 是为说明新数据格式而编写的简短示例，不标记为真实 IELTS 试题。用户新建或导入其他文章时，需填写对应内容来源。
