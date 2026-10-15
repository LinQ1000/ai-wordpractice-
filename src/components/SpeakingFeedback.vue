<script setup lang="ts">
import type { SpeakingAssessment } from '../../server/speakingAssessment';
defineProps<{ assessment: SpeakingAssessment; stale: boolean }>();
const emit=defineEmits<{ speak: [string] }>();
</script>
<template>
  <section class="feedback" aria-label="口语批改结果">
    <h3>答题结果 · AI 批改</h3>
    <p v-if="stale" class="stale" role="status">回答已修改，以下结果对应上一次提交。重新提交后更新批改。</p>
    <div class="analysis"><h4>总体反馈</h4><p>{{ assessment.overall }}</p><ul><li v-for="item in assessment.strengths" :key="item">{{ item }}</li></ul></div>
    <h4>语法与句子修改</h4>
    <div v-if="assessment.corrections.length" class="table-scroll"><table><thead><tr><th>你的原句</th><th>修改建议</th><th>说明</th></tr></thead><tbody><tr v-for="(item,index) in assessment.corrections" :key="index"><td>{{ item.original }}</td><td>{{ item.corrected }}</td><td>{{ item.explanation }}</td></tr></tbody></table></div><p v-else>本次未列出需要修改的句子。</p>
    <h4>词汇与表达建议</h4><div v-for="(item,index) in assessment.vocabulary" :key="index" class="vocabulary"><p><span>{{ item.original }}</span> → <strong>{{ item.suggestion }}</strong></p><p>{{ item.explanation }}</p></div><p v-if="!assessment.vocabulary.length">本次没有额外的词汇替换建议。</p>
    <div class="analysis"><h4>优化后的参考回答</h4><p class="improved" lang="en">{{ assessment.improvedAnswer }}</p><button @click="emit('speak',assessment.improvedAnswer)">🔊 朗读参考回答</button></div>
    <h4>下一步练习</h4><ul><li v-for="tip in assessment.practiceTips" :key="tip">{{ tip }}</li></ul>
    <p class="note">以上根据文字回答提供语言建议，不评估发音、口音或真实语速，也不代表官方雅思成绩。</p>
  </section>
</template>
<style scoped>
.feedback { border-top:1px solid #c9c9c9; padding-top:22px; margin-top:24px; }h3 { font-size:19px; margin-bottom:16px; }h4 { font-size:15px; margin:18px 0 10px; }p,li { font-size:14px; line-height:1.8; overflow-wrap:anywhere; }ul { padding-left:22px; }.analysis { padding:16px; border-left:4px solid #418fc6; background:#eff6ff; border-radius:8px; margin:16px 0; }.analysis h4 { margin-top:0; }.improved { white-space:pre-wrap; }.table-scroll { overflow-x:auto; }table { border-collapse:collapse; width:100%; font-size:14px; }th,td { text-align:left; border:1px solid #c9c9c9; padding:10px; line-height:1.7; vertical-align:top; overflow-wrap:anywhere; }th { background:#f2f3ef; }.vocabulary { padding:12px; border-bottom:1px solid #e2e8f0; }.note { color:#64748b; font-size:12px; margin-top:18px; }.stale { color:#854d0e; background:#fef9c3; padding:12px; border-radius:8px; }button { border:1px solid #c9c9c9; background:white; border-radius:6px; padding:9px 12px; cursor:pointer; color:#334155; }
</style>
