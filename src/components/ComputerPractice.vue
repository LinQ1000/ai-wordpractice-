<script setup lang="ts">
import { computed, ref, watch, onUnmounted, nextTick } from 'vue';
import type { OfficialExam } from '../data/officialBank';
import { savePractice } from '../stores/practiceHistory';
import OfficialDocument from './OfficialDocument.vue';
const props = defineProps<{ exam: OfficialExam }>();
const emit = defineEmits<{ close: [] }>();
const answers=ref<Record<string,string>>({});
const essay=ref('');
const flags=ref<number[]>([]);
const remaining=ref(props.exam.minutes*60);
const running=ref(false);
const submitted=ref(false);
const notice=ref('');
const fullscreen=ref(false);
const showAnswers=ref(false);
const audioError=ref(false);
const audio=ref<HTMLAudioElement | null>(null);
const activeQuestion=ref(props.exam.questionNumbers?.[0] || 1);
let sessionId: string | undefined;
let deadline=0;
const key=`ielts-official-draft:${props.exam.id}`;
try {
  const draft=JSON.parse(localStorage.getItem(key)||'null');
  if(draft && typeof draft.essay==='string') essay.value=draft.essay;
  if(draft?.answers && typeof draft.answers==='object' && !Array.isArray(draft.answers)) answers.value=Object.fromEntries(Object.entries(draft.answers).filter(([,v])=>typeof v==='string')) as Record<string,string>;
  if(Array.isArray(draft?.flags)) flags.value=draft.flags.filter((n:unknown)=>typeof n==='number' && props.exam.questionNumbers?.includes(n));
  if(Number.isFinite(draft?.remaining) && draft.remaining>=0) remaining.value=Math.min(draft.remaining,props.exam.minutes*60);
  if(typeof draft?.sessionId==='string') sessionId=draft.sessionId;
  if(typeof draft?.submitted==='boolean') submitted.value=draft.submitted;
} catch { notice.value='草稿读取失败，本次从空白答题卡开始。'; }
function saveDraft() {
  try { localStorage.setItem(key,JSON.stringify({answers:answers.value,essay:essay.value,flags:flags.value,remaining:remaining.value,sessionId,submitted:submitted.value})); }
  catch { notice.value='草稿保存失败，请导出或复制当前答案。'; }
}
watch([answers,essay,flags],saveDraft,{deep:true});
function saveBeforeLeaving() { if(running.value) remaining.value=Math.max(0,Math.ceil((deadline-Date.now())/1000)); pause();saveDraft();audio.value?.pause(); }
window.addEventListener('pagehide',saveBeforeLeaving);
const timer=setInterval(()=>{ if(!running.value) return; remaining.value=Math.max(0,Math.ceil((deadline-Date.now())/1000)); if(remaining.value===0) finish(true); },250);
onUnmounted(()=>{ saveBeforeLeaving();window.removeEventListener('pagehide',saveBeforeLeaving);clearInterval(timer); });
const timeLabel=computed(()=>`${String(Math.floor(remaining.value/60)).padStart(2,'0')}:${String(remaining.value%60).padStart(2,'0')}`);
const wordCount=computed(()=>essay.value.trim() ? essay.value.trim().split(/\s+/).length : 0);
const answeredCount=computed(()=>props.exam.questionNumbers?.filter(n=>answers.value[n]?.trim()).length || 0);
function pause() { running.value=false; }
function toggleTimer() { if(running.value) pause(); else if(!submitted.value && remaining.value>0) { deadline=Date.now()+remaining.value*1000;running.value=true; } saveDraft(); }
function goQuestion(n:number) { activeQuestion.value=n; nextTick(()=>document.getElementById(`official-answer-${n}`)?.focus()); }
function toggleFlag(n:number) { flags.value=flags.value.includes(n) ? flags.value.filter(v=>v!==n) : [...flags.value,n]; }
function finish(timedOut=false) {
  if(submitted.value) return;
  if(!timedOut && props.exam.skill==='writing' && !essay.value.trim()) { notice.value='请先填写作文再提交。'; return; }
  pause(); audio.value?.pause();
  const content=props.exam.skill==='writing' ? essay.value : props.exam.questionNumbers?.map(n=>`${n}. ${answers.value[n]||'未作答'}`).join('\n') || '';
  const id=savePractice({skill:props.exam.skill,title:props.exam.title,summary:props.exam.skill==='writing' ? `${wordCount.value} 词 · 官方样题` : `已答 ${answeredCount.value}/${props.exam.questionNumbers?.length || 0} · 官方答案自核`,content:`来源：${props.exam.sourceUrl}\n题目：${props.exam.documentUrl}\n\n${content}`},sessionId);
  if(id) { sessionId=id;submitted.value=true;notice.value=timedOut ? '时间到，答案已提交并保存。' : '答案已保存到练习记录，可以查看官方答案。'; }
  else notice.value='练习记录保存失败，请先导出答案。';
  saveDraft();
}
function revise() { submitted.value=false;showAnswers.value=false;notice.value='已进入订正，重新提交将更新本次记录。'; saveDraft(); }
function newAttempt() {
  pause();audio.value?.pause();if(audio.value) audio.value.currentTime=0;
  answers.value={};essay.value='';flags.value=[];remaining.value=props.exam.minutes*60;sessionId=undefined;submitted.value=false;showAnswers.value=false;notice.value='已开始新的练习，之前的提交记录仍保留。';saveDraft();
}
function download() {
  const text=props.exam.title+'\n\n'+(props.exam.skill==='writing' ? essay.value : props.exam.questionNumbers?.map(n=>`${n}. ${answers.value[n]||''}`).join('\n'));
  const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'})); const a=document.createElement('a');a.href=url;a.download=`${props.exam.id}-answers.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
</script>
<template>
  <section class="computer-practice" :class="{ fullscreen }" aria-label="机考练习界面">
    <header><div><span class="badge">官方样题 · 机考练习</span><h2>{{ exam.title }}</h2></div><div class="exam-tools"><strong :class="{ urgent:remaining<60 }">{{ timeLabel }}</strong><button v-if="!submitted" @click="toggleTimer">{{ running ? '暂停' : '开始计时' }}</button><button @click="fullscreen=!fullscreen">{{ fullscreen ? '退出专注' : '专注模式' }}</button><button @click="emit('close')">返回题库</button></div></header>
    <p class="source">来源：<a :href="exam.sourceUrl" target="_blank" rel="noopener noreferrer">{{ exam.source }}</a> · {{ exam.skill==='listening' ? '短篇练习计时可暂停，不等同完整考试时长。' : '按单个写作任务计时。' }}</p>
    <div v-if="exam.skill==='listening'" class="audio-toolbar"><audio v-if="exam.audioUrl" ref="audio" :src="exam.audioUrl" controls preload="none" @error="audioError=true"></audio><p v-else>本题音频暂不可直接播放，请通过官方来源页面收听。</p><p v-if="audioError" role="alert">官方音频加载失败，请打开官方来源重试。</p></div>
    <div class="exam-columns"><div class="question-document"><OfficialDocument :exam="exam" :answer="showAnswers" /></div><div class="response-panel"><h3>{{ exam.skill==='writing' ? '写作答题区' : '听力答题卡' }}</h3>
      <template v-if="exam.skill==='writing'"><p>Task {{ exam.task }} · 建议至少 {{ exam.task===1 ? 150 : 250 }} 词</p><textarea v-model="essay" :readonly="submitted" rows="22" aria-label="写作答案" placeholder="Write your answer here…"></textarea><p>{{ wordCount }} 词</p></template>
      <template v-else><p>参照左侧原题编号填写答案；字数与选项要求以官方题面为准。</p><div v-for="n in exam.questionNumbers" :key="n" class="answer-row" :class="{ selected:activeQuestion===n }"><label :for="`official-answer-${n}`">{{ n }}</label><input :id="`official-answer-${n}`" v-model="answers[n]" :readonly="submitted" autocomplete="off" :aria-label="`第${n}题答案`" @focus="activeQuestion=n"><button :aria-pressed="flags.includes(n)" :aria-label="`标记第${n}题`" @click="toggleFlag(n)">{{ flags.includes(n) ? '★' : '☆' }}</button></div><p>已答 {{ answeredCount }} / {{ exam.questionNumbers?.length }} 题。提交后可查看官方答案自行核对。</p></template>
    </div></div>
    <nav v-if="exam.skill==='listening'" class="question-nav" aria-label="题号导航"><button v-for="n in exam.questionNumbers" :key="n" :class="{ answered:answers[n]?.trim(), flagged:flags.includes(n), current:activeQuestion===n }" @click="goQuestion(n)">{{ n }}{{ flags.includes(n) ? '★' : '' }}</button></nav>
    <footer><div class="exam-tools"><button v-if="!submitted" class="primary" @click="finish()">提交答案</button><button v-else @click="revise">继续订正</button><button v-if="submitted" @click="newAttempt">重新练习</button><button v-if="submitted && exam.answerPage" @click="showAnswers=!showAnswers">{{ showAnswers ? '返回原题' : '查看官方答案 / 范例' }}</button><button @click="download">导出答案</button></div><p v-if="notice" role="status">{{ notice }}</p></footer>
  </section>
</template>
<style scoped>
.computer-practice { background:#fff; border:1px solid #d8dbe5; border-radius:18px; overflow:hidden; margin:20px 0; }.fullscreen { position:fixed; inset:0; margin:0; z-index:1000; overflow:auto; border-radius:0; }header { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; padding:22px; background:#edf3fa; border-bottom:1px solid #d8dbe5; }h2 { font-size:20px; margin:8px 0; }.badge { font-size:12px; color:#475569; }.exam-tools { display:flex; align-items:center; flex-wrap:wrap; gap:10px; }button { padding:9px 13px; background:white; border:1px solid #cbd5e1; border-radius:7px; color:#334155; cursor:pointer; }.primary { background:#354ea4; color:white; }.source { font-size:12px; color:#64748b; padding:12px 22px; }a { color:#354ea4; }.exam-columns { display:grid; grid-template-columns:1.15fr 1fr; }.question-document { padding:20px; min-width:0; border-right:1px solid #e2e8f0; }.response-panel { padding:20px; min-width:0; max-height:80vh; overflow:auto; }.response-panel p { font-size:13px; color:#64748b; margin:12px 0; line-height:1.7; }.response-panel textarea { width:100%; font:inherit; line-height:1.8; padding:16px; border:1px solid #cbd5e1; border-radius:8px; resize:vertical; }.answer-row { display:flex; gap:10px; padding:10px; align-items:center; border:1px solid transparent; }.answer-row.selected { border-color:#7a8cc9; background:#f3f5ff; }.answer-row label { min-width:26px; font-weight:600; }.answer-row input { width:100%; min-width:0; border:1px solid #cbd5e1; border-radius:6px; padding:11px; font:inherit; }.question-nav { display:flex; flex-wrap:wrap; gap:6px; padding:16px 22px; border-top:1px solid #d8dbe5; }.question-nav .answered { background:#dff1e5; }.question-nav .flagged { border-color:#ca8a04; }.question-nav .current { outline:2px solid #354ea4; }footer { padding:20px 22px; border-top:1px solid #d8dbe5; }footer p { margin:12px 0; }.audio-toolbar { padding:0 22px 14px; }audio { width:100%; }.urgent { color:#b42318; }@media(max-width:800px) { .exam-columns { grid-template-columns:1fr; }.question-document { border-right:0; border-bottom:1px solid #e2e8f0; } }
</style>
