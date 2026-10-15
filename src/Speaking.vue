<script setup lang="ts">
import { computed, ref, watch, onUnmounted, nextTick } from 'vue';
import OfficialResources from './components/OfficialResources.vue';
import IeltsLayout, { type Section } from './components/IeltsLayout.vue';
import PracticeRecords from './components/PracticeRecords.vue';
import { practiceHistory, historyError, savePractice, exportPractice, readPreference, savePreference } from './stores/practiceHistory';
const emit = defineEmits<{ back: [] }>();
const section = ref<Section>('overview');
const sessionId = ref<string | undefined>();
const savedNotice = ref('');
const records = computed(()=>practiceHistory.value.filter(r=>r.skill==='speaking'));
const trainingModes = [{id:'free',title:'自由对话',description:'围绕日常话题，练习自然交流。'},{id:'part1',title:'Part 1 · 日常问答',description:'练习个人经历、工作、学习和兴趣相关问题。'},{id:'part2',title:'Part 2 · 话题陈述',description:'练习话题卡准备和连续表达。'},{id:'part3',title:'Part 3 · 深入讨论',description:'练习分析观点、解释原因和比较不同立场。'}];
const search = ref('');
const filteredModes = computed(()=>trainingModes.filter(m=>(m.title+m.description).toLowerCase().includes(search.value.toLowerCase())));
function openTraining(id:string) { mode.value=id; section.value='browse'; }
function saveSession() {
  if (!messages.value.length) return;
  sessionId.value=savePractice({skill:'speaking',title:trainingModes.find(m=>m.id===mode.value)?.title || '口语对话',summary:`${messages.value.filter(m=>m.role==='user').length} 轮表达`,content:messages.value.map(m=>`${m.role==='user' ? '我' : 'AI 教练'}：${m.content}`).join('\n\n')},sessionId.value);
  savedNotice.value=sessionId.value ? '本次对话已保存到练习记录。' : '';
}
watch(section,value=>{ if(value!=='browse') { stopVoice(); controller?.abort(); } });
type Provider = 'deepseek' | 'qwen';
interface Message { role: 'user' | 'assistant'; content: string }
interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
const speechWindow = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
const RecognitionClass = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
const provider = ref<Provider>('deepseek');
const apiKey = ref('');
const model = ref('deepseek-flash');
const mode = ref('free');
const showKey = ref(false);
const autoSpeak = ref(readPreference('ielts-speaking-auto-speak',true));
watch(autoSpeak, value=>savePreference('ielts-speaking-auto-speak',value));
const messages = ref<Message[]>([]);
const input = ref('');
const error = ref('');
const busy = ref(false);
const listening = ref(false);
const chat = ref<HTMLElement | null>(null);
const transcriptNotice = ref('');
let recognition: Recognition | undefined;
let controller: AbortController | undefined;
let voicePrefix = '';
const configured = computed(() => !!apiKey.value.trim() && !!model.value.trim());
watch(provider, () => { apiKey.value = ''; model.value = provider.value === 'deepseek' ? 'deepseek-flash' : 'qwen-plus'; error.value = ''; });
watch(mode, reset);
function stopVoice() { if (recognition) { recognition.onend=null; recognition.onresult=null; recognition.onerror=null; recognition.abort(); recognition=undefined; } listening.value = false; if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }
function speak(text: string) {
  if (!('speechSynthesis' in window)) { error.value = '浏览器不支持语音朗读，可阅读文字回复。'; return; }
  window.speechSynthesis.cancel(); const speech = new SpeechSynthesisUtterance(text); speech.lang='en-US'; speech.rate=.9; window.speechSynthesis.speak(speech);
}
function record() {
  if (!RecognitionClass || busy.value) return;
  if (listening.value) { recognition?.stop(); return; }
  stopVoice(); error.value = ''; transcriptNotice.value = '';
  recognition = new RecognitionClass(); recognition.lang='en-US'; recognition.continuous=false; recognition.interimResults=false;
  voicePrefix=input.value;
  recognition.onresult = event => { input.value = [voicePrefix, event.results[0]?.[0]?.transcript || ''].filter(Boolean).join(' '); transcriptNotice.value = '语音已转为文字，可修改后发送。'; };
  recognition.onerror = event => { error.value=event.error==='not-allowed' ? '请允许麦克风权限，或使用文字输入。' : '语音识别未成功，请重试或使用文字输入。'; listening.value=false; };
  recognition.onend = () => { listening.value=false; };
  try { recognition.start(); listening.value=true; } catch { error.value='麦克风暂时不可用，请使用文字输入。'; }
}
async function send(opening = false) {
  if (busy.value || listening.value) return;
  if (!configured.value) { error.value='请先选择服务商并填写 API Key 和模型。'; return; }
  const text = opening ? 'Please start our English speaking practice and ask me your first question.' : input.value.trim();
  if (!text) return;
  if (text.length>4000 || messages.value.length>=38) { error.value='内容过长或本轮对话已满，请缩短内容或开启新对话。'; return; }
  stopVoice(); busy.value=true; error.value=''; controller=new AbortController();
  const history: Message[] = [...messages.value,{role:'user',content:text}];
  try {
    const response=await fetch('/api/speaking',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({provider:provider.value,apiKey:apiKey.value.trim(),model:model.value.trim(),mode:mode.value,messages:history})});
    const result = await response.json() as { reply?: string; error?: string };
    if (!response.ok || typeof result.reply !== 'string') throw new Error(result.error || '请求失败，请确认 API 服务已启动。');
    messages.value=[...history,{role:'assistant',content:result.reply}]; input.value=''; transcriptNotice.value='';
    if (autoSpeak.value) speak(result.reply);
    nextTick(()=>chat.value?.scrollTo({top:chat.value.scrollHeight,behavior:'smooth'}));
  } catch (reason) { error.value=reason instanceof Error && reason.name==='AbortError' ? '本次请求已取消。' : reason instanceof Error ? reason.message : '请求失败，请重试。'; }
  finally { busy.value=false; controller=undefined; }
}
function reset() { stopVoice(); messages.value=[]; error.value=''; input.value=''; sessionId.value=undefined; savedNotice.value=''; }
function clearKey() { apiKey.value=''; showKey.value=false; }
onUnmounted(()=>{ controller?.abort(); stopVoice(); clearKey(); });
</script>

<template>
  <IeltsLayout title="口语" v-model:section="section" @back="emit('back')">
    <section v-if="section === 'overview'" class="panel"><h2>📊 学习总览</h2><p>与 AI 对话，练习英文表达。</p><div class="overview-grid"><div class="metric">训练方式<strong>4</strong>自由对话与 Part 1–3</div><div class="metric">已保存练习<strong>{{ records.length }}</strong>条记录</div><div class="metric">API 状态<strong style="font-size:20px">{{ configured ? '已填写' : '待配置' }}</strong>{{ configured ? '可进入题库浏览开始练习' : '请先在设置中填写密钥' }}</div></div><div class="toolbar"><button @click="section='browse'">进入题库浏览 →</button><button @click="section='settings'">API 设置</button></div></section>
    <PracticeRecords v-else-if="section === 'records'" skill="speaking" />
    <template v-else-if="section === 'more'"><OfficialResources kind="speaking" /><section class="panel"><h2>✨ 数据工具</h2><button @click="exportPractice('speaking')">导出口语练习记录</button><p class="note">导出包含已保存对话，不包含 API Key。</p></section></template>
    <section v-else-if="section === 'settings'" class="panel">
      <h2>⚙️ 系统设置</h2><p><label><input v-model="autoSpeak" type="checkbox"> 自动朗读 AI 回复</label></p><h3>API 设置</h3>
      <div class="settings-grid">
        <label>服务商<select v-model="provider" :disabled="busy || listening"><option value="deepseek">DeepSeek</option><option value="qwen">通义千问 · 百炼北京</option></select></label>
        <label>模型名称<input v-model="model" :disabled="busy" placeholder="输入已开通的模型名称"></label>
        <label class="key-field">API Key<div class="key-input"><input v-model="apiKey" :disabled="busy" :type="showKey ? 'text' : 'password'" autocomplete="off" spellcheck="false" placeholder="输入当前服务商的 API Key"><button :aria-pressed="showKey" @click="showKey = !showKey">{{ showKey ? '隐藏' : '显示' }}</button><button :disabled="busy" @click="clearKey">清除</button></div></label>
      </div>
      <p class="note">密钥仅在当前页面内存中保留，离开页面或切换服务商后清除。发送时经本站后端转交所选服务商，后端不保存密钥。对话会产生服务商 API 费用。</p>
      <p v-if="provider === 'qwen'" class="note">当前连接百炼北京地域，请使用对应地域的 API Key；模型填写你已开通的名称。</p>
    </section>
    <section v-else-if="section === 'browse'" class="panel">
      <h2>📚 题库浏览</h2><p>选择 AI 训练方式，或在“更多”打开官方口语样题。</p><input v-model="search" class="search" placeholder="搜索训练方式" aria-label="搜索口语训练"><div class="browse-grid"><article v-for="item in filteredModes" :key="item.id" class="exam-card"><h3>{{ item.title }}</h3><p>{{ item.description }}</p><button :disabled="busy || listening" @click="openTraining(item.id)">进入训练</button></article></div><p v-if="!filteredModes.length">没有匹配的训练方式。</p><p v-if="!configured">请先<button @click="section='settings'">配置 API</button>，然后开始对话。</p>
      <div class="toolbar"><label>训练方式<select v-model="mode" :disabled="busy || listening"><option value="free">自由对话</option><option value="part1">IELTS Part 1 · 日常问答</option><option value="part2">IELTS Part 2 · 话题陈述</option><option value="part3">IELTS Part 3 · 深入讨论</option></select></label><label><input v-model="autoSpeak" type="checkbox"> 自动朗读回复</label><button :disabled="busy || listening" @click="reset">新对话</button><button :disabled="busy || listening || !messages.length" @click="saveSession">保存本次练习</button></div>
      <p class="note">切换训练方式会开始新对话。未保存的对话仅保留在本页；点击“保存本次练习”可写入本地记录。AI 根据文字转写提供表达建议，不提供发音评分或官方雅思成绩。</p>
      <div ref="chat" class="chat" aria-live="polite" aria-label="口语对话记录"><div v-if="!messages.length" class="empty"><p>准备好了吗？让 AI 先提问，或直接用英文介绍自己。</p><button :disabled="busy || listening || !configured" @click="send(true)">让 AI 开始提问</button></div><article v-for="(message,index) in messages" :key="index" :class="message.role"><strong>{{ message.role === 'user' ? '我' : 'AI 教练' }}</strong><p>{{ message.content }}</p><button v-if="message.role === 'assistant'" @click="speak(message.content)">朗读回复</button></article><p v-if="busy" role="status">AI 正在回复…</p></div>
      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <p v-if="!RecognitionClass" class="note">当前浏览器不支持语音识别，可使用文字输入。语音识别通常需要 HTTPS 或 localhost，部分浏览器会将音频交给其语音服务处理。</p>
      <p v-else class="note">语音识别使用浏览器语音服务。录音转写后可先检查文字，再发送给 AI。</p>
      <form @submit.prevent="send()"><label for="spoken-text">你的英文表达</label><textarea id="spoken-text" v-model="input" rows="4" maxlength="4000" :disabled="busy || listening" placeholder="点击麦克风说英语，或在这里输入英文…"></textarea><p v-if="listening" role="status">正在听，请说英语。再次点击麦克风可停止。</p><p v-if="transcriptNotice" role="status">{{ transcriptNotice }}</p><div class="toolbar"><button type="button" :disabled="busy || !RecognitionClass" @click="record">{{ listening ? '停止录音' : '🎙️ 麦克风输入' }}</button><button :disabled="busy || listening || !configured || !input.trim()">发送给 AI</button><button v-if="busy" type="button" @click="controller?.abort()">取消请求</button></div></form>
    </section>
    <p v-if="savedNotice" role="status">{{ savedNotice }}</p><p v-if="historyError" role="alert">{{ historyError }}</p>
  </IeltsLayout>
</template>

<style scoped>
.speaking-page { max-width:1050px; margin:auto; padding:28px 20px; } header,.toolbar { display:flex; flex-wrap:wrap; align-items:center; gap:14px; margin-bottom:18px; } h1 { font-size:26px; } h2 { font-size:19px; margin-bottom:16px; } p { line-height:1.7; margin:8px 0; }
.panel { background:white; border:1px solid #e8eaf0; border-radius:18px; padding:26px; margin-bottom:22px; }.settings-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }.settings-grid label { display:grid; gap:8px; }.key-field { grid-column:1 / -1; }.key-input { display:flex; flex-wrap:wrap; gap:8px; }.key-input input { flex:1; min-width:180px; }
input:not([type=checkbox]),select,textarea { border:1px solid #d8dbe5; border-radius:8px; padding:11px; font:inherit; max-width:100%; } textarea { width:100%; margin:10px 0; resize:vertical; } button { border:0; background:#5b5ce2; color:white; padding:10px 14px; border-radius:8px; cursor:pointer; } button:disabled { opacity:.5; cursor:default; }.note { font-size:13px; color:#747b89; }.error { color:#b44032; }
.chat { max-height:450px; overflow-y:auto; background:#f7f8fc; border-radius:12px; padding:16px; margin:16px 0; }.chat article { margin:10px 0; padding:16px; border-radius:12px; background:white; }.chat article.user { background:#eeeeff; }.chat article p { white-space:pre-wrap; overflow-wrap:anywhere; }.empty { text-align:center; padding:24px; }
@media(max-width:600px) { .settings-grid { grid-template-columns:1fr; }.panel { padding:18px; } }
</style>
