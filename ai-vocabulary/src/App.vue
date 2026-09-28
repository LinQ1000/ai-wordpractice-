<script setup>
import { ref } from "vue";
import Study from "./Study.vue";

const currentPage = ref("home");

function startStudy() {
  currentPage.value = "study";
}
</script>

<template>
  <Study v-if="currentPage === 'study'" />

  <div v-else class="app">
    <!-- 左侧菜单 -->
    <aside class="sidebar">
      <div class="logo">
        <div class="logo-icon">A</div>
        <div>
          <h2>AI Vocabulary</h2>
          <span>Smart English Learning</span>
        </div>
      </div>

      <nav>
        <div class="nav-title">学习</div>

        <a class="nav-item active">
          <span>🏠</span>
          首页
        </a>

        <a class="nav-item">
          <span>📖</span>
          背单词
        </a>

        <a class="nav-item">
          <span>🔄</span>
          智能复习
        </a>

        <a class="nav-item">
          <span>❌</span>
          错题本
        </a>

        <div class="nav-title">数据</div>

        <a class="nav-item">
          <span>📊</span>
          学习统计
        </a>

        <a class="nav-item">
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
    <main class="main">
      <!-- 顶部 -->
      <header class="header">
        <div>
          <p class="welcome">Good Evening 👋</p>
          <h1>准备好学习了吗？</h1>
        </div>

        <div class="user">
          <div class="avatar">L</div>
          <div>
            <strong>Student</strong>
            <span>学习者</span>
          </div>
        </div>
      </header>

      <!-- 今日学习 -->
      <section class="hero-card">
        <div class="hero-left">
          <span class="tag">TODAY'S LEARNING</span>

          <h2>今天继续学习吧</h2>

          <p>坚持每天学习一点点， 你的英语词汇量会越来越丰富。</p>

          <button class="start-button">开始学习 →</button>
        </div>

        <div class="progress-circle">
          <div class="circle">
            <strong>72%</strong>
            <span>完成度</span>
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
            <small>+12 本周</small>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon orange">🎯</div>
          <div>
            <span>今日正确率</span>
            <strong>{{ accuracy }}%</strong>
            <small>+4% 比昨天</small>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon green">⏱️</div>
          <div>
            <span>学习时间</span>
            <strong>42 min</strong>
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

            <span class="more">查看全部 →</span>
          </div>

          <div class="task">
            <div class="task-icon">📖</div>

            <div class="task-info">
              <strong>新单词</strong>
              <span>学习 20 个新单词</span>

              <div class="bar">
                <div class="bar-progress" style="width: 65%"></div>
              </div>
            </div>

            <span class="task-number">13 / 20</span>
          </div>

          <div class="task">
            <div class="task-icon">🔄</div>

            <div class="task-info">
              <strong>间隔复习</strong>
              <span>复习 12 个单词</span>

              <div class="bar">
                <div
                  class="bar-progress green-progress"
                  style="width: 40%"
                ></div>
              </div>
            </div>

            <span class="task-number">5 / 12</span>
          </div>

          <div class="task">
            <div class="task-icon">🧠</div>

            <div class="task-info">
              <strong>AI 练习</strong>
              <span>AI 生成情景练习</span>

              <div class="bar">
                <div
                  class="bar-progress purple-progress"
                  style="width: 20%"
                ></div>
              </div>
            </div>

            <span class="task-number">1 / 5</span>
          </div>
        </div>

        <!-- AI 助手 -->
        <div class="ai-panel">
          <div class="ai-icon">✨</div>

          <span class="ai-label">AI LEARNING ASSISTANT</span>

          <h3>让 AI 帮你记住单词</h3>

          <p>
            不只是告诉你单词的意思， AI 会根据你的学习情况生成
            例句、记忆技巧和个性化练习。
          </p>

          <button class="start-button" @click="startStudy">开始学习 →</button>
        </div>
      </section>
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
  padding-right: 55px;
}

.circle {
  width: 145px;
  height: 145px;

  border-radius: 50%;

  border: 9px solid rgba(255, 255, 255, 0.25);

  border-top-color: white;

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
