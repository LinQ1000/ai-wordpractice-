<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, nextTick } from 'vue';
import OfficialResources from './components/OfficialResources.vue';
import IeltsLayout, { type Section } from './components/IeltsLayout.vue';
import PracticeRecords from './components/PracticeRecords.vue';
import SpeakingFeedback from './components/SpeakingFeedback.vue';
import { parseAssessment, type SpeakingAssessment } from '../server/speakingAssessment';
import { officialBank, type OfficialExam } from './data/officialBank';
import { practiceHistory, historyError, savePractice, exportPractice, readPreference, savePreference } from './stores/practiceHistory';
import { parseSpeakingDraft, speakingDraftKey, speakingLastQuestionKey, type SpeakingDraft, type SpeakingDraftSnapshot } from './lib/speakingDraft';

const emit = defineEmits<{ back: [] }>();
const section = ref<Section>('overview');
const officialTopics = officialBank.filter(exam=>exam.skill==='speaking');
const selectedOfficial = ref<OfficialExam | undefined>(officialTopics[0]);
const search = ref('');
const filteredTopics = computed(()=>officialTopics.filter(exam=>(exam.title+' '+exam.starter).toLowerCase().includes(search.value.toLowerCase())));
const records = computed(()=>practiceHistory.value.filter(record=>record.skill==='speaking'));
const trainingModes = [
  {id:'free',title:'自由对话',description:'围绕日常话题练习英文表达。'},
  {id:'part1',title:'Part 1 · AI 模拟问答',description:'由 AI 提问，进行日常问答。'},
  {id:'part2',title:'Part 2 · AI 模拟陈述',description:'由 AI 生成话题，练习连续表达。'},
  {id:'part3',title:'Part 3 · AI 模拟讨论',description:'由 AI 提问，讨论和解释观点。'},
];
const topicContext: Record<string,string> = {
  'official-speaking-1':'本题围绕你的家乡或村庄，描述它是怎样的地方。',
  'official-speaking-2':'本题围绕你拥有的一件重要物品，说明其重要性。此处展示官方主问题节选。',
  'official-speaking-3':'本题讨论价值观的变化，比较现在与父母那一代的情况。',
};
type Provider='deepseek'|'qwen';
interface Message { role:'user'|'assistant'; content:string }
interface Recognition {
  lang:string; continuous:boolean; interimResults:boolean;
  onresult:((event:{results:{[index:number]:{[index:number]:{transcript:string}}}})=>void)|null;
  onerror:((event:{error:string})=>void)|null; onend:(()=>void)|null;
  start():void;stop():void;abort():void;
}
const speechWindow=window as unknown as { SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition };
const RecognitionClass=speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
const provider=ref<Provider>('deepseek');
const apiKey=ref('');
const model=ref('deepseek-flash');
const mode=ref('part1');
const showKey=ref(false);
const autoSpeak=ref(readPreference('ielts-speaking-auto-speak',true));
const messages=ref<Message[]>([]);
const input=ref('');
const error=ref('');
const busy=ref(false);
const listening=ref(false);
const chat=ref<HTMLElement|null>(null);
const feedbackElement=ref<HTMLElement|null>(null);
const transcriptNotice=ref('');
const savedNotice=ref('');
const draftNotice=ref('');
const draftError=ref('');
const undoDraft=ref<SpeakingDraftSnapshot>();
const undoChat=ref<{ answer:string;messages:Message[];sessionId?:string }>();
const assessment=ref<{ questionId:string;answer:string;result:SpeakingAssessment }>();
const staleAssessment=computed(()=>!!assessment.value && assessment.value.answer!==input.value.trim());
const wordCount=computed(()=>input.value.trim() ? input.value.trim().split(/\s+/).length : 0);
const configured=computed(()=>!!apiKey.value.trim() && !!model.value.trim());
let sessionId:string|undefined;
let recognition:Recognition|undefined;
let controller:AbortController|undefined;
let requestVersion=0;
let voicePrefix='';
let restoringDraft=false;
let switchingPractice=false;
let draftDirty=false;
const draftCache=new Map<string,{draft:SpeakingDraft;stored:boolean}>();

watch(autoSpeak,value=>savePreference('ielts-speaking-auto-speak',value));
watch(provider,()=>{apiKey.value='';model.value=provider.value==='deepseek'?'deepseek-flash':'qwen-plus';error.value='';});
watch(mode,()=>{
  if(switchingPractice)return;
  persistCurrentDraft();cancelActivity();
  restoringDraft=true;clearWorkspace();selectedOfficial.value=undefined;restoringDraft=false;
},{flush:'sync'});
watch(section,value=>{
  if(value!=='browse'){
    persistCurrentDraft();const wasBusy=busy.value;cancelActivity();
    if(wasBusy)error.value='本次请求已取消，回答已保留。';
  }
});
watch([input,assessment],()=>{
  if(restoringDraft)return;
  undoDraft.value=undefined;undoChat.value=undefined;draftDirty=true;persistCurrentDraft();
},{deep:true,flush:'sync'});
function stopVoice(){
  if(recognition){recognition.onend=null;recognition.onresult=null;recognition.onerror=null;recognition.abort();recognition=undefined;}
  listening.value=false;if('speechSynthesis' in window)window.speechSynthesis.cancel();
}
function speak(text:string){
  if(!('speechSynthesis' in window)){error.value='浏览器不支持语音朗读，可阅读文字。';return;}
  window.speechSynthesis.cancel();const speech=new SpeechSynthesisUtterance(text);speech.lang='en-US';speech.rate=.9;window.speechSynthesis.speak(speech);
}
function record(){
  if(!RecognitionClass || busy.value)return;
  if(listening.value){recognition?.stop();return;}
  stopVoice();error.value='';transcriptNotice.value='';voicePrefix=input.value;
  recognition=new RecognitionClass();recognition.lang='en-US';recognition.continuous=false;recognition.interimResults=false;
  recognition.onresult=event=>{input.value=[voicePrefix,event.results[0]?.[0]?.transcript||''].filter(Boolean).join(' ');transcriptNotice.value='语音已转为文字，可检查后提交。可再次录音补充回答。';};
  recognition.onerror=event=>{error.value=event.error==='not-allowed'?'请允许麦克风权限，或使用文字输入。':'语音识别失败，请重试或使用文字输入。';listening.value=false;};
  recognition.onend=()=>{listening.value=false;};
  try{recognition.start();listening.value=true;}catch{error.value='麦克风暂不可用，请使用文字输入。';}
}
function cancelActivity(){requestVersion++;controller?.abort();controller=undefined;busy.value=false;stopVoice();}
function clearWorkspace(){
  messages.value=[];input.value='';assessment.value=undefined;error.value='';savedNotice.value='';transcriptNotice.value='';sessionId=undefined;undoDraft.value=undefined;undoChat.value=undefined;draftNotice.value='';draftError.value='';draftDirty=false;
}
function currentSnapshot():SpeakingDraftSnapshot{
  return {answer:input.value,sessionId,assessment:assessment.value?{answer:assessment.value.answer,result:assessment.value.result}:undefined};
}
function persistCurrentDraft(){
  const exam=selectedOfficial.value;
  if(!exam||!draftDirty)return;
  let draft:SpeakingDraft;
  try{draft=parseSpeakingDraft({...currentSnapshot(),version:1,questionId:exam.id,updatedAt:Date.now(),previous:undoDraft.value},exam.id);}
  catch{draftError.value='草稿内容过长或格式异常，尚未保存。请复制回答备份后缩短内容。';return;}
  draftCache.set(exam.id,{draft,stored:false});
  try{
    localStorage.setItem(speakingDraftKey(exam.id),JSON.stringify(draft));
    draftCache.set(exam.id,{draft,stored:true});
    draftDirty=false;draftError.value='';draftNotice.value='草稿已自动保存到本机。';
    try{localStorage.setItem(speakingLastQuestionKey,exam.id);}
    catch{draftError.value='草稿已保存，但未能保存练习位置。下次请在题库中选择本题继续。';}
  }catch{draftError.value='草稿暂未保存，请复制回答备份，并检查浏览器存储空间或权限。';}
}
function restoreOfficialDraft(exam:OfficialExam){
  try{
    const cached=draftCache.get(exam.id);
    let draft=cached?.draft;
    if(!draft){
      const raw=localStorage.getItem(speakingDraftKey(exam.id));
      if(!raw)return;
      try{draft=parseSpeakingDraft(JSON.parse(raw),exam.id);}
      catch{draftError.value='本题草稿格式异常，未自动恢复。继续输入会保存为新草稿。';return;}
      draftCache.set(exam.id,{draft,stored:true});
    }
    input.value=draft.answer;assessment.value=draft.assessment?{questionId:exam.id,...draft.assessment}:undefined;sessionId=draft.sessionId;undoDraft.value=draft.previous;
    draftNotice.value=draft.previous&&!draft.answer&&!draft.assessment?'上次已清空回答，可以撤销。':draft.assessment?'已恢复本题回答和批改，可继续练习。':'已恢复本题草稿，可继续回答。';
    if(cached&&!cached.stored){draftDirty=true;draftError.value='本次回答已恢复，但尚未保存到本机。请复制备份，关闭页面后可能丢失。';}
  }catch{draftError.value='无法读取本机草稿，请检查浏览器存储权限。';}
}
function openOfficial(exam:OfficialExam){
  if(selectedOfficial.value?.id===exam.id){section.value='browse';return;}
  persistCurrentDraft();cancelActivity();
  restoringDraft=true;switchingPractice=true;
  clearWorkspace();mode.value=`part${exam.part}`;selectedOfficial.value=exam;restoreOfficialDraft(exam);
  switchingPractice=false;restoringDraft=false;section.value='browse';
  try{localStorage.setItem(speakingLastQuestionKey,exam.id);}
  catch{draftError.value='无法保存上次练习位置，请检查浏览器存储权限。';}
}
function openTraining(id:string){
  if(!selectedOfficial.value&&mode.value===id){section.value='browse';return;}
  persistCurrentDraft();cancelActivity();restoringDraft=true;switchingPractice=true;
  clearWorkspace();selectedOfficial.value=undefined;mode.value=id;
  switchingPractice=false;restoringDraft=false;section.value='browse';
}
function reset(){
  if(!input.value&&!assessment.value&&!messages.value.length)return;
  const previous=currentSnapshot();const oldMessages=messages.value.map(message=>({...message}));
  cancelActivity();restoringDraft=true;clearWorkspace();
  if(selectedOfficial.value)undoDraft.value=previous;
  else undoChat.value={answer:previous.answer,messages:oldMessages,sessionId:previous.sessionId};
  restoringDraft=false;draftDirty=true;persistCurrentDraft();
  if(!draftError.value)draftNotice.value=selectedOfficial.value?'回答已清空，可在继续输入前撤销。':'已开始新对话，可在继续输入前撤销。';
}
function undoReset(){
  if(selectedOfficial.value&&undoDraft.value){
    const snapshot=undoDraft.value;restoringDraft=true;
    input.value=snapshot.answer;assessment.value=snapshot.assessment?{questionId:selectedOfficial.value.id,...snapshot.assessment}:undefined;sessionId=snapshot.sessionId;undoDraft.value=undefined;
    restoringDraft=false;draftDirty=true;persistCurrentDraft();
    if(!draftError.value)draftNotice.value='已撤销清空，原回答已恢复。';
  }else if(!selectedOfficial.value&&undoChat.value){
    const snapshot=undoChat.value;restoringDraft=true;input.value=snapshot.answer;messages.value=snapshot.messages;sessionId=snapshot.sessionId;undoChat.value=undefined;restoringDraft=false;draftNotice.value='已恢复上一段对话。';
  }
}
function clearKey(){apiKey.value='';showKey.value=false;}
function saveSession(){
  if(assessment.value && selectedOfficial.value){
    const snapshot=assessment.value;
    const id=savePractice({skill:'speaking',title:selectedOfficial.value.title,summary:'官方样题节选 · 已批改',content:`原题：${selectedOfficial.value.starter}\n来源：${selectedOfficial.value.sourceUrl}\n\n我的回答：\n${snapshot.answer}\n\nAI 批改：\n${JSON.stringify(snapshot.result,null,2)}`},sessionId);
    if(id){sessionId=id;savedNotice.value='回答和批改结果已保存到练习记录。';draftDirty=true;persistCurrentDraft();}return;
  }
  if(!messages.value.length)return;
  const id=savePractice({skill:'speaking',title:trainingModes.find(item=>item.id===mode.value)?.title||'口语对话',summary:`${messages.value.filter(item=>item.role==='user').length} 轮表达`,content:messages.value.map(item=>`${item.role==='user'?'我':'AI 教练'}：${item.content}`).join('\n\n')},sessionId);
  if(id){sessionId=id;savedNotice.value='本次对话已保存到练习记录。';}
}
async function requestAI(opening=false){
  if(busy.value || listening.value)return;
  if(!configured.value){error.value='请先在设置中填写 API Key 和模型。';return;}
  const exam=selectedOfficial.value;
  const text=exam?input.value.trim():opening?'Please start our English speaking practice and ask me your first question.':input.value.trim();
  if(!text){error.value='请先填写或录入你的回答。';return;}
  if(text.length>4000 || (!exam && messages.value.length>=38)){error.value='回答过长或本轮对话已满，请缩短回答或开启新对话。';return;}
  stopVoice();busy.value=true;error.value='';savedNotice.value='';
  const version=++requestVersion;const aborter=new AbortController();controller=aborter;
  const history:Message[]=[...messages.value,{role:'user',content:text}];
  const question=exam?`${exam.title}\n主题说明：${topicContext[exam.id]||''}\nOfficial question: ${exam.starter}`:undefined;
  try{
    const response=await fetch('/api/speaking',{method:'POST',headers:{'Content-Type':'application/json'},signal:aborter.signal,body:JSON.stringify({provider:provider.value,apiKey:apiKey.value.trim(),model:model.value.trim(),mode:mode.value,action:exam?'assess':'chat',officialQuestion:question,messages:exam?[{role:'user',content:text}]:history})});
    const result=await response.json() as {assessment?:unknown;reply?:string;error?:string};
    if(version!==requestVersion || aborter.signal.aborted)return;
    if(!response.ok)throw new Error(result.error||'请求失败，请检查 API 设置。');
    if(exam){
      const parsed=parseAssessment(result.assessment);assessment.value={questionId:exam.id,answer:text,result:parsed};saveSession();
      if(autoSpeak.value)speak(parsed.improvedAnswer);
      nextTick(()=>feedbackElement.value?.scrollIntoView({behavior:'smooth',block:'start'}));
    }else{
      if(typeof result.reply!=='string'||!result.reply.trim())throw new Error('未收到有效回复，请重试。');
      messages.value=[...history,{role:'assistant',content:result.reply}];input.value='';transcriptNotice.value='';
      if(autoSpeak.value)speak(result.reply);
      nextTick(()=>chat.value?.scrollTo({top:chat.value.scrollHeight,behavior:'smooth'}));
    }
  }catch(reason){if(version===requestVersion)error.value=reason instanceof Error&&reason.name==='AbortError'?'本次请求已取消，回答已保留。':reason instanceof Error?reason.message:'请求失败，请重试。';}
  finally{if(version===requestVersion){busy.value=false;controller=undefined;}}
}
restoringDraft=true;switchingPractice=true;
try{
  const previousId=localStorage.getItem(speakingLastQuestionKey);
  const previous=officialTopics.find(exam=>exam.id===previousId);
  if(previous)selectedOfficial.value=previous;
  if(selectedOfficial.value){mode.value=`part${selectedOfficial.value.part}`;restoreOfficialDraft(selectedOfficial.value);}
  if(previousId&&!previous)draftError.value='上次练习题目已不可用，已打开第一题。';
}catch{draftError.value='无法读取本机草稿，请检查浏览器存储权限。';}
switchingPractice=false;restoringDraft=false;
window.addEventListener('pagehide',persistCurrentDraft);
onBeforeUnmount(()=>{persistCurrentDraft();window.removeEventListener('pagehide',persistCurrentDraft);cancelActivity();clearKey();});
</script>

<template>
  <IeltsLayout title="口语" v-model:section="section" @back="emit('back')">
    <section v-if="section==='overview'" class="panel"><h2>📊 学习总览</h2><p>直接阅读题目、完成回答，提交后查看 AI 批改。</p><div class="overview-grid"><div class="metric">官方原题节选<strong>{{ officialTopics.length }}</strong>Part 1–3 主问题</div><div class="metric">已保存练习<strong>{{ records.length }}</strong>条记录</div><div class="metric">API 状态<strong style="font-size:20px">{{ configured?'已填写':'待配置' }}</strong>{{ configured?'可以提交回答批改':'先在设置中填写密钥' }}</div></div><div class="toolbar"><button @click="section='browse'">{{ input || assessment ? '继续上次练习 →' : '进入题库浏览 →' }}</button><button @click="section='settings'">API 设置</button></div></section>
    <PracticeRecords v-else-if="section==='records'" skill="speaking" />
    <template v-else-if="section==='more'"><OfficialResources kind="speaking"/><section class="panel"><h2>✨ 数据工具</h2><button @click="exportPractice('speaking')">导出口语练习记录</button><p class="note">导出包含已保存回答和批改，不包含 API Key。</p></section></template>
    <section v-else-if="section==='settings'" class="panel"><h2>⚙️ 系统设置</h2><p><label><input v-model="autoSpeak" type="checkbox"> 自动朗读参考回答 / AI 回复</label></p><h3>API 设置</h3><div class="settings-grid"><label>服务商<select v-model="provider" :disabled="busy||listening"><option value="deepseek">DeepSeek</option><option value="qwen">通义千问 · 百炼北京</option></select></label><label>模型名称<input v-model="model" :disabled="busy" placeholder="输入已开通的模型名称"></label><label class="key-field">API Key<div class="key-input"><input v-model="apiKey" :disabled="busy" :type="showKey?'text':'password'" autocomplete="off" spellcheck="false" placeholder="输入当前服务商的 API Key"><button :aria-pressed="showKey" @click="showKey=!showKey">{{ showKey?'隐藏':'显示' }}</button><button :disabled="busy" @click="clearKey">清除</button></div></label></div><p class="note">密钥仅保留在当前模块内存中，退出模块或切换服务商后清除。发送时经本站后端转交服务商。API 调用按服务商规则计费。</p><p v-if="provider==='qwen'" class="note">请使用百炼北京地域的 API Key 和已开通的模型名称。</p></section>
    <section v-else-if="section==='browse'" class="panel">
      <h2>📚 题库浏览</h2><input v-model="search" class="search" placeholder="搜索题目或关键词" aria-label="搜索口语题目">
      <div class="browse-grid"><article v-for="exam in filteredTopics" :key="exam.id" class="exam-card"><span>官方样题节选 · Part {{ exam.part }}</span><h3>{{ exam.title }}</h3><p class="question-preview" lang="en">{{ exam.starter }}</p><button :disabled="busy||listening" @click="openOfficial(exam)">开始答题</button></article></div><p v-if="!filteredTopics.length">没有匹配的官方题目。</p>
      <section v-if="selectedOfficial" class="native-exam" aria-label="口语原生答题页面">
        <header class="exam-header"><h3>{{ selectedOfficial.title }}</h3><span>{{ busy?'正在批改…':staleAssessment?'待重新批改':assessment?'已批改':'准备回答' }}</span><button :disabled="busy||listening||(!input&&!assessment)" @click="reset">重新回答</button></header>
        <div class="exam-intro">Part {{ selectedOfficial.part }} · 根据题目作答，提交后查看批改结果</div>
        <div class="exam-columns"><div class="native-question"><span class="question-number">Question {{ officialTopics.findIndex(exam=>exam.id===selectedOfficial?.id)+1 }}</span><h3 lang="en">{{ selectedOfficial.starter }}</h3><p>{{ topicContext[selectedOfficial.id] }}</p><p class="note">官方样题主问题节选，非完整题卡。</p><div class="toolbar"><button @click="speak(selectedOfficial.starter||'')">🔊 朗读题目</button><a :href="selectedOfficial.sourceUrl" target="_blank" rel="noopener noreferrer">官方来源 ↗</a></div></div>
        <div class="native-answer"><form @submit.prevent="requestAI()"><label for="official-speaking-answer">你的回答</label><textarea id="official-speaking-answer" v-model="input" rows="10" maxlength="4000" :disabled="busy||listening" placeholder="用英文回答，可录音转写或直接输入…"></textarea><p class="note">{{ wordCount }} 词 · 请检查语音转写后再提交。</p><p v-if="draftNotice" class="draft-status" role="status">{{ draftNotice }}</p><p v-else class="note">回答和批改会自动保存到本机，切题或离开后可继续。</p><p v-if="draftError" class="error" role="alert">{{ draftError }}</p><p v-if="undoDraft" class="undo-action"><button type="button" :disabled="busy||listening" @click="undoReset">撤销清空</button><span class="note">继续输入后将保留新回答。</span></p><p v-if="listening" role="status">正在听，请说英语。再次点击可停止录音。</p><p v-if="transcriptNotice" role="status">{{ transcriptNotice }}</p><div class="toolbar"><button type="button" :disabled="busy||!RecognitionClass" @click="record">{{ listening?'停止录音':'🎙️ 麦克风输入' }}</button><button class="submit-answer" :disabled="busy||listening||!input.trim()||!configured">{{ busy?'批改中…':assessment?'重新提交批改':'提交回答并批改' }}</button><button v-if="busy" type="button" @click="controller?.abort()">取消请求</button></div></form><p v-if="!configured" class="note">请先<button @click="section='settings'">配置 API</button>，再提交批改。</p><p v-if="error" role="alert" class="error">{{ error }}</p><p v-if="!RecognitionClass" class="note">当前浏览器不支持语音识别，可直接输入回答。</p><div v-if="assessment" ref="feedbackElement"><SpeakingFeedback :assessment="assessment.result" :stale="staleAssessment" @speak="speak"/><button :disabled="staleAssessment" @click="saveSession">保存本次批改</button></div></div></div>
        <footer class="exam-footer"><button v-for="(exam,index) in officialTopics" :key="exam.id" :class="{current:selectedOfficial.id===exam.id}" :disabled="busy||listening" :aria-label="`选择第${index+1}题`" @click="openOfficial(exam)">{{ index+1 }}</button></footer>
      </section>
      <details class="other-training"><summary>其他 AI 模拟对话</summary><p class="note">以下为 AI 对话训练，和上方官方原题答题分开。</p><div class="browse-grid"><article v-for="item in trainingModes" :key="item.id" class="exam-card"><h3>{{ item.title }}</h3><p>{{ item.description }}</p><button :disabled="busy||listening" @click="openTraining(item.id)">进入对话</button></article></div></details>
      <section v-if="!selectedOfficial" class="chat-practice"><div class="toolbar"><label>训练方式<select v-model="mode" :disabled="busy||listening"><option v-for="item in trainingModes" :key="item.id" :value="item.id">{{ item.title }}</option></select></label><button :disabled="busy||listening||(!messages.length&&!input)" @click="reset">新对话</button><button v-if="undoChat" :disabled="busy||listening" @click="undoReset">撤销新对话</button><button :disabled="busy||listening||!messages.length" @click="saveSession">保存本次练习</button></div><div ref="chat" class="chat" aria-live="polite"><div v-if="!messages.length" class="empty"><p>让 AI 先提问，或输入英文开始对话。</p><button :disabled="busy||listening||!configured" @click="requestAI(true)">让 AI 开始提问</button></div><article v-for="(message,index) in messages" :key="index" :class="message.role"><strong>{{ message.role==='user'?'我':'AI 教练' }}</strong><p>{{ message.content }}</p><button v-if="message.role==='assistant'" @click="speak(message.content)">朗读回复</button></article><p v-if="busy" role="status">AI 正在回复…</p></div><form @submit.prevent="requestAI()"><label for="spoken-text">你的英文表达</label><textarea id="spoken-text" v-model="input" rows="4" maxlength="4000" :disabled="busy||listening"></textarea><p v-if="listening" role="status">正在听…</p><div class="toolbar"><button type="button" :disabled="busy||!RecognitionClass" @click="record">{{ listening?'停止录音':'🎙️ 麦克风输入' }}</button><button :disabled="busy||listening||!configured||!input.trim()">发送给 AI</button><button v-if="busy" type="button" @click="controller?.abort()">取消请求</button></div></form><p v-if="error" role="alert" class="error">{{ error }}</p><p v-if="!configured"><button @click="section='settings'">配置 API</button></p></section>
      <p class="note">语音转写使用浏览器语音服务；部分浏览器会把音频交给其语音服务处理。语音通常需要 HTTPS 或 localhost。</p>
    </section>
    <p v-if="savedNotice" role="status">{{ savedNotice }}</p><p v-if="draftError && section!=='browse'" class="error" role="alert">{{ draftError }}</p><p v-if="historyError" role="alert">{{ historyError }}</p>
  </IeltsLayout>
</template>

<style scoped>
h2 {font-size:22px;margin-bottom:18px;}h3 {font-size:18px;}p {line-height:1.75;margin:12px 0;}.panel {margin-bottom:24px;}.toolbar {display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin:14px 0;}button {border:0;background:#5b5ce2;color:white;border-radius:8px;padding:10px 14px;cursor:pointer;}button:disabled {opacity:.5;cursor:default;}input:not([type=checkbox]),select,textarea {font:inherit;border:1px solid #cbd5e1;border-radius:8px;padding:11px;max-width:100%;}textarea {width:100%;resize:vertical;line-height:1.8;margin:12px 0;}.settings-grid {display:grid;grid-template-columns:1fr 1fr;gap:16px;}.settings-grid label {display:grid;gap:8px;}.key-field {grid-column:1 / -1;}.key-input {display:flex;gap:8px;flex-wrap:wrap;}.key-input input {flex:1;min-width:160px;}.note {font-size:12px;color:#64748b;}.draft-status {font-size:12px;color:#26714a;}.undo-action {display:flex;align-items:center;flex-wrap:wrap;gap:10px;}.error {color:#b42318;}.question-preview {color:#475569;overflow-wrap:anywhere;}
.native-exam {border:1px solid #c9c9c9;border-radius:10px;overflow:hidden;background:white;margin:28px 0;font-family:Arial,sans-serif;}.exam-header {display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:14px 20px;border-bottom:1px solid #c9c9c9;}.exam-header span {font-size:13px;color:#64748b;}.native-exam button {border:1px solid #c9c9c9;background:white;color:#334155;border-radius:6px;padding:9px 12px;}.exam-intro {padding:10px 20px;background:#f2f3ef;border-bottom:1px solid #c9c9c9;font-size:14px;}.exam-columns {display:grid;grid-template-columns:1fr 1.2fr;}.native-question {padding:28px;border-right:1px solid #c9c9c9;}.native-question h3 {font-size:23px;line-height:1.6;margin:20px 0;overflow-wrap:anywhere;}.question-number {font-size:13px;color:#64748b;}.native-answer {padding:24px;min-width:0;max-height:80vh;overflow-y:auto;}.native-question a {color:#2c6c9a;font-size:13px;}.native-exam .submit-answer {background:#418fc6;border-color:#418fc6;color:white;}.exam-footer {display:flex;gap:10px;padding:16px 20px;border-top:1px solid #c9c9c9;}.exam-footer .current {outline:2px solid #418fc6;}.other-training {margin:22px 0;}.other-training summary {cursor:pointer;font-weight:600;}.chat {max-height:450px;overflow:auto;background:#f7f8fc;border-radius:12px;padding:16px;margin:16px 0;}.chat article {padding:16px;border-radius:12px;background:white;margin:10px 0;}.chat article.user {background:#eeeeff;}.chat article p {white-space:pre-wrap;overflow-wrap:anywhere;}.empty {text-align:center;padding:24px;}@media(max-width:800px){.exam-columns {grid-template-columns:1fr;}.native-question {border-right:0;border-bottom:1px solid #c9c9c9;}.native-answer {max-height:none;}}@media(max-width:600px){.settings-grid {grid-template-columns:1fr;}.native-question,.native-answer {padding:18px;}}
</style>
