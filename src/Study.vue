<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import basic from './data/basic.json';
import { matchesSpelling, spellingRating } from './lib/spelling';
import { parseStudyPreferences, parseStudyDraft, studyDraftKey, type WordList, type Exercise, type StudyPreferences, type StudyDraft, type PendingAnswer } from './lib/studySession';
import { selectWords, recordAnswer, storageWarning, batchSize, type Word, type Mode, type Rating } from './stores/learning';
const props = defineProps<{ mode: Mode }>();
const emit = defineEmits<{ back: [] }>();
const titles = { study: '今日单词', review: '到期复习', mistakes: '错词巩固' };
const listNames = { ielts: 'IELTS 核心词汇', month: '基础 · 月份', week: '基础 · 星期', season: '基础 · 季节' };
const words = ref<Word[]>([]);
const wordList = ref<WordList>('ielts');
const includeLearned = ref(false);
const exercise = ref<Exercise>('spelling');
const typedWord = ref('');
const spellingInput = ref<HTMLInputElement | null>(null);
const wordCard = ref<HTMLElement | null>(null);
const attempts = ref(0);
const revealed = ref(false);
const spellingCorrect = ref(false);
const feedback = ref('');
const firstTryCorrect = ref(0);
const spellingCompleted = ref(0);
const showAnswer = ref(false);
const completed = ref(0);
const loading = ref(true);
const error = ref('');
const recognized = ref(0);
const sessionNotice = ref('');
const saveError = ref('');
const speechNotice = ref('');
const pending = ref<PendingAnswer>();
let sessionId = '';
let activeKey = '';
let started = Date.now();
let elapsedSeconds = 0;
let restoring = false;
let loadVersion = 0;
let answerLocked = false;
let speechVersion = 0;
const preferencesKey = () => `ai-vocabulary-study-preferences:${props.mode}`;
const settings = (): StudyPreferences => ({ wordList: wordList.value, exercise: exercise.value, includeLearned: props.mode === 'study' && includeLearned.value });
const finished = computed(() => !loading.value && words.value.length > 0 && completed.value >= words.value.length);
const currentWord = computed(() => words.value[completed.value]);
const progress = computed(() => words.value.length ? Math.round(completed.value / words.value.length * 100) : 0);
const emptyCopy = computed(() => props.mode === 'review'
  ? { title: '这份词库暂时没有到期单词', text: '已学单词会在到期后出现。你可以切换词库查看，或返回首页学习新词。' }
  : props.mode === 'mistakes'
    ? { title: '这份词库暂时没有错词', text: '不认识、模糊或查看答案后拼对的单词会进入错词巩固。可以切换词库，或返回首页继续学习。' }
    : { title: '这份词库暂时没有待学单词', text: '可以勾选“包含已学词”再练一次，切换其他词库，或返回首页。' });
function cancelSpeech() { speechVersion++; if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }
function resetSpelling() {
  typedWord.value = ''; attempts.value = 0; revealed.value = false;
  spellingCorrect.value = false; feedback.value = ''; showAnswer.value = false; speechNotice.value = '';
  nextTick(() => { if (!finished.value) { if (exercise.value === 'spelling') spellingInput.value?.focus(); else wordCard.value?.focus(); } });
}
function savePreferences() {
  try { localStorage.setItem(preferencesKey(), JSON.stringify(settings())); }
  catch { saveError.value = '浏览器无法保存练习偏好，退出后可能无法恢复。'; }
}
function restorePreferences() {
  try {
    const value = parseStudyPreferences(JSON.parse(localStorage.getItem(preferencesKey()) || 'null'));
    if (value) { wordList.value = value.wordList; exercise.value = value.exercise; includeLearned.value = props.mode === 'study' && value.includeLearned; }
  } catch { sessionNotice.value = '练习偏好无法读取，已使用默认设置。'; }
}
function snapshot(): StudyDraft {
  return { version: 1, mode: props.mode, ...settings(), sessionId, wordIds: words.value.map(word => word.word), completed: completed.value, recognized: recognized.value, spellingCompleted: spellingCompleted.value, firstTryCorrect: firstTryCorrect.value, typedWord: typedWord.value, attempts: attempts.value, revealed: revealed.value, spellingCorrect: spellingCorrect.value, showAnswer: showAnswer.value, elapsedSeconds: Math.min(300, elapsedSeconds + Math.max(0, (Date.now()-started)/1000)), ...(pending.value ? { pending: pending.value } : {}) };
}
function saveSession() {
  if (restoring || loading.value || !activeKey || !words.value.length) return;
  try { localStorage.setItem(activeKey, JSON.stringify(snapshot())); saveError.value = ''; }
  catch { saveError.value = '本次输入未能保存，请保留页面；浏览器存储空间可能不足。'; }
}
watch([typedWord, attempts, revealed, spellingCorrect, showAnswer], saveSession, { flush: 'sync' });
function applyPending() {
  const submission = pending.value;
  if (!submission || submission.word !== currentWord.value?.word) return;
  recordAnswer(submission.word, submission.rating, submission.seconds, submission.at, submission.id);
  if (submission.rating === 'easy') recognized.value++;
  if (submission.exercise === 'spelling') {
    spellingCompleted.value++;
    if (submission.rating === 'easy') firstTryCorrect.value++;
  }
  completed.value++; pending.value = undefined; elapsedSeconds = 0; started = Date.now(); resetSpelling();
}
function restoreDraft(draft: StudyDraft, data: Word[]) {
  const vocabulary = new Map(data.map(word => [word.word, word]));
  words.value = draft.wordIds.map(word => vocabulary.get(word)!);
  sessionId = draft.sessionId; completed.value = draft.completed; recognized.value = draft.recognized;
  spellingCompleted.value = draft.spellingCompleted; firstTryCorrect.value = draft.firstTryCorrect;
  typedWord.value = draft.typedWord; attempts.value = draft.attempts; revealed.value = draft.revealed;
  spellingCorrect.value = draft.spellingCorrect; showAnswer.value = draft.showAnswer; elapsedSeconds = draft.elapsedSeconds;
  pending.value = draft.pending; started = Date.now();
  if (spellingCorrect.value) feedback.value = '已恢复拼写正确的单词，点击下一词即可继续，不会重复计分。';
  else if (revealed.value) feedback.value = '已恢复查看答案的状态，请亲手输入一遍。';
  else if (attempts.value) feedback.value = `已恢复本词 ${attempts.value} 次尝试，可以继续修改。`;
  applyPending();
}
async function load(fresh = false) {
  const version = ++loadVersion;
  loading.value = true; error.value = ''; cancelSpeech(); speechNotice.value = '';
  activeKey = '';
  try {
    let data: Word[];
    if (wordList.value === 'ielts') {
      const response = await fetch('/ielts/assets/wordlists/ielts_core.json');
      if (!response.ok) throw new Error();
      const value: unknown = await response.json();
      if (!Array.isArray(value) || !value.every(word => word && typeof word.word === 'string' && typeof word.meaning === 'string')) throw new Error();
      data = value as Word[];
    } else data = basic[wordList.value];
    if (version !== loadVersion) return;
    const key = studyDraftKey(props.mode, settings());
    let draft: StudyDraft | undefined;
    let invalidDraft = false;
    if (!fresh) {
      try { const raw = localStorage.getItem(key); if (raw) { draft = parseStudyDraft(JSON.parse(raw), props.mode, settings(), data); invalidDraft = !draft; } }
      catch { invalidDraft = true; }
    }
    restoring = true;
    if (draft) {
      restoreDraft(draft, data);
      sessionNotice.value = completed.value >= words.value.length ? '已恢复上次完成的小组。点击“继续下一组”开始新练习。' : `已恢复上次练习：完成 ${completed.value} / ${words.value.length} 词，输入与尝试次数已保留。`;
    } else {
      words.value = includeLearned.value && props.mode === 'study' ? data.slice(0, batchSize.value) : selectWords(data, props.mode);
      completed.value = 0; recognized.value = 0; firstTryCorrect.value = 0; spellingCompleted.value = 0;
      sessionId = crypto.randomUUID(); pending.value = undefined; elapsedSeconds = 0; started = Date.now(); resetSpelling();
      sessionNotice.value = invalidDraft ? '上次练习数据不完整或词库已更新，已安全开始新组；已完成的学习记录仍保留。' : '输入与练习进度会自动保存；切换词库或练习方式后，切回来可接着练。';
    }
    activeKey = key;
  } catch { if (version === loadVersion) error.value = '词库加载失败，请检查网络后重试。'; }
  finally {
    if (version === loadVersion) { restoring = false; loading.value = false; saveSession(); nextTick(() => { if (exercise.value === 'spelling') spellingInput.value?.focus(); else wordCard.value?.focus(); }); }
  }
}
function changeExercise(event: Event) {
  saveSession(); exercise.value = (event.target as HTMLSelectElement).value as Exercise; savePreferences(); void load();
}
function changeWordList(event: Event) {
  saveSession(); wordList.value = (event.target as HTMLSelectElement).value as WordList; savePreferences(); void load();
}
function changeIncludeLearned(event: Event) {
  saveSession(); includeLearned.value = (event.target as HTMLInputElement).checked; savePreferences(); void load();
}
function checkSpelling() {
  if (!currentWord.value || spellingCorrect.value || finished.value || loading.value) return;
  if (!typedWord.value.trim()) { feedback.value = '请先输入单词。'; return; }
  attempts.value++; spellingCorrect.value = matchesSpelling(typedWord.value, currentWord.value.word);
  feedback.value = spellingCorrect.value ? '拼写正确！按 Enter 或点击下一词继续。' : '还差一点，请检查拼写后再试一次。';
  if (spellingCorrect.value) showAnswer.value = true;
  else nextTick(() => { spellingInput.value?.focus(); spellingInput.value?.select(); });
  saveSession();
}
function revealSpelling() {
  revealed.value = true; feedback.value = '看清单词后，请亲手输入一遍；本词会安排尽快复习。';
  nextTick(() => spellingInput.value?.focus());
}
function nextSpelling() { if (spellingCorrect.value) answer(spellingRating(attempts.value, revealed.value)); }
function showWordAnswer() { showAnswer.value = true; }
function answer(type: Rating) {
  if (answerLocked || loading.value || finished.value || !showAnswer.value || !currentWord.value) return;
  answerLocked = true;
  pending.value = { id: `${sessionId}:${completed.value}`, word: currentWord.value.word, rating: type, at: Date.now(), seconds: snapshot().elapsedSeconds, exercise: exercise.value };
  saveSession(); restoring = true;
  applyPending(); restoring = false; saveSession(); cancelSpeech();
  // Prevent a queued double click from rating the next card.
  nextTick(() => { answerLocked = false; });
}
function speak() {
  if (!currentWord.value) return;
  if (!('speechSynthesis' in window)) { speechNotice.value = '当前浏览器不支持朗读，可参考音标继续学习。'; return; }
  cancelSpeech(); speechNotice.value = '';
  const version = speechVersion;
  try {
    const speech = new SpeechSynthesisUtterance(currentWord.value.word);
    speech.lang = 'en-US'; speech.rate = 0.8;
    speech.onerror = event => { if (version === speechVersion && !['canceled', 'interrupted'].includes(event.error)) speechNotice.value = '朗读未能播放，请重试，或检查浏览器声音设置。'; };
    window.speechSynthesis.speak(speech);
  } catch { speechNotice.value = '朗读暂不可用，请稍后重试。'; }
}
function keyboard(event: KeyboardEvent) {
  if (event.isComposing || event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || exercise.value !== 'meaning' || loading.value || error.value || finished.value || !currentWord.value) return;
  const target = event.target;
  if (target instanceof HTMLElement && (target.closest('input, textarea, select, button, a, [contenteditable="true"], [role="textbox"]'))) return;
  if (event.code === 'Space') { event.preventDefault(); if (!showAnswer.value) showWordAnswer(); }
  else if (showAnswer.value && ['1','2','3'].includes(event.key)) { event.preventDefault(); answer(({ '1':'hard', '2':'normal', '3':'easy' } as const)[event.key as '1'|'2'|'3']); }
}
function back() { saveSession(); emit('back'); }
onMounted(() => { restorePreferences(); void load(); window.addEventListener('keydown', keyboard); window.addEventListener('pagehide', saveSession); });
onUnmounted(() => { saveSession(); loadVersion++; cancelSpeech(); window.removeEventListener('keydown', keyboard); window.removeEventListener('pagehide', saveSession); });
</script>

<template>
  <div class="study-page">
    <!-- 顶部 -->
    <header class="study-header">
      <button class="back-button" @click="back">← 返回</button>

      <div class="header-title">
        <span>AI VOCABULARY</span>
        <h1>{{ titles[mode] }}</h1>
      </div>

      <div class="progress-text">{{ completed }} / {{ words.length }}</div>
    </header>

    <div class="wordlist-controls">
      <label for="exercise">练习方式</label><select id="exercise" :value="exercise" :disabled="loading" @change="changeExercise"><option value="spelling">看释义 · 打字拼写</option><option value="meaning">看单词 · 记忆释义</option></select>
      <label for="wordlist">选择词库</label>
      <select id="wordlist" :value="wordList" :disabled="loading" @change="changeWordList"><option v-for="(name, key) in listNames" :key="key" :value="key">{{ name }}</option></select>
      <label v-if="mode === 'study'"><input :checked="includeLearned" type="checkbox" :disabled="loading" @change="changeIncludeLearned"> 包含已学词</label>
    </div>
    <p v-if="sessionNotice" class="session-notice" role="status">{{ sessionNotice }}</p>
    <p v-if="!loading && !error && words.length && !saveError" class="save-hint">自动保存到当前浏览器 · 返回首页或刷新后，重新进入本模式即可继续</p>
    <p v-if="saveError" class="session-notice save-error" role="alert">{{ saveError }}</p>
    <p v-if="exercise === 'meaning' && !loading && !finished && words.length" class="save-hint">快捷键：Space 查看释义 · 1 不认识 · 2 模糊 · 3 认识（输入或操作控件时不触发）</p>
    <!-- 进度条 -->
    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress" :style="{ width: progress + '%' }"></div>
      </div>

      <span>{{ progress }}%</span>
    </div>

    <p v-if="storageWarning" role="status">{{ storageWarning }}</p>
    <main v-if="loading" class="study-content">正在加载{{ listNames[wordList] }}…</main>
    <main v-else-if="error" class="study-content" role="alert">{{ error }} <button class="show-button" @click="load()">重新加载</button> <button class="hint-button" @click="back">返回首页</button></main>
    <main v-else-if="finished || !words.length" class="study-content">
      <div class="word-card"><h2>{{ finished ? '学习完成！' : emptyCopy.title }}</h2><p v-if="finished">本次完成 {{ completed }} 个单词，认识 / 首次拼对 {{ recognized }} 个。</p><p v-if="spellingCompleted">拼写完成 {{ spellingCompleted }} 词，首次独立拼对 {{ firstTryCorrect }} 词。</p><p v-if="!words.length">{{ emptyCopy.text }}</p><button v-if="finished" class="show-button" @click="load(true)">继续下一组</button> <button class="show-button" @click="back">返回首页</button></div>
    </main>
    <!-- 单词卡片 -->
    <main v-else-if="currentWord" class="study-content">
      <div ref="wordCard" class="word-card" tabindex="-1">
        <div class="word-level">
          {{ listNames[wordList] }}
        </div>

        <h2 v-if="exercise === 'meaning' || revealed || spellingCorrect">
          {{ currentWord.word }}
        </h2>

        <div v-if="exercise === 'meaning' || revealed || spellingCorrect" class="phonetic">
          {{ currentWord.phonetic }}

          <button class="sound-button" aria-label="朗读当前单词" @click="speak">🔊</button>
        </div>
        <p v-if="speechNotice" class="speech-notice" role="status">{{ speechNotice }}</p>

        <section v-if="exercise === 'spelling'" class="spelling-area">
          <p class="meaning">{{ currentWord.meaning }}</p>
          <p class="question">根据释义输入英文单词。拼错可以重试，查看答案后需亲手输入一遍。</p>
          <form @submit.prevent="spellingCorrect ? nextSpelling() : checkSpelling()">
            <label class="input-label" for="spelling-input">英文拼写</label>
            <input id="spelling-input" ref="spellingInput" v-model="typedWord" maxlength="200" :readonly="spellingCorrect" class="spelling-input" type="text" lang="en" autocomplete="off" autocapitalize="none" autocorrect="off" :spellcheck="false" aria-describedby="spelling-feedback" placeholder="输入英文，按 Enter 核对" @input="feedback = ''" @keydown.enter="event => { if (event.isComposing) event.preventDefault(); }">
            <p id="spelling-feedback" role="status" class="spelling-feedback" :class="{ success: spellingCorrect }">{{ feedback }}</p>
            <button class="show-button" type="submit">{{ spellingCorrect ? '下一词 →' : '核对拼写' }}</button>
            <button v-if="!spellingCorrect && !revealed" class="hint-button" type="button" @click="revealSpelling">查看答案</button>
          </form>
          <p v-if="spellingCorrect" class="rating-note">{{ revealed ? '已看答案：1 分钟后复习' : attempts > 1 ? '重试后拼对：1 天后复习' : '首次拼对：延长复习间隔' }}</p>
          <div v-if="spellingCorrect && currentWord.example" class="example"><div class="example-title">例句</div><p>{{ currentWord.example }}</p></div>
        </section>
        <!-- 未显示答案 -->
        <div v-if="exercise === 'meaning' && !showAnswer" class="question-area">
          <p class="question">你知道这个单词的意思吗？</p>

          <button class="show-button" @click="showWordAnswer">查看释义</button>
        </div>

        <!-- 显示答案 -->
        <div v-else-if="exercise === 'meaning' && showAnswer" class="answer-area">
          <div class="meaning">
            {{ currentWord.meaning }}
          </div>

          <div class="example">
            <div class="example-title">Example</div>

            <p>
              {{ currentWord.example }}
            </p>


          </div>


        </div>
      </div>

      <!-- 答题按钮 -->
      <div v-if="exercise === 'meaning' && showAnswer" class="answer-buttons">
        <button class="answer-button hard" @click="answer('hard')">
          <span>😵</span>
          <strong>不认识 · 1</strong>
          <small>1 分钟后复习</small>
        </button>

        <button class="answer-button normal" @click="answer('normal')">
          <span>🤔</span>
          <strong>模糊 · 2</strong>
          <small>1 天后复习</small>
        </button>

        <button class="answer-button easy" @click="answer('easy')">
          <span>😎</span>
          <strong>认识 · 3</strong>
          <small>延长复习间隔</small>
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.study-page {
  min-height: 100vh;

  background: radial-gradient(circle at 50% 0%, #f0f0ff, #f7f8fc 45%, #f5f6fa);

  padding: 30px 50px;

  color: #252936;
}

/* Header */

.study-header {
  display: flex;

  align-items: center;

  justify-content: space-between;

  max-width: 1050px;

  margin: auto;
}

.back-button {
  border: none;

  background: white;

  padding: 10px 15px;

  border-radius: 9px;

  color: #666;

  cursor: pointer;
}

.header-title {
  text-align: center;
}

.header-title span {
  font-size: 9px;

  letter-spacing: 2px;

  color: #6869d9;
}

.header-title h1 {
  font-size: 20px;

  margin-top: 4px;
}

.progress-text {
  font-size: 13px;

  color: #777;
}

/* Progress */

.progress-container {
  max-width: 1050px;

  margin: 25px auto 0;

  display: flex;

  align-items: center;

  gap: 15px;
}

.progress-bar {
  height: 6px;

  flex: 1;

  background: #e4e6ed;

  border-radius: 10px;

  overflow: hidden;
}

.progress {
  height: 100%;

  background: #6264df;

  transition: width 0.3s;
}

.progress-container span {
  font-size: 11px;

  color: #777;

  width: 35px;
}

/* Main */

.study-content {
  max-width: 700px;

  margin: 55px auto;
}

/* Word Card */

.word-card {
  background: white;

  border-radius: 25px;

  padding: 55px;

  text-align: center;

  border: 1px solid #e8eaf0;

  box-shadow: 0 20px 60px rgba(30, 35, 70, 0.08);
}

.word-level {
  display: inline-block;

  background: #eeeeff;

  color: #5c5ed4;

  padding: 5px 11px;

  border-radius: 20px;

  font-size: 10px;

  margin-bottom: 20px;
}

.word-card h2 {
  font-size: 52px;

  letter-spacing: -1px;

  margin-bottom: 10px;
}

.phonetic {
  color: #858b97;

  font-size: 15px;

  display: flex;

  justify-content: center;

  align-items: center;

  gap: 10px;
}

.sound-button {
  border: none;

  background: #f1f2ff;

  width: 34px;
  height: 34px;

  border-radius: 50%;

  cursor: pointer;
}

/* Question */

.question-area {
  margin-top: 55px;
}

.question {
  font-size: 14px;

  color: #8b909b;

  margin-bottom: 18px;
}

.show-button {
  border: none;

  background: #5e60dc;

  color: white;

  padding: 13px 35px;

  border-radius: 10px;

  font-size: 13px;

  cursor: pointer;
}

/* Answer */

.answer-area {
  margin-top: 45px;

  text-align: left;
}

.meaning {
  font-size: 24px;

  font-weight: 600;

  text-align: center;

  margin-bottom: 30px;
}

.example {
  padding: 20px;

  background: #f7f8fc;

  border-radius: 13px;

  margin-bottom: 15px;
}

.example-title {
  font-size: 10px;

  color: #777;

  text-transform: uppercase;

  letter-spacing: 1px;

  margin-bottom: 9px;
}

.example p {
  font-size: 15px;

  margin-bottom: 8px;

  line-height: 1.6;
}

.example span {
  font-size: 12px;

  color: #999;
}

.ai-tip {
  padding: 18px;

  border-radius: 13px;

  background: #f1f0ff;

  color: #555;
}

.ai-tip span {
  color: #6264db;

  font-size: 11px;

  font-weight: 600;
}

.ai-tip p {
  margin-top: 7px;

  font-size: 12px;

  line-height: 1.7;
}

/* Buttons */

.answer-buttons {
  display: grid;

  grid-template-columns: repeat(3, 1fr);

  gap: 15px;

  margin-top: 20px;
}

.answer-button {
  border: none;

  background: white;

  border: 1px solid #e6e8ed;

  border-radius: 15px;

  padding: 17px;

  cursor: pointer;

  display: flex;

  flex-direction: column;

  align-items: center;

  gap: 4px;

  transition: 0.2s;
}

.answer-button:hover {
  transform: translateY(-3px);

  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.07);
}

.answer-button span {
  font-size: 22px;
}

.answer-button strong {
  font-size: 13px;
}

.answer-button small {
  color: #999;

  font-size: 10px;
}

.hard:hover {
  border-color: #ed9c9c;
}

.normal:hover {
  border-color: #e5c078;
}

.easy:hover {
  border-color: #87c99c;
}

/* Mobile */

@media (max-width: 700px) {
  .study-page {
    padding: 20px;
  }

  .word-card {
    padding: 35px 20px;
  }

  .word-card h2 {
    font-size: 40px;
  }

  .answer-buttons {
    grid-template-columns: 1fr;
  }
}
</style>

<style scoped>
.wordlist-controls { max-width: 1050px; margin: 24px auto; display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
select { padding: 10px; border: 1px solid #ddd; border-radius: 8px; background: white; }
</style>

<style scoped>
.spelling-area { margin-top: 24px; }.spelling-area .question { line-height: 1.8; }
.input-label { display: block; text-align: left; margin-bottom: 8px; font-size: 13px; }
.spelling-input { width: 100%; padding: 16px; border: 2px solid #d9dcec; border-radius: 12px; text-align: center; font: inherit; font-size: 24px; color: #252936; }
.spelling-input:focus { outline: 2px solid #5b5ce2; outline-offset: 2px; }
.spelling-feedback { min-height: 42px; padding: 10px 0; line-height: 1.5; color: #a44d25; }.spelling-feedback.success { color: #237343; }
.hint-button { padding: 12px 18px; border: 1px solid #ddd; background: white; border-radius: 10px; margin-left: 8px; color: #666; }
.rating-note { margin: 18px 0; color: #6869d9; font-size: 13px; }
@media(max-width: 700px) { .word-card { padding: 28px 20px; }.word-card h2 { font-size: 32px; overflow-wrap: anywhere; }.study-page { padding: 20px 14px; } }
</style>
