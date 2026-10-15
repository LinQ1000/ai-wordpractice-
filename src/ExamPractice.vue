<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue';
import OfficialResources from './components/OfficialResources.vue';
import ComputerPractice from './components/ComputerPractice.vue';
import { officialBank, type OfficialExam } from './data/officialBank';
import IeltsLayout, { type Section } from './components/IeltsLayout.vue';
import PracticeRecords from './components/PracticeRecords.vue';
import { practiceHistory, historyError, savePractice, exportPractice, readPreference, savePreference } from './stores/practiceHistory';
import { parseBank, mergeBank, normalizeAnswer, type Exam } from './lib/questionBank';
const props = defineProps<{ kind: 'listening' | 'writing' }>();
const emit = defineEmits<{ back: [] }>();
const section = ref<Section>('overview');
const search = ref('');
const officialExams = computed(()=>officialBank.filter(exam=>exam.skill===props.kind));
const filteredOfficial = computed(()=>officialExams.value.filter(exam=>(exam.title+' '+exam.source).toLowerCase().includes(search.value.toLowerCase())));
const activeOfficial = ref<OfficialExam>();
function openOfficial(exam:OfficialExam) { selectedId.value='';activeOfficial.value=exam; }
const sessionId = ref<string | undefined>();
const records = computed(() => practiceHistory.value.filter(r=>r.skill===props.kind));
const filteredExams = computed(() => exams.value.filter(e=>(e.title+' '+e.source).toLowerCase().includes(search.value.toLowerCase())));
const showTimer = ref(readPreference(`ielts-${props.kind}-show-timer`,true));
watch(showTimer, value=>{ savePreference(`ielts-${props.kind}-show-timer`,value); if(!value) running.value=false; });
function openExam(id: string) { activeOfficial.value=undefined;selectedId.value=id; section.value='browse'; }
watch(section, value=>{ if(value!=='browse') running.value=false; });
const bank = ref<Exam[]>([]);
const message = ref('');
try { const raw = localStorage.getItem('ielts-question-bank'); if (raw) bank.value = parseBank(JSON.parse(raw)); }
catch { message.value = '已保存题库无法读取，请重新导入。'; }
const exams = computed(() => bank.value.filter(exam => exam.kind === props.kind));
const selectedId = ref('');
const selected = computed(() => exams.value.find(exam => exam.id === selectedId.value));
const answers = ref<Record<string,string>>({});
const essay = ref('');
const submitted = ref(false);
const audioError = ref(false);
const syncUrl = ref('');
const syncing = ref(false);
const running = ref(false);
const seconds = ref(0);
let startTime = 0;
const timer = setInterval(() => { if (running.value) seconds.value = Math.floor((Date.now()-startTime)/1000); },1000);
onUnmounted(() => clearInterval(timer));
const timerLabel = computed(() => `${String(Math.floor(seconds.value/60)).padStart(2,'0')}:${String(seconds.value%60).padStart(2,'0')}`);
const wordCount = computed(() => essay.value.trim() ? essay.value.trim().split(/\s+/).length : 0);
const minimumWords = computed(() => selected.value?.kind === 'writing' && selected.value.task === 1 ? 150 : 250);
function persist(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { message.value = '保存失败，浏览器存储空间可能不足。请导出或复制当前内容。'; return false; }
}
function draftKey() { return `ielts-practice-draft:${props.kind}:${selectedId.value}`; }
let restoring = false;
watch(selectedId, () => {
  restoring = true; sessionId.value=undefined;
  answers.value = {}; essay.value = ''; submitted.value = false; audioError.value = false; running.value = false; seconds.value = 0;
  try {
    const draft = JSON.parse(localStorage.getItem(draftKey()) || 'null');
    if (draft && typeof draft.essay === 'string') essay.value = draft.essay;
    if (draft?.answers && typeof draft.answers === 'object' && !Array.isArray(draft.answers) && Object.values(draft.answers).every(value => typeof value === 'string')) answers.value = draft.answers;
  } catch { message.value = '草稿无法读取。'; }
  restoring = false;
}, { flush: 'sync' });
watch([essay, answers], () => { if (selected.value && !restoring) persist(draftKey(), { essay: essay.value, answers: answers.value }); }, { deep: true, flush: 'sync' });
function correct(id: string, acceptable: string[]) { return acceptable.some(a => normalizeAnswer(a) === normalizeAnswer(answers.value[id] || '')); }
const score = computed(() => selected.value?.kind === 'listening' ? selected.value.questions.filter(q=>correct(q.id,q.answers)).length : 0);
function accept(incoming: Exam[]) {
  const merged = mergeBank(bank.value,incoming);
  if (persist('ielts-question-bank', { version: 1, exams: merged })) { if (incoming.some(exam => exam.id === selectedId.value)) selectedId.value = ''; bank.value = merged; message.value = `已合并 ${incoming.length} 套题，当前题库共 ${merged.length} 套。`; }
}
async function importFile(event: Event) {
  const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
  try { accept(parseBank(JSON.parse(await file.text()))); }
  catch (error) { message.value = error instanceof Error ? error.message : '导入失败。'; }
  input.value = '';
}
async function sync() {
  syncing.value = true;
  try {
    const url = new URL(syncUrl.value, location.href);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('请输入 HTTP 或 HTTPS 题库地址。');
    const response = await fetch(url, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
    if (!response.ok) throw new Error(`下载失败（${response.status}）`);
    accept(parseBank(await response.json()));
  } catch(error) { message.value = `同步失败：${error instanceof Error ? error.message : '请检查地址和跨域访问设置。'}`; }
  finally { syncing.value = false; }
}
function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type })); const link = document.createElement('a'); link.href=url; link.download=name; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportBank() { download('ielts-question-bank.json',JSON.stringify({version:1,exams:bank.value},null,2),'application/json'); }
function finish() {
  if (!selected.value) return;
  if (selected.value.kind==='writing' && !essay.value.trim()) { message.value='请先填写作文再完成练习。'; return; }
  submitted.value = true; running.value = false; persist(draftKey(),{ essay:essay.value, answers:answers.value });
  const exam = selected.value;
  const content = exam.kind==='writing' ? essay.value : exam.questions.map(q=>`${q.prompt}\n我的答案：${answers.value[q.id] || '未作答'}\n参考答案：${q.answers.join(' / ')}`).join('\n\n');
  sessionId.value=savePractice({skill:props.kind,title:exam.title,summary:exam.kind==='writing' ? `${wordCount.value} 词 · ${timerLabel.value}` : `${score.value}/${exam.questions.length} · ${timerLabel.value}`,content},sessionId.value);
}
</script>

<template>
  <IeltsLayout :title="kind === 'listening' ? '听力' : '写作'" v-model:section="section" @back="emit('back')">
    <section v-if="section === 'overview'" class="panel"><h2>📊 学习总览</h2><p>选择题目开始练习，完成后查看练习记录。</p><div class="overview-grid"><div class="metric">可练习题库<strong>{{ exams.length + officialExams.length }}</strong>官方样题与导入题目</div><div class="metric">已完成练习<strong>{{ records.length }}</strong>条记录</div><div class="metric">最近练习<strong style="font-size:18px">{{ records[0]?.title || '尚未开始' }}</strong>{{ records[0]?.summary || '开始第一组练习吧' }}</div></div><button @click="section='browse'">进入题库浏览 →</button></section>
    <PracticeRecords v-else-if="section === 'records'" :skill="kind" />
    <template v-else-if="section === 'more'"><OfficialResources :kind="kind" /><section class="panel"><h2>✨ 数据工具</h2><div class="actions"><button @click="exportBank">导出题库</button><button @click="exportPractice(kind)">导出练习记录</button><a href="/question-banks/README.md" target="_blank" rel="noopener">题库格式说明</a></div></section></template>
    <section v-else-if="section === 'settings'" class="panel"><h2>⚙️ 练习设置</h2><p><label><input v-model="showTimer" type="checkbox"> 显示练习计时</label></p><p>练习计时和草稿保存在当前练习中；切换到其他栏目时暂停计时。</p><p>题库与完成记录保存在当前浏览器，可在“更多”中导出。</p></section>
    <template v-else-if="section === 'browse'">
    <section v-if="!activeOfficial" class="bank-panel">
      <h2>📚 题库浏览 · {{ exams.length + officialExams.length }} 套</h2>
      <input v-model="search" class="search" placeholder="搜索题目或来源" aria-label="搜索题库">
      <h3>官方原题样卷</h3><p>在线嵌入原题 PDF，使用本站机考答题区；题目与音频来自 IELTS.org。</p>
      <div class="browse-grid"><article v-for="exam in filteredOfficial" :key="exam.id" class="exam-card"><span>官方样题</span><h3>{{ exam.title }}</h3><p>{{ exam.source }} · {{ exam.skill === 'writing' ? exam.minutes + ' 分钟' : exam.questionNumbers?.length + ' 题' }}</p><button @click="openOfficial(exam)">进入机考练习</button></article></div>
      <h3 v-if="exams.length">我的导入题库</h3>
      <div class="browse-grid"><article v-for="exam in filteredExams" :key="exam.id" class="exam-card"><h3>{{ exam.title }}</h3><p>{{ exam.source }}</p><button @click="openExam(exam.id)">开始练习</button></article></div>
      <p v-if="!filteredOfficial.length && !filteredExams.length">没有匹配的题目。</p>
      <p>导入已有题库，或从题库 JSON 地址同步。相同题目 ID 将更新，其他题目保留。</p>
      <div class="actions"><label class="file-button">导入 JSON 题库<input type="file" accept=".json,application/json" @change="importFile"></label><button @click="exportBank">导出题库</button><a href="/question-banks/README.md" target="_blank">题库格式说明</a></div>
      <form class="actions" @submit.prevent="sync"><input v-model="syncUrl" type="text" required placeholder="https://…/question-bank.json" aria-label="题库同步地址"><button :disabled="syncing">{{ syncing ? '同步中…' : '同步题库' }}</button></form>
      <p v-if="message" role="status">{{ message }}</p>
      <p v-if="!exams.length">尚未导入{{ kind === 'listening' ? '听力题库' : '写作题库' }}。可以到“更多”使用官方资源，也可导入 JSON 在本站练习。</p>
      <label v-else>选择试题 <select v-model="selectedId"><option value="">请选择</option><option v-for="exam in exams" :key="exam.id" :value="exam.id">{{ exam.title }}</option></select></label>
    </section>
    <ComputerPractice v-if="activeOfficial" :key="activeOfficial.id" :exam="activeOfficial" @close="activeOfficial=undefined" />
    <section v-else-if="selected" :key="selected.id" class="practice-panel">
      <h2>{{ selected.title }}</h2><p>来源：{{ selected.source }}</p>
      <div v-if="showTimer" class="actions"><span>用时 {{ timerLabel }}</span><button @click="running = !running; startTime = Date.now() - seconds * 1000">{{ running ? '暂停计时' : '开始计时' }}</button></div>
      <template v-if="selected.kind === 'listening'">
        <audio :src="selected.audioUrl" controls preload="metadata" @error="audioError = true"></audio>
        <p v-if="audioError" role="alert">音频无法加载，请检查题库中的 audioUrl 或本地音频文件。</p>
        <form @submit.prevent="finish"><div v-for="(q, index) in selected.questions" :key="q.id" class="question"><label :for="'question-'+index">{{ index+1 }}. {{ q.prompt }}</label><input :id="'question-'+index" v-model="answers[q.id]" :readonly="submitted" autocomplete="off"><p v-if="submitted" :class="correct(q.id,q.answers) ? 'correct' : 'incorrect'">{{ correct(q.id,q.answers) ? '正确' : '待订正' }} · 参考答案：{{ q.answers.join(' / ') }}</p></div><button :disabled="submitted">提交答案</button></form>
        <p v-if="submitted" role="status">得分 {{ score }} / {{ selected.questions.length }}（按题库答案核对）</p><button v-if="submitted" @click="submitted = false">继续订正</button>
      </template>
      <template v-else>
        <p>Task {{ selected.task }} · 建议至少 {{ minimumWords }} 词</p><p class="prompt">{{ selected.prompt }}</p><img v-if="selected.imageUrl" :src="selected.imageUrl" alt="写作题目图表">
        <textarea v-model="essay" rows="16" placeholder="Write your answer here…" aria-label="写作答案"></textarea>
        <p>{{ wordCount }} 词 · {{ wordCount >= minimumWords ? '已达到建议词数' : `距离建议词数还差 ${minimumWords-wordCount} 词` }} · 草稿自动保存</p>
        <div class="actions"><button @click="finish">完成本次写作</button><button @click="download('ielts-writing.txt', selected.title+'\n\n'+essay, 'text/plain')">导出作文</button></div>
        <p v-if="submitted" role="status">本次写作已保存。可继续修改或导出作文。</p>
      </template>
    </section>
    </template>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="historyError" role="alert">{{ historyError }}</p>
  </IeltsLayout>
</template>

<style scoped>
.exam-page { max-width: 1050px; margin: auto; padding: 28px 20px; }
header,.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 18px; }
h1 { font-size: 26px; } h2 { font-size: 20px; } p { margin: 14px 0; line-height: 1.7; }
.bank-panel,.practice-panel { padding: 26px; background: white; border: 1px solid #e8eaf0; border-radius: 18px; margin-bottom: 24px; }
button,.file-button { display: inline-block; border: none; background: #5b5ce2; color: white; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; }
button:disabled { opacity: .5; cursor: default; }.file-button input { display: block; max-width: 220px; margin-top: 6px; }
input,select,textarea { padding: 12px; border: 1px solid #d8dbe5; border-radius: 8px; font: inherit; max-width: 100%; }
.actions input { flex: 1; min-width: 180px; } textarea { width: 100%; resize: vertical; line-height: 1.8; } audio { width: 100%; margin: 18px 0; }
.question { display: grid; gap: 10px; padding: 18px 0; border-bottom: 1px solid #eee; }.correct { color: #237343; }.incorrect { color: #b44032; }.prompt { white-space: pre-wrap; } img { max-width: 100%; }
</style>
