# AI Vocabulary + IELTS

一个基于 **Vue 3 + TypeScript + Vite** 的英语学习项目，提供单词拼写、释义记忆、间隔复习，以及 IELTS 阅读、听力、写作和 AI 口语练习入口。

阅读模块整合自开源项目 [IELTS Practice / IELTS Atlas](https://github.com/sallowayma-git/IELTS-practice)，保留其原有 JavaScript 实现与许可证。新增页面和学习逻辑使用 TypeScript 编写。

## 功能概览

| 模块 | 已实现功能 |
| --- | --- |
| 背单词 | IELTS 核心词汇、月份、星期、季节词库；拼写与释义两种练习方式 |
| 拼写练习 | 看中文输入英文、Enter 核对、拼错重试、查看答案后手动输入 |
| 间隔复习 | 优先安排到期词，根据练习表现调整复习时间 |
| 错词巩固 | 集中练习不认识、模糊或需要巩固的词 |
| 学习统计 | 今日学习词数、认识率、学习时长、连续学习天数、掌握词数 |
| 学习设置 | 每组 5–100 词，下一组生效 |
| IELTS 阅读 | 使用原项目已有阅读题库与练习页面 |
| IELTS 听力 | 音频播放、填写答案、提交核对、继续订正 |
| IELTS 写作 | Task 1 / Task 2、图表展示、计时、词数统计、草稿保存、作文导出 |
| IELTS 口语 | 服务商选择、自带 API Key、自由对话和 Part 1–3 训练、语音转写及回复朗读 |
| 题库管理 | 听力和写作题库 JSON 导入、导出、网址手动同步 |

**题库现状：**项目包含 3,610 个 IELTS 核心词汇及原项目已有阅读资源。听力和写作模块初始题库为空，需要自行导入题目和可访问的音频、图片资源。题库格式示例不是雅思真题。

## 本地运行

需要安装 Node.js 和 npm。Vite 8 要求 Node.js 20.19+ 或 22.12+，建议使用符合要求的 LTS 版本。

```bash
git clone https://github.com/LinQ1000/ai-wordpractice-.git
cd ai-wordpractice-
npm ci
npm run dev
```

在浏览器打开终端显示的地址。Vue 主应用需要通过开发服务器或构建后的静态服务器访问，不能直接双击根目录 `index.html` 运行。

### 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run typecheck` | 检查 TypeScript 与 Vue 类型 |
| `npm run build` | 先执行类型检查，再生成 `dist/` |
| `npm run preview` | 本地预览构建结果，包含口语 API 中间件 |
| `npm start` | 启动构建后的 Node.js 应用与口语 API（默认端口 3000） |

构建与预览：

```bash
npm run build
npm run preview
```

当前资源地址使用根路径，部署时应将 `dist/` 作为站点根目录。部署到子路径前需要统一调整 Vite 配置及代码中的资源、导航地址。

## 单词练习

1. 进入“背单词”，选择 IELTS、月份、星期或季节词库。
2. 选择“看释义 · 打字拼写”或“看单词 · 记忆释义”。
3. 默认优先练习到期词，再补充新词；可勾选“包含已学词”重复练习。
4. 完成当前组后，可继续下一组或返回首页。

### 打字拼写

默认显示中文释义，隐藏英文、音标和例句，避免提前看到答案。

- 输入英文后按 **Enter** 或点击“核对拼写”。
- 拼错可以重试；查看答案后，需要亲手输入正确单词。
- 拼对后显示单词、音标和例句，再按 **Enter** 或点击“下一词”。
- 结果在进入下一词时计入学习记录；完成页显示首次独立拼对词数。
- 核对时忽略大小写、首尾空格，并兼容全角字母；不会忽略字母拼写错误。

### 复习规则

| 练习表现 | 记录方式 | 下次复习 |
| --- | --- | --- |
| 释义模式选择“不认识”，或拼写时查看答案后完成 | 不认识 | 1 分钟后 |
| 释义模式选择“模糊”，或拼写重试后完成 | 模糊 | 1 天后 |
| 释义模式选择“认识”，或首次独立拼对 | 认识 | 连续成功时依次为 1、3、7、14、30 天 |

连续认识至少 3 次的词计入“已掌握”。不认识或模糊会重置连续成功次数，并进入错词巩固；再次按“认识”完成后移出错词列表。

首页认识率根据当日评价中“认识”的比例计算，包含释义自评与拼写结果；它不等同于考试正确率。每词学习计时最多计入 5 分钟。

## IELTS 练习

### 阅读

点击“IELTS 阅读”进入原项目页面，使用其已有阅读题库。该模块保留原来的页面与 JavaScript，相关说明见 [原项目 README](public/ielts/README.md)。

### 听力

导入听力题库后，选择试题，播放音频并填写答案，提交后查看得分与参考答案，也可继续订正。

答案按导入题库中的可接受答案核对，忽略大小写及多余空格；当前不提供 IELTS 分数换算。音频需要有可访问的资源地址，导入 JSON 不会同时上传音频文件。

### 写作

导入写作题库后，选择 Task 1 或 Task 2 题目，可查看题干与可选图表、计时写作、统计词数、保存草稿和导出作文。

页面分别以 150 / 250 词作为 Task 1 / Task 2 的词数提示。当前不包含 AI 评分或人工批改服务。

## 导入与同步题库

在听力或写作页面可以：

- **导入 JSON：**选择本地题库文件，经格式检查后合并。
- **网址同步：**填写直接返回题库 JSON 的 HTTP / HTTPS 地址，点击同步。
- **导出题库：**下载当前浏览器保存的听力、写作题库。

相同题目 ID 更新，不同 ID 合并保留。网址同步是手动操作，不会自动抓取第三方网站，也不包含定时同步。跨域地址需要允许浏览器访问（CORS）。

题库结构示例：

```json
{
  "version": 1,
  "exams": [
    {
      "id": "your-writing-task-2",
      "kind": "writing",
      "title": "填写题目名称",
      "source": "填写题库来源",
      "task": 2,
      "prompt": "填写完整写作题干"
    }
  ]
}
```

完整的听力、写作及音频路径说明见 [题库格式文档](public/question-banks/README.md)。请填写实际来源，并确认所使用的题目、文章、音频和图片具有相应使用权限。

## 数据保存

项目当前提供口语 API 转发后端，没有账号系统，也不提供跨设备同步。新增模块使用浏览器 `localStorage`：

| 存储键 | 内容 |
| --- | --- |
| `ai-vocabulary-progress` | 单词复习进度 |
| `ai-vocabulary-activities` | 学习评价与每日统计记录 |
| `ai-vocabulary-batch` | 每组词数设置 |
| `ielts-question-bank` | 导入的听力与写作题库 |
| `ielts-practice-draft:*` | 听力答案与写作草稿 |

清理站点数据、更换浏览器或访问地址可能导致无法访问原记录。题库导出不包含学习进度与写作草稿，作文需要单独导出。

新增单词模块与原 IELTS 模块的数据独立。复制项目文件不会迁移旧地址下的浏览器学习数据。旧单词进度可继续使用，但缺少日期的旧记录不会计入每日统计。

## 项目结构

```text
src/
├── main.ts                 # Vue 应用入口
├── App.vue                 # 首页、导航、统计和设置
├── Study.vue               # 单词、拼写与复习页面
├── ExamPractice.vue        # 听力与写作页面
├── style.css               # 基础样式
├── data/basic.json         # 月份、星期、季节词汇
├── stores/learning.ts      # 学习记录、统计与复习安排
└── lib/
    ├── spelling.ts         # 拼写核对与评价规则
    └── questionBank.ts     # 题库校验与合并
public/
├── ielts/                  # 原 IELTS 项目与许可证
├── question-banks/         # 题库格式说明及本地资源位置
└── original-word-practice.html  # 旧版基础单词页面备份
```

## 开源许可与致谢

本项目整合了 [sallowayma-git/IELTS-practice](https://github.com/sallowayma-git/IELTS-practice)，感谢原作者与贡献者的工作。原项目的 [GPL-3.0 许可证](public/ielts/LICENSE)、[项目说明](public/ielts/README.md)和第三方许可文件予以保留。

本项目代码遵循 **GNU GPL v3.0**，以 [LICENSE](LICENSE) 全文为准。我们尊重用户运行、研究、修改和再分发代码的自由；发布和分发修改版本时，应遵守许可证对声明、修改说明及对应源码提供的要求。

当前整合修改包括：新增 Vue 3 + TypeScript 主入口、单词拼写与复习功能、学习统计，以及独立的听力和写作练习模块。原 IELTS JavaScript 应用保留在 `public/ielts/`。

GPL 对代码的授权不代表对第三方题目、文章、音频、图片等内容的授权；这些内容应按各自的版权和许可处理。依赖与第三方素材保留各自的许可声明。

项目源码仓库：[LinQ1000/ai-wordpractice-](https://github.com/LinQ1000/ai-wordpractice-)。本地文档更新不代表修改已推送或源码已经公开发布。

## AI 口语练习与 API Key

进入“IELTS 口语”，选择服务商，填写自己的 API Key 和已开通的模型名称。当前提供 DeepSeek 和通义千问（百炼北京地域），默认模型可编辑。切换服务商会清除已有 Key，避免误发到其他服务商。

- 可选择自由对话或 IELTS Part 1、2、3 训练。
- 点击“让 AI 开始提问”，或输入英文发送；支持多轮上下文。
- 点击麦克风进行英语识别，检查转写文字后再发送。可自动朗读或手动重播 AI 回复。
- 不支持语音识别的浏览器仍可打字练习。浏览器语音识别需要相应支持、麦克风权限和 HTTPS / localhost；部分浏览器会将音频交给其语音服务处理。
- API Key 和未保存的口语对话仅保存在当前页面内存中，离开模块或刷新后清除。点击“保存本次练习”可将对话文本写入本地练习记录，记录不包含 API Key。API Key 经本站后端转发到所选服务商，后端不落盘、不记录密钥或请求内容。
- 调用会产生服务商 API 费用。AI 接收文字转写，只提供语法和表达建议，不提供发音评分或官方 IELTS 成绩。

开发时 `npm run dev` 同时提供页面和 `/api/speaking`。生产使用：

```bash
npm run build
npm start
```

默认监听 `127.0.0.1:3000`，可用 `HOST` / `PORT` 配置。公网部署需通过 HTTPS 反向代理访问，保留正确的 Host 与 Origin；不要把含 API Key 的请求体记录到代理日志中。单独上传 `dist/` 到静态托管不能运行口语 API，需要同时部署 Node.js 后端或转发 `/api/speaking`。

服务商接口参考：[DeepSeek 官方文档](https://api-docs.deepseek.com/)、[通义千问兼容接口文档](https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope)。模型可用性以各自账号为准。

## 官方练习资源入口

听力、写作和口语页面已内置 British Council 与 IELTS.org 的官方资源卡片，可直接在新标签页打开对应练习。资源属于官方样题或模拟练习，不标为历年真题。

| 页面 | 官方来源 |
| --- | --- |
| 听力 | [British Council 听力样题](https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests/academic/listening) |
| 写作 | [British Council 学术类写作样题](https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests/academic/writing) |
| 口语 | [British Council 口语样题](https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests/academic/speaking) |
| 综合 | [IELTS.org 官方样题](https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test) |

当前接入方式为来源链接，不复制第三方题目、PDF 或音频，也不将外站成绩导入本站。本站听力、写作 JSON 题库导入功能继续保留。资源核查日期：2026-10-15。

## 听力、写作、口语统一导航

三个模块采用阅读模块的顶部五栏导航与半透明圆角面板：

- **总览**：题库/训练方式数量、已完成记录及最近练习。
- **题库浏览**：听力、写作可搜索导入题目并开始练习；口语可搜索并选择自由对话、Part 1–3 训练。
- **练习记录**：听力提交、写作完成后自动保存，口语点击“保存本次练习”保存；可展开查看详情及导出。
- **更多**：官方样题资源、题库和记录导出工具。
- **设置**：听力/写作计时显示，口语 API 配置与自动朗读偏好。

完成记录存于 `ielts-module-history`，与原阅读模块记录独立。听力订正或同一次口语再次保存会更新该条记录。切换栏目保留当前练习内容，并暂停计时/语音；退出模块时 API Key 清除。计时显示与自动朗读偏好保存至浏览器。
