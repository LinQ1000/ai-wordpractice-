<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import basic from './data/basic.json';
import { matchesSpelling, spellingRating } from './lib/spelling';
import { selectWords, recordAnswer, storageWarning, batchSize, type Word, type Mode, type Rating } from './stores/learning';
const props = defineProps<{ mode: Mode }>();
const emit = defineEmits<{ back: [] }>();
const titles = { study: '今日单词', review: '到期复习', mistakes: '错词巩固' };
const words = ref<Word[]>([]);
type WordList = 'ielts' | 'month' | 'week' | 'season';
const wordList = ref<WordList>('ielts');
const listNames = { ielts: 'IELTS 核心词汇', month: '基础 · 月份', week: '基础 · 星期', season: '基础 · 季节' };
const includeLearned = ref(false);
const exercise = ref<'spelling' | 'meaning'>('spelling');
const typedWord = ref('');
const spellingInput = ref<HTMLInputElement | null>(null);
const attempts = ref(0);
const revealed = ref(false);
const spellingCorrect = ref(false);
const feedback = ref('');
const firstTryCorrect = ref(0);
const spellingCompleted = ref(0);
function resetSpelling() {
  typedWord.value = ''; attempts.value = 0; revealed.value = false;
  spellingCorrect.value = false; feedback.value = ''; showAnswer.value = false;
  nextTick(() => spellingInput.value?.focus());
}
function changeExercise() { resetSpelling(); }
function checkSpelling() {
  if (!currentWord.value || spellingCorrect.value || finished.value) return;
  if (!typedWord.value.trim()) { feedback.value = '请先输入单词。'; return; }
  attempts.value++;
  spellingCorrect.value = matchesSpelling(typedWord.value, currentWord.value.word);
  feedback.value = spellingCorrect.value ? '拼写正确！点击下一词继续。' : '还差一点，请检查拼写后再试一次。';
  if (spellingCorrect.value) showAnswer.value = true;
  else nextTick(() => { spellingInput.value?.focus(); spellingInput.value?.select(); });
}
function revealSpelling() {
  revealed.value = true;
  feedback.value = '看清单词后，请亲手输入一遍；本词会安排尽快复习。';
  nextTick(() => spellingInput.value?.focus());
}
function nextSpelling() {
  if (!spellingCorrect.value) return;
  const rating = spellingRating(attempts.value, revealed.value);
  spellingCompleted.value++;
  if (rating === 'easy') firstTryCorrect.value++;
  answer(rating);
}
const currentIndex = ref(0);
const showAnswer = ref(false);
const completed = ref(0);
const loading = ref(true);
const error = ref('');
const recognized = ref(0);
let started = Date.now();
const finished = computed(() => !loading.value && words.value.length > 0 && completed.value >= words.value.length);
const currentWord = computed(() => words.value[currentIndex.value]);
const progress = computed(() => words.value.length ? Math.round(completed.value / words.value.length * 100) : 0);
async function load() {
  loading.value = true; error.value = ''; completed.value = 0; currentIndex.value = 0; recognized.value = 0; firstTryCorrect.value = 0; spellingCompleted.value = 0; resetSpelling();
  try {
    let data: Word[];
    if (wordList.value === 'ielts') {
      const response = await fetch('/ielts/assets/wordlists/ielts_core.json');
      if (!response.ok) throw new Error();
      data = await response.json();
    } else { data = basic[wordList.value]; }
    words.value = includeLearned.value && props.mode === 'study' ? data.slice(0, batchSize.value) : selectWords(data, props.mode); started = Date.now();
  } catch { error.value = '词库加载失败，请检查网络后重试。'; }
  finally { loading.value = false; nextTick(() => spellingInput.value?.focus()); }
}
onMounted(load);
onUnmounted(() => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); });
function showWordAnswer() { showAnswer.value = true; }
function answer(type: Rating) {
  if (finished.value || !showAnswer.value || !currentWord.value) return;
  recordAnswer(currentWord.value.word, type, (Date.now()-started)/1000);
  if (type === 'easy') recognized.value++;
  completed.value++; showAnswer.value = false; started = Date.now();
  if (!finished.value) currentIndex.value++;
  resetSpelling();
}
function speak() {
  if (currentWord.value && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(currentWord.value.word);
    speech.lang = 'en-US'; speech.rate = 0.8;
    window.speechSynthesis.speak(speech);
  }
}
</script>

<template>
  <div class="study-page">
    <!-- 顶部 -->
    <header class="study-header">
      <button class="back-button" @click="emit('back')">← 返回</button>

      <div class="header-title">
        <span>AI VOCABULARY</span>
        <h1>{{ titles[mode] }}</h1>
      </div>

      <div class="progress-text">{{ completed }} / {{ words.length }}</div>
    </header>

    <div class="wordlist-controls">
      <label for="exercise">练习方式</label><select id="exercise" v-model="exercise" :disabled="loading" @change="changeExercise"><option value="spelling">看释义 · 打字拼写</option><option value="meaning">看单词 · 记忆释义</option></select>
      <label for="wordlist">选择词库</label>
      <select id="wordlist" v-model="wordList" :disabled="loading" @change="load"><option v-for="(name, key) in listNames" :key="key" :value="key">{{ name }}</option></select>
      <label v-if="mode === 'study'"><input v-model="includeLearned" type="checkbox" :disabled="loading" @change="load"> 包含已学词</label>
    </div>
    <!-- 进度条 -->
    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress" :style="{ width: progress + '%' }"></div>
      </div>

      <span>{{ progress }}%</span>
    </div>

    <p v-if="storageWarning" role="status">{{ storageWarning }}</p>
    <main v-if="loading" class="study-content">正在加载 IELTS 词库…</main>
    <main v-else-if="error" class="study-content" role="alert">{{ error }} <button class="show-button" @click="load">重新加载</button></main>
    <main v-else-if="finished || !words.length" class="study-content">
      <div class="word-card"><h2>{{ finished ? '学习完成！' : '暂时没有待学单词' }}</h2><p>本次完成 {{ completed }} 个单词，认识 / 首次拼对 {{ recognized }} 个。</p><p v-if="spellingCompleted">拼写完成 {{ spellingCompleted }} 词，首次独立拼对 {{ firstTryCorrect }} 词。</p><p v-if="!words.length">可以返回首页学习新词，或稍后再来复习。</p><button v-if="finished" class="show-button" @click="load">继续下一组</button> <button class="show-button" @click="emit('back')">返回首页</button></div>
    </main>
    <!-- 单词卡片 -->
    <main v-else-if="currentWord" class="study-content">
      <div class="word-card">
        <div class="word-level">
          {{ listNames[wordList] }}
        </div>

        <h2 v-if="exercise === 'meaning' || revealed || spellingCorrect">
          {{ currentWord.word }}
        </h2>

        <div v-if="exercise === 'meaning' || revealed || spellingCorrect" class="phonetic">
          {{ currentWord.phonetic }}

          <button class="sound-button" @click="speak">🔊</button>
        </div>

        <section v-if="exercise === 'spelling'" class="spelling-area">
          <p class="meaning">{{ currentWord.meaning }}</p>
          <p class="question">根据释义输入英文单词。拼错可以重试，查看答案后需亲手输入一遍。</p>
          <form @submit.prevent="spellingCorrect ? nextSpelling() : checkSpelling()">
            <label class="input-label" for="spelling-input">英文拼写</label>
            <input id="spelling-input" ref="spellingInput" v-model="typedWord" :readonly="spellingCorrect" class="spelling-input" type="text" lang="en" autocomplete="off" autocapitalize="none" autocorrect="off" :spellcheck="false" aria-describedby="spelling-feedback" placeholder="输入英文，按 Enter 核对" @input="feedback = ''">
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
          <strong>不认识</strong>
          <small>1 分钟后复习</small>
        </button>

        <button class="answer-button normal" @click="answer('normal')">
          <span>🤔</span>
          <strong>模糊</strong>
          <small>1 天后复习</small>
        </button>

        <button class="answer-button easy" @click="answer('easy')">
          <span>😎</span>
          <strong>认识</strong>
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
