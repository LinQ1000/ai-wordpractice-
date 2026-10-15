<script setup lang="ts">
import { documentPage, type OfficialExam } from '../data/officialBank';
defineProps<{ exam: OfficialExam; answer?: boolean }>();
</script>
<template>
  <div class="official-document">
    <div class="document-tools"><span>{{ answer ? '官方答案 / 范例与评语' : '官方原题 PDF' }} · 第 {{ answer && exam.answerPage ? exam.answerPage : exam.page }} 页</span><a :href="documentPage(exam,answer)" target="_blank" rel="noopener noreferrer">单独打开 ↗</a></div>
    <iframe :key="documentPage(exam,answer)" :src="documentPage(exam,answer)" :title="exam.title + (answer ? '参考答案' : '官方原题')" referrerpolicy="no-referrer"></iframe>
    <p>原题由 IELTS.org 在线加载。若 PDF 未显示或浏览器未跳转到指定页，请点击“单独打开”并选择上方页码。</p>
  </div>
</template>
<style scoped>
.official-document { min-width:0; }.document-tools { display:flex; gap:12px; flex-wrap:wrap; justify-content:space-between; font-size:13px; margin-bottom:12px; }a { color:#4547bd; }iframe { width:100%; height:65vh; min-height:450px; border:1px solid #d8dbe5; background:#f1f5f9; border-radius:10px; }p { font-size:12px; color:#64748b; line-height:1.7; margin:10px 0; }@media(max-width:700px){iframe {height:55vh;min-height:320px;}}
</style>
