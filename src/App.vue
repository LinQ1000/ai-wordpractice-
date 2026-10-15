<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import Study from './Study.vue';
import ExamPractice from './ExamPractice.vue';
import Speaking from './Speaking.vue';
import { records, today, activities, learnedWords, accuracy, studiedToday, minutesToday, streak, batchSize, saveSettings, storageWarning, refreshLearningDate, type Mode } from './stores/learning';
import { dailyGoal, saveDailyGoal, preferencesWarning } from './stores/studyPreferences';
import { practiceHistory } from './stores/practiceHistory';
type Page = 'home' | 'study' | 'stats' | 'settings' | 'listening' | 'writing' | 'speaking';
const pages: Page[] = ['home','study','stats','settings','listening','writing','speaking'];
const currentPage = ref<Page>('home');
const mode = ref<Mode>('study');
function readLocation() {
  const hash = location.hash.slice(1);
  if (hash === 'review' || hash === 'mistakes') { mode.value = hash; currentPage.value = 'study'; }
  else { mode.value = 'study'; currentPage.value = pages.includes(hash as Page) ? hash as Page : 'home'; }
  const canonical = currentPage.value === 'study' ? mode.value : currentPage.value;
  if (location.hash !== `#${canonical}`) history.replaceState(null, '', `#${canonical}`);
}
readLocation();
watch([currentPage, mode], () => {
  const hash = currentPage.value === 'study' ? mode.value : currentPage.value;
  if (location.hash !== `#${hash}`) history.pushState(null, '', `#${hash}`);
  document.title = `${pageTitle.value} · AI Vocabulary`;
  window.scrollTo({ top: 0 });
  nextTick(() => document.getElementById('page-title')?.focus({ preventScroll: true }));
});
const clock = ref(Date.now());
let timer: ReturnType<typeof setInterval>;
function refreshClock() { clock.value = Date.now(); refreshLearningDate(); }
onMounted(() => {
  refreshClock(); timer = setInterval(refreshClock, 30000);
  window.addEventListener('hashchange', readLocation);
  document.addEventListener('visibilitychange', refreshClock);
  document.title = `${pageTitle.value} · AI Vocabulary`;
});
onUnmounted(() => {
  clearInterval(timer); window.removeEventListener('hashchange', readLocation);
  document.removeEventListener('visibilitychange', refreshClock);
});
const todayWords = computed(() => Object.values(records.value).filter(p => p.due <= clock.value).length);
const mistakes = computed(() => Object.values(records.value).filter(p => p.difficult || p.repetitions === 0).length);
const goalProgress = computed(() => Math.min(100, Math.round(studiedToday.value / dailyGoal.value * 100)));
const goalComplete = computed(() => studiedToday.value >= dailyGoal.value);
const greeting = computed(() => {
  const hour = new Date(clock.value).getHours();
  return hour < 6 ? '夜深了，按自己的节奏来' : hour < 12 ? '早上好，开始今天的一小步' : hour < 18 ? '下午好，给英语留一点时间' : '晚上好，今天也进步一点';
});
const pageTitle = computed(() => ({home:'你的学习空间', study:'单词练习', stats:'学习统计', settings:'学习设置', listening:'IELTS 听力', writing:'IELTS 写作', speaking:'IELTS 口语'}[currentPage.value]));
const heroTitle = computed(() => goalComplete.value ? '今日目标已完成，辛苦了' : todayWords.value ? `先巩固 ${todayWords.value} 个到期词` : studiedToday.value ? '接着上次的进度，继续一点点' : '从一组单词开始');
const heroDescription = computed(() => goalComplete.value ? '可以休息一下，也可以换一种练习。每一步积累都会留下来。' : todayWords.value ? '先复习，再学新词。每组数量可以调整，不用一次全部完成。' : `今天的目标是 ${dailyGoal.value} 个词，每组 ${batchSize.value} 个。中途离开也可以接着练。`);
const skillCards = [
  { id:'reading', icon:'📖', title:'IELTS 阅读', description:'阅读文章、完成题目、核对答案', action:'进入阅读', href:'/ielts/index.html' },
  { id:'listening', icon:'🎧', title:'IELTS 听力', description:'边听边答，按题号标记难点', action:'练习听力' },
  { id:'writing', icon:'✍️', title:'IELTS 写作', description:'专心写作，随时保存和导出', action:'练习写作' },
  { id:'speaking', icon:'🎙️', title:'IELTS 口语', description:'回答题目，获取 AI 表达建议', action:'练习口语' },
] as const;
const recentPractice = computed(() => practiceHistory.value.slice(0, 3));
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
}
const settingSize = ref(batchSize.value);
const settingGoal = ref(dailyGoal.value);
const settingsMessage = ref('');
function applySettings() {
  if (![settingSize.value, settingGoal.value].every(n => Number.isInteger(n) && n >= 5 && n <= 100)) {
    settingsMessage.value = '请填写 5–100 之间的整数。'; return;
  }
  const batchSaved = saveSettings(settingSize.value);
  const goalSaved = saveDailyGoal(settingGoal.value);
  settingsMessage.value = batchSaved && goalSaved ? '已保存。每日目标立即更新，每组词数从下一组开始生效。' : '未能保存全部设置，请确认浏览器允许保存数据后重试。';
}
function goHome() { currentPage.value = 'home'; refreshClock(); }
function startStudy(value: Mode = 'study') { mode.value = value; currentPage.value = 'study'; }
function skipToMain() { document.getElementById('main-content')?.focus(); }
</script>

<template>
  <Study v-if="currentPage === 'study'" :key="mode" :mode="mode" @back="goHome" />

  <ExamPractice v-else-if="currentPage === 'listening' || currentPage === 'writing'" :key="currentPage" :kind="currentPage" @back="goHome" />

  <Speaking v-else-if="currentPage === 'speaking'" @back="goHome" />

  <div v-else class="app">
    <a class="skip-link" href="#main-content" @click.prevent="skipToMain">跳到主要内容</a>
    <!-- 左侧菜单 -->
    <aside class="sidebar">
      <div class="logo">
        <div class="logo-icon">A</div>
        <div>
          <h2>AI Vocabulary</h2>
          <span>Smart English Learning</span>
        </div>
      </div>

      <nav aria-label="主导航">
        <a class="nav-item" href="/ielts/index.html">📖 IELTS 阅读</a>
        <a class="nav-item" href="#listening" @click.prevent="currentPage = 'listening'">🎧 IELTS 听力</a>
        <a class="nav-item" href="#writing" @click.prevent="currentPage = 'writing'">✍️ IELTS 写作</a>
        <a class="nav-item" href="#speaking" @click.prevent="currentPage = 'speaking'">🎙️ IELTS 口语</a>
        <div class="nav-title">学习</div>

        <a class="nav-item" :class="{ active: currentPage === 'home' }" :aria-current="currentPage === 'home' ? 'page' : undefined" href="#home" @click.prevent="goHome">
          <span>🏠</span>
          首页
        </a>

        <a class="nav-item" href="#study" @click.prevent="startStudy()">
          <span>📖</span>
          背单词
        </a>

        <a class="nav-item" href="#review" @click.prevent="startStudy('review')">
          <span>🔄</span>
          智能复习
        </a>

        <a class="nav-item" href="#mistakes" @click.prevent="startStudy('mistakes')">
          <span>❌</span>
          错题本
        </a>

        <div class="nav-title">数据</div>

        <a class="nav-item" :class="{ active: currentPage === 'stats' }" :aria-current="currentPage === 'stats' ? 'page' : undefined" href="#stats" @click.prevent="currentPage = 'stats'">
          <span>📊</span>
          学习统计
        </a>

        <a class="nav-item" :class="{ active: currentPage === 'settings' }" :aria-current="currentPage === 'settings' ? 'page' : undefined" href="#settings" @click.prevent="currentPage = 'settings'">
          <span>⚙️</span>
          设置
        </a>
      </nav>

      <div class="sidebar-bottom">
        <div class="streak-box">
          <div class="fire">🔥</div>
          <div>
            <strong>{{ streak }} 天</strong>
            <span>连续学习</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- 主内容 -->
    <main id="main-content" class="main" tabindex="-1">
      <!-- 顶部 -->
      <header class="header">
        <div>
          <p class="welcome">{{ greeting }} 👋</p>
          <h1 id="page-title" tabindex="-1">{{ pageTitle }}</h1>
        </div>

        <p class="local-note">无需登录<br>记录保存在此浏览器</p>
      </header>

      <p v-if="storageWarning" role="alert">{{ storageWarning }}</p>
      <p v-if="preferencesWarning" role="alert">{{ preferencesWarning }}</p>
      <nav class="mobile-actions" aria-label="移动端导航"><button :aria-current="currentPage==='home' ? 'page' : undefined" @click="goHome">首页</button><button @click="startStudy()">背单词</button><button @click="startStudy('review')">复习</button><button @click="startStudy('mistakes')">错词</button><button :aria-current="currentPage==='stats' ? 'page' : undefined" @click="currentPage = 'stats'">统计</button><button :aria-current="currentPage==='settings' ? 'page' : undefined" @click="currentPage = 'settings'">设置</button></nav>
      <section v-if="currentPage === 'settings'" class="panel">
        <h2>安排适合自己的学习节奏</h2><p>每日目标用于记录当天进度；每组词数决定一次练多少。每组优先安排到期词，再补充新词。</p>
        <form class="learning-settings" @submit.prevent="applySettings">
          <label for="daily-goal">每日目标（词）<input id="daily-goal" v-model.number="settingGoal" type="number" min="5" max="100" step="1" required aria-describedby="goal-help"></label>
          <p id="goal-help">每天 5–100 个不同单词，可分几次完成。重复练习同一词不会重复计入目标。</p>
          <div class="goal-presets" aria-label="快速选择每日目标"><button v-for="n in [5,10,20,30]" :key="n" type="button" :aria-pressed="settingGoal===n" @click="settingGoal=n">{{ n }} 词 / 天</button></div>
          <label for="batch-size">每组词数<input id="batch-size" v-model.number="settingSize" type="number" min="5" max="100" step="1" required aria-describedby="batch-help"></label>
          <p id="batch-help">每组 5–100 词。想轻松一点，可以先从 5 个开始；已开始的练习可继续完成。</p>
          <button class="show-control" type="submit">保存设置</button>
        </form><p role="status">{{ settingsMessage }}</p>
      </section>
      <section v-else-if="currentPage === 'stats'" class="panel">
        <h2>每一次练习都有积累</h2><template v-if="activities.length"><p>今日学习 {{ studiedToday }} / {{ dailyGoal }} 个不同单词，完成 {{ today.length }} 次评价，累计 {{ minutesToday }} 分钟。</p><p>{{ today.length ? `今日认识 / 首次拼对率 ${accuracy}%` : '今天还没有完成单词练习' }} · 连续学习 {{ streak }} 天 · 累计评价 {{ activities.length }} 次</p><p>已掌握 {{ learnedWords }} 词（连续认识或首次独立拼对至少 3 次），待复习 {{ todayWords }} 词，待巩固 {{ mistakes }} 词。</p></template><p v-else>完成第一个单词后，这里会展示学习时长、复习进度和连续学习天数。</p><button class="show-control" @click="startStudy()">{{ activities.length ? '继续练习' : '开始第一组单词' }}</button><p class="data-note">认识 / 首次拼对率包含释义自评与拼写结果；每词计时最多计入 5 分钟。旧记录未包含日期，不计入每日统计。</p>
      </section>
      <template v-else>
      <!-- 今日学习 -->
      <section class="hero-card">
        <div class="hero-left">
          <span class="tag">TODAY'S LEARNING</span>

          <h2>{{ heroTitle }}</h2>

          <p>{{ heroDescription }}</p>

          <button class="start-button" @click="startStudy(todayWords ? 'review' : 'study')">{{ todayWords ? '开始复习' : studiedToday ? '继续背单词' : '开始背单词' }} →</button>
          <p class="goal-caption">今日已学 {{ studiedToday }} / {{ dailyGoal }} 词 <button class="text-button" @click="currentPage='settings'">调整目标</button></p>
        </div>

        <div class="progress-circle">
          <div class="circle" role="progressbar" :aria-valuenow="goalProgress" aria-valuemin="0" aria-valuemax="100" aria-label="今日单词目标完成度" :style="{ background: `conic-gradient(white ${goalProgress}%, rgba(255,255,255,.22) 0)` }">
            <div class="circle-inner">
            <strong>{{ goalProgress }}%</strong>
            <span>{{ goalComplete ? '已完成今日目标' : '今日目标' }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 数据卡片 -->
      <section class="stats">
        <div class="stat-card">
          <div class="stat-icon blue">📚</div>
          <div>
            <span>已掌握词汇</span>
            <strong>{{ learnedWords }}</strong>
            <small>累计掌握</small>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon orange">🎯</div>
          <div>
            <span>认识 / 首次拼对</span>
            <strong>{{ today.length ? accuracy + '%' : '—' }}</strong>
            <small>{{ today.length ? '今天的练习表现' : '完成练习后显示' }}</small>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon green">⏱️</div>
          <div>
            <span>学习时间</span>
            <strong>{{ minutesToday }} min</strong>
            <small>今天</small>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon purple">🔄</div>
          <div>
            <span>待复习</span>
            <strong>{{ todayWords }}</strong>
            <small>需要复习</small>
          </div>
        </div>
      </section>

      <!-- 下半部分 -->
      <section class="content-grid">
        <!-- 学习任务 -->
        <div class="panel">
          <div class="panel-header">
            <div>
              <span class="panel-label">TODAY</span>
              <h3>今日学习任务</h3>
            </div>

          </div>
          <button class="task task-action" @click="startStudy()"><span>📖</span><span class="task-info"><strong>今日学习</strong><span>已学 {{ studiedToday }} / 目标 {{ dailyGoal }} 词</span><span class="bar"><span class="bar-progress" :style="{ width: goalProgress + '%', display: 'block' }"></span></span></span><span>继续 →</span></button>
          <button class="task task-action" @click="startStudy('review')"><span>🔄</span><span class="task-info"><strong>间隔复习</strong><span>{{ todayWords ? `${todayWords} 个到期单词，可以分组复习` : '暂时没有到期词，先学新词也不错' }}</span></span><span>{{ todayWords ? '复习 →' : '查看 →' }}</span></button>
          <button class="task task-action" @click="startStudy('mistakes')"><span>🧠</span><span class="task-info"><strong>错词巩固</strong><span>{{ mistakes ? `${mistakes} 个需要再练一练的单词` : '暂时没有错词，继续保持' }}</span></span><span>{{ mistakes ? '巩固 →' : '查看 →' }}</span></button>
        </div>

        <!-- AI 助手 -->
        <div class="ai-panel">
          <div class="ai-icon">✨</div>

          <span class="ai-label">IELTS VOCABULARY</span>

          <h3>用例句理解，用复习记牢</h3>

          <p>
            学习 3,610 个 IELTS 核心词汇，通过释义、例句和朗读积累词汇。
            根据每次自评安排复习，不认识的单词进入错词巩固。
          </p>

          <button class="start-button" @click="startStudy()">开始学习 →</button>
        </div>
      </section>
      <section class="skills-section" aria-labelledby="skills-title">
        <div class="panel-header"><div><h2 id="skills-title">换一种方式练英语</h2><p>听、说、读、写，选一个现在想练的。</p></div></div>
        <div class="skill-grid"><article v-for="skill in skillCards" :key="skill.id" class="skill-card"><span class="skill-icon" aria-hidden="true">{{ skill.icon }}</span><h3>{{ skill.title }}</h3><p>{{ skill.description }}</p><a v-if="skill.id==='reading'" :href="skill.href">{{ skill.action }} →</a><button v-else @click="currentPage=skill.id">{{ skill.action }} →</button></article></div>
      </section>
      <section v-if="recentPractice.length" class="panel recent-practice" aria-labelledby="recent-title"><h2 id="recent-title">最近完成的练习</h2><p>进入对应模块，在“练习记录”中回看答案和反馈。</p><ul><li v-for="item in recentPractice" :key="item.id"><div><strong>{{ item.title }}</strong><span>{{ formatDate(item.date) }} · {{ item.summary }}</span></div><button @click="currentPage=item.skill">进入{{ {listening:'听力',writing:'写作',speaking:'口语'}[item.skill] }} →</button></li></ul></section>
      </template>
    </main>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;

  background: #f5f7fb;
  color: #202633;
}

button {
  font-family: inherit;
  cursor: pointer;
}

.app {
  display: flex;
  min-height: 100vh;
}

/* ==================== */
/* Sidebar */
/* ==================== */

.sidebar {
  width: 250px;
  background: #ffffff;
  border-right: 1px solid #e8ebf0;

  display: flex;
  flex-direction: column;

  padding: 28px 18px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;

  padding: 0 10px;
  margin-bottom: 42px;
}

.logo-icon {
  width: 42px;
  height: 42px;

  border-radius: 12px;

  background: #5b5ce2;
  color: white;

  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 21px;
  font-weight: 700;
}

.logo h2 {
  font-size: 15px;
}

.logo span {
  display: block;
  font-size: 10px;
  color: #9aa1ad;
  margin-top: 3px;
}

.nav-title {
  font-size: 11px;
  color: #a0a6b0;

  margin: 18px 12px 8px;

  text-transform: uppercase;
  letter-spacing: 1px;
}

.nav-item {
  height: 46px;

  display: flex;
  align-items: center;

  gap: 13px;

  padding: 0 13px;

  border-radius: 10px;

  color: #6c7380;

  font-size: 14px;

  margin-bottom: 4px;

  text-decoration: none;
}

.nav-item span {
  font-size: 17px;
}

.nav-item.active {
  background: #f0f0ff;
  color: #5758d8;
  font-weight: 600;
}

.sidebar-bottom {
  margin-top: auto;
}

.streak-box {
  background: #fff7e8;

  border-radius: 13px;

  padding: 14px;

  display: flex;
  align-items: center;

  gap: 12px;
}

.fire {
  font-size: 25px;
}

.streak-box strong {
  display: block;
  font-size: 14px;
}

.streak-box span {
  font-size: 11px;
  color: #999;
}

/* ==================== */
/* Main */
/* ==================== */

.main {
  flex: 1;
  min-width: 0;
  padding: 35px 48px;

  max-width: 1450px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  margin-bottom: 30px;
}

.welcome {
  font-size: 13px;
  color: #8d94a0;

  margin-bottom: 7px;
}

.header h1 {
  font-size: 26px;
}

.user {
  display: flex;
  align-items: center;
  gap: 11px;
}

.avatar {
  width: 40px;
  height: 40px;

  border-radius: 50%;

  background: #dedfff;
  color: #5557d6;

  display: flex;
  align-items: center;
  justify-content: center;

  font-weight: 700;
}

.user strong {
  display: block;
  font-size: 13px;
}

.user span {
  font-size: 11px;
  color: #999;
}

/* ==================== */
/* Hero */
/* ==================== */

.hero-card {
  min-height: 245px;

  border-radius: 22px;

  background: linear-gradient(120deg, #5b5ce2, #7374ee);

  color: white;

  padding: 38px 45px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  box-shadow: 0 15px 40px rgba(91, 92, 226, 0.2);
}

.tag {
  font-size: 10px;
  letter-spacing: 1.5px;

  opacity: 0.75;
}

.hero-left h2 {
  font-size: 27px;
  margin-top: 12px;
  margin-bottom: 10px;
}

.hero-left p {
  max-width: 430px;

  font-size: 13px;
  line-height: 1.7;

  opacity: 0.85;
}

.start-button {
  margin-top: 22px;

  border: none;

  background: white;
  color: #5758d8;

  padding: 12px 22px;

  border-radius: 9px;

  font-size: 13px;
  font-weight: 600;
}

.progress-circle {
  padding-left: 24px;
  flex-shrink: 0;
}

.circle {
  width: 145px;
  height: 145px;

  border-radius: 50%;

  padding: 8px;

  display: flex;
  flex-direction: column;

  align-items: center;
  justify-content: center;
}

.circle strong {
  font-size: 28px;
}

.circle span {
  font-size: 11px;
  opacity: 0.8;
}

/* ==================== */
/* Stats */
/* ==================== */

.stats {
  display: grid;

  grid-template-columns: repeat(4, 1fr);

  gap: 17px;

  margin: 22px 0;
}

.stat-card {
  background: white;

  border: 1px solid #eaedf2;

  border-radius: 15px;

  padding: 20px;

  display: flex;
  align-items: center;

  gap: 14px;
}

.stat-icon {
  width: 42px;
  height: 42px;

  border-radius: 11px;

  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 19px;
}

.blue {
  background: #eef0ff;
}

.orange {
  background: #fff2df;
}

.green {
  background: #e9f8ef;
}

.purple {
  background: #f4edff;
}

.stat-card span {
  display: block;

  color: #9298a2;

  font-size: 11px;
}

.stat-card strong {
  display: block;

  font-size: 22px;

  margin: 2px 0;
}

.stat-card small {
  color: #65ae80;

  font-size: 10px;
}

/* ==================== */
/* Bottom */
/* ==================== */

.content-grid {
  display: grid;

  grid-template-columns: 1.5fr 1fr;

  gap: 20px;
}

.panel {
  background: white;

  border: 1px solid #eaedf2;

  border-radius: 17px;

  padding: 25px;
}

.panel-header {
  display: flex;

  justify-content: space-between;

  align-items: center;

  margin-bottom: 22px;
}

.panel-label {
  font-size: 9px;
  color: #8589d9;
  letter-spacing: 1px;
}

.panel h3 {
  font-size: 18px;
  margin-top: 4px;
}

.more {
  font-size: 11px;
  color: #6668d9;
}

.task {
  display: flex;

  align-items: center;

  gap: 13px;

  padding: 13px 0;

  border-top: 1px solid #f0f1f4;
}

.task-icon {
  width: 38px;
  height: 38px;

  border-radius: 10px;

  background: #f4f5f8;

  display: flex;
  align-items: center;
  justify-content: center;
}

.task-info {
  flex: 1;
}

.task-info strong {
  display: block;

  font-size: 13px;
}

.task-info span {
  font-size: 10px;
  color: #999;

  display: block;

  margin: 2px 0 7px;
}

.bar {
  height: 5px;

  background: #edf0f3;

  border-radius: 10px;

  overflow: hidden;
}

.bar-progress {
  height: 100%;

  background: #6264df;

  border-radius: 10px;
}

.green-progress {
  background: #5cb77d;
}

.purple-progress {
  background: #9b71df;
}

.task-number {
  font-size: 10px;
  color: #858b95;
}

/* ==================== */
/* AI */
/* ==================== */

.ai-panel {
  border-radius: 17px;

  padding: 28px;

  background: #202331;

  color: white;

  position: relative;

  overflow: hidden;
}

.ai-panel::after {
  content: "";

  position: absolute;

  width: 160px;
  height: 160px;

  border-radius: 50%;

  background: #5c5edf;

  opacity: 0.15;

  right: -60px;
  top: -50px;
}

.ai-icon {
  font-size: 28px;

  margin-bottom: 14px;
}

.ai-label {
  font-size: 9px;

  letter-spacing: 1.5px;

  color: #a8a9ff;
}

.ai-panel h3 {
  font-size: 20px;

  margin: 10px 0;
}

.ai-panel p {
  font-size: 12px;

  color: #b5b8c2;

  line-height: 1.8;

  max-width: 320px;
}

.ai-button {
  margin-top: 22px;

  border: none;

  background: #6869e9;

  color: white;

  padding: 11px 18px;

  border-radius: 8px;

  font-size: 12px;
}

/* ==================== */
/* Responsive */
/* ==================== */

@media (max-width: 1000px) {
  .sidebar {
    width: 200px;
  }

  .main {
    padding: 25px;
  }

  .stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .sidebar {
    display: none;
  }

  .main {
    padding: 20px;
  }

  .hero-card {
    padding: 25px;
  }

  .progress-circle {
    display: none;
  }

  .stats {
    grid-template-columns: 1fr;
  }
}
</style>

<style scoped>
.skip-link { position:fixed; top:12px; left:12px; z-index:1100; padding:12px 18px; border-radius:8px; background:#fff; color:#3436a3; transform:translateY(-160%); }
.skip-link:focus { transform:translateY(0); }
.local-note { color:#64748b; font-size:12px; line-height:1.7; text-align:right; }
.header { gap:16px; }
.circle-inner { width:100%; height:100%; border-radius:50%; background:#6769e8; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5px; }
.hero-left .goal-caption { margin-top:16px; opacity:1; }
.text-button { border:0; background:transparent; color:inherit; text-decoration:underline; text-underline-offset:4px; padding:8px; margin-left:6px; }
.learning-settings { max-width:600px; }
.learning-settings label { display:grid; gap:10px; font-weight:600; margin-top:24px; }
.learning-settings input { width:160px; font-weight:400; }
.learning-settings p,.data-note { font-size:13px; color:#64748b; }
.goal-presets { display:flex; gap:8px; flex-wrap:wrap; }
.goal-presets button { padding:9px 14px; border:1px solid #d8dbea; border-radius:8px; background:#fff; color:#475569; }
.goal-presets button[aria-pressed=true] { background:#eeeeff; border-color:#5b5ce2; color:#4142b8; }
.skills-section,.recent-practice { margin-top:28px; }
.skills-section h2,.recent-practice h2,.panel h2 { font-size:20px; }
.skills-section .panel-header p { font-size:14px; color:#64748b; margin-top:10px; }
.skill-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; }
.skill-card { display:flex; flex-direction:column; gap:12px; padding:22px; background:#fff; border:1px solid #e8ebf0; border-radius:17px; }
.skill-icon { font-size:26px; }
.skill-card h3 { font-size:17px; }
.skill-card p { flex:1; font-size:13px; line-height:1.8; color:#64748b; }
.skill-card a,.skill-card button { display:block; padding:10px 0; border:0; background:transparent; text-align:left; color:#4849b8; text-decoration:none; font-size:14px; font-weight:600; }
.recent-practice ul { list-style:none; }
.recent-practice li { padding:16px 0; border-top:1px solid #e8ebf0; display:flex; justify-content:space-between; align-items:center; gap:16px; }
.recent-practice li div { min-width:0; overflow-wrap:anywhere; }
.recent-practice li strong { font-size:14px; }
.recent-practice li span { display:block; color:#64748b; font-size:12px; margin-top:8px; line-height:1.6; }
.recent-practice button { flex-shrink:0; border:1px solid #d8dbea; background:#fff; padding:10px 12px; border-radius:8px; color:#4849b8; }
.mobile-actions button { background:white; border:1px solid #d8dbea; color:#475569; border-radius:8px; padding:10px 14px; }
.mobile-actions button[aria-current=page] { background:#5b5ce2; border-color:#5b5ce2; color:white; }
.nav-item:hover { background:#f4f4ff; }
.task-info span { color:#64748b; font-size:12px; line-height:1.6; }
@media(max-width:1150px) { .skill-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media(max-width:700px) { .header h1 { font-size:24px; }.header { align-items:flex-start; }.welcome { max-width:230px; line-height:1.6; }.local-note { display:none; }.hero-left h2 { font-size:23px; }.skill-card { padding:18px; }.skill-card h3 { font-size:16px; }.recent-practice li { align-items:flex-start; flex-direction:column; }.stats { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }.stat-card { padding:14px; gap:8px; }.stat-icon { display:none; }.stat-card span { color:#64748b; font-size:12px; }.stat-card small { color:#527160; font-size:11px; }.main { padding:20px 16px; } }
@media(max-width:360px) { .skill-grid { grid-template-columns:1fr; } }
</style>

<style scoped>
.task-action { width: 100%; background: transparent; border-right: 0; border-left: 0; border-bottom: 0; text-align: left; color: inherit; }
.task-action:hover { background: #f7f8fc; }
.show-control { border: 0; border-radius: 8px; padding: 10px 14px; background: #5b5ce2; color: white; }
.panel p { margin: 14px 0; line-height: 1.8; }
input { max-width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; }
.mobile-actions { display: none; }
@media (max-width: 700px) { .mobile-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; } }
</style>
