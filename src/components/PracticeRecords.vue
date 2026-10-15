<script setup lang="ts">
import { computed } from 'vue';
import { practiceHistory, historyError, exportPractice, type Skill } from '../stores/practiceHistory';
const props=defineProps<{skill:Skill}>();
const records=computed(()=>practiceHistory.value.filter(r=>r.skill===props.skill));
</script>
<template><section class="panel"><h2>📝 练习记录</h2><p>共 {{ records.length }} 条 · 保存在当前浏览器</p><button :disabled="!records.length" @click="exportPractice(skill)">导出记录</button><p v-if="historyError" role="alert">{{ historyError }}</p><p v-if="!records.length">暂无练习记录，完成一次练习后会显示在这里。</p><article v-for="record in records" :key="record.id"><h3>{{ record.title }}</h3><p>{{ new Date(record.date).toLocaleString() }} · {{ record.summary }}</p><details><summary>查看练习内容</summary><pre>{{ record.content }}</pre></details></article></section></template>
<style scoped>h2 { margin-bottom:16px; } p { margin:14px 0; line-height:1.7; } article { padding:20px 0; border-bottom:1px solid #e2e8f0; } pre { white-space:pre-wrap; overflow-wrap:anywhere; font:inherit; line-height:1.8; padding:16px; background:#ffffff99; border-radius:12px; }button { padding:10px 16px; border:0; border-radius:10px; background:#5b5ce2; color:white; cursor:pointer; }button:disabled { opacity:.5; }summary { cursor:pointer; }</style>
