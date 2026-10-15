<script setup>
import { ref, computed } from "vue";

const words = [
  {
    word: "abandon",
    phonetic: "/əˈbændən/",
    meaning: "放弃；抛弃",
    example: "Don't abandon your dreams.",
    translation: "不要放弃你的梦想。",
    level: "CET-4",
    interval: 1,
    repetitions: 0,
  },
  {
    word: "accurate",
    phonetic: "/ˈækjərət/",
    meaning: "准确的；精确的",
    example: "The information must be accurate.",
    translation: "这些信息必须是准确的。",
    level: "CET-4",
    interval: 1,
    repetitions: 0,
  },
  {
    word: "benefit",
    phonetic: "/ˈbenɪfɪt/",
    meaning: "好处；受益",
    example: "Exercise has many health benefits.",
    translation: "运动对健康有很多好处。",
    level: "CET-4",
    interval: 1,
    repetitions: 0,
  },
  {
    word: "complex",
    phonetic: "/ˈkɑːmpleks/",
    meaning: "复杂的；复杂系统",
    example: "This is a complex problem.",
    translation: "这是一个复杂的问题。",
    level: "CET-4",
    interval: 1,
    repetitions: 0,
  },
  {
    word: "efficient",
    phonetic: "/ɪˈfɪʃənt/",
    meaning: "高效的；有效率的",
    example: "She is an efficient worker.",
    translation: "她是一名高效的工作人员。",
    level: "CET-4",
    interval: 1,
    repetitions: 0,
  },
];

const currentIndex = ref(0);
const showAnswer = ref(false);
const completed = ref(0);

const currentWord = computed(() => {
  return words[currentIndex.value];
});

const progress = computed(() => {
  return Math.round((completed.value / words.length) * 100);
});

function showWordAnswer() {
  showAnswer.value = true;
}
function answer(type) {
  const word = words[currentIndex.value];

  // 不认识
  if (type === "hard") {
    word.interval = 0;

    word.repetitions = 0;

    console.log(`${word.word}：不认识，下次尽快复习`);
  }

  // 模糊
  if (type === "normal") {
    word.interval = 1;

    console.log(`${word.word}：模糊，1天后复习`);
  }

  // 认识
  if (type === "easy") {
    word.repetitions++;

    /*
     * 简化版 SRS 算法
     *
     * 第一次：1天
     * 第二次：3天
     * 第三次：7天
     * 第四次：14天
     * 第五次：30天
     */

    const intervals = [1, 3, 7, 14, 30];

    const index = Math.min(word.repetitions - 1, intervals.length - 1);

    word.interval = intervals[index];

    console.log(`${word.word}：认识，下次 ${word.interval} 天后复习`);
  }

  completed.value++;

  // 下一个单词
  if (currentIndex.value < words.length - 1) {
    currentIndex.value++;

    showAnswer.value = false;
  } else {
    alert("🎉 今天的学习任务完成了！");
  }
}

function speak() {
  const text = currentWord.value.word;

  if ("speechSynthesis" in window) {
    const speech = new SpeechSynthesisUtterance(text);

    speech.lang = "en-US";
    speech.rate = 0.8;

    window.speechSynthesis.speak(speech);
  }
}
</script>

<template>
  <div class="study-page">
    <!-- 顶部 -->
    <header class="study-header">
      <button class="back-button">← 返回</button>

      <div class="header-title">
        <span>AI VOCABULARY</span>
        <h1>今日单词</h1>
      </div>

      <div class="progress-text">{{ completed }} / {{ words.length }}</div>
    </header>

    <!-- 进度条 -->
    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress" :style="{ width: progress + '%' }"></div>
      </div>

      <span>{{ progress }}%</span>
    </div>

    <!-- 单词卡片 -->
    <main class="study-content">
      <div class="word-card">
        <div class="word-level">
          {{ currentWord.level }}
        </div>

        <h2>
          {{ currentWord.word }}
        </h2>

        <div class="phonetic">
          {{ currentWord.phonetic }}

          <button class="sound-button" @click="speak">🔊</button>
        </div>

        <!-- 未显示答案 -->
        <div v-if="!showAnswer" class="question-area">
          <p class="question">你知道这个单词的意思吗？</p>

          <button class="show-button" @click="showWordAnswer">查看释义</button>
        </div>

        <!-- 显示答案 -->
        <div v-else class="answer-area">
          <div class="meaning">
            {{ currentWord.meaning }}
          </div>

          <div class="example">
            <div class="example-title">Example</div>

            <p>
              {{ currentWord.example }}
            </p>

            <span>
              {{ currentWord.translation }}
            </span>
          </div>

          <div class="ai-tip">
            <span>✨ AI 记忆提示</span>

            <p>
              想象你正在放弃一件重要的事情， 把它彻底“扔掉”，这就是
              <strong>{{ currentWord.word }}</strong
              >。
            </p>
          </div>
        </div>
      </div>

      <!-- 答题按钮 -->
      <div v-if="showAnswer" class="answer-buttons">
        <button class="answer-button hard" @click="answer('hard')">
          <span>😵</span>
          <strong>不认识</strong>
          <small>很难</small>
        </button>

        <button class="answer-button normal" @click="answer('normal')">
          <span>🤔</span>
          <strong>模糊</strong>
          <small>需要复习</small>
        </button>

        <button class="answer-button easy" @click="answer('easy')">
          <span>😎</span>
          <strong>认识</strong>
          <small>记住了</small>
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
