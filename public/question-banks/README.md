# IELTS 题库导入格式

UTF-8 JSON，version 固定为 1。可在同一 exams 数组中包含听力和写作。
题库不会自动下载音频：将音频放入 public/question-banks/audio/，并填写 /question-banks/audio/文件名.mp3，或填写可访问的 HTTPS 音频地址。
写作图表可使用 imageUrl 指向图片。同步地址必须直接返回此 JSON 格式；跨域来源需要允许浏览器访问（CORS）。
同 ID 更新、其他 ID 保留。导入题库和草稿保存在当前浏览器。

以下仅为格式示例，不是真题；请替换示例文本和资源地址后导入：

```json
{
  "version": 1,
  "exams": [
    {
      "id": "listening-example",
      "kind": "listening",
      "title": "替换为题目名称",
      "source": "填写题库来源",
      "audioUrl": "/question-banks/audio/example.mp3",
      "questions": [
        { "id": "q1", "prompt": "替换为题干", "answers": ["acceptable answer", "alternative answer"] }
      ]
    },
    {
      "id": "writing-example",
      "kind": "writing",
      "title": "替换为写作题目名称",
      "source": "填写题库来源",
      "task": 2,
      "prompt": "替换为完整写作题干"
    }
  ]
}
```
