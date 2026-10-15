<script setup lang="ts">
export type Section = 'overview' | 'browse' | 'records' | 'more' | 'settings';
defineProps<{ title: string; section: Section }>();
const emit = defineEmits<{ 'update:section': [Section]; back: [] }>();
const tabs: { id: Section; label: string }[] = [{id:'overview',label:'📊 总览'},{id:'browse',label:'📚 题库浏览'},{id:'records',label:'📝 练习记录'},{id:'more',label:'✨ 更多'},{id:'settings',label:'⚙️ 设置'}];
</script>
<template>
  <div class="ielts-module"><main class="ielts-shell">
    <header class="module-header"><div class="brand"><img src="/ielts/assets/images/logo.svg" alt=""><div><h1>IELTS {{ title }}</h1><p>学习、练习与记录</p></div></div><button class="home-button" @click="emit('back')">← 返回首页</button></header>
    <nav class="module-nav" :aria-label="title + '模块导航'"><button v-for="tab in tabs" :key="tab.id" :class="{active:section===tab.id}" :aria-current="section===tab.id ? 'page' : undefined" @click="emit('update:section',tab.id)">{{ tab.label }}</button></nav>
    <div class="module-content"><slot /></div>
    <footer>界面样式参考 IELTS Atlas · <a href="/ielts/LICENSE" target="_blank" rel="noopener">GPL-3.0</a></footer>
  </main></div>
</template>
<style scoped>
.ielts-module { min-height:100vh; padding:28px 24px; color:#0f172a; background:radial-gradient(ellipse at 10% 0%,#fff2d8,transparent 50%),radial-gradient(ellipse at 90% 20%,#daf4ef,transparent 55%),#fbfffd; }
.ielts-shell { max-width:1400px; margin:auto; }.module-header { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:18px 0 30px; }.brand { display:flex; gap:16px; align-items:center; }.brand img { width:56px; height:56px; }.brand h1 { font-size:30px; margin:0; }.brand p { font-size:13px; color:#64748b; margin:6px 0 0; }.home-button { padding:10px 16px; border:1px solid #e2e8f0; border-radius:999px; background:#ffffffb3; color:#334155; }
.module-nav { display:flex; gap:4px; padding:6px; border-radius:999px; border:1px solid #ffffffb3; background:rgba(245,245,247,.55); box-shadow:0 4px 16px #0000000a,inset 0 -1px 1px #ffffffcc; backdrop-filter:blur(24px) saturate(160%); margin-bottom:28px; }.module-nav button { flex:1; border:1px solid transparent; background:transparent; color:rgba(60,60,67,.7); padding:12px 14px; border-radius:999px; font-weight:600; font-size:15px; cursor:pointer; }.module-nav button:hover,.module-nav button.active { color:#1d1d1f; background:#ffffffaa; box-shadow:0 2px 10px #00000008,inset 0 1px 1px #ffffffb3; }.module-nav button:focus-visible { outline:2px solid #5758d8; }
.module-content :deep(.panel),.module-content :deep(.bank-panel),.module-content :deep(.practice-panel),.module-content :deep(.official-resources) { background:rgba(255,255,255,.65); border:1px solid rgba(255,255,255,.7); border-radius:28px; padding:clamp(22px,3vw,40px); box-shadow:0 20px 40px #0000000d,inset 0 1px 1px #ffffff99; backdrop-filter:blur(24px); margin-bottom:24px; }
.module-content :deep(.overview-grid) { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; margin:24px 0; }.module-content :deep(.metric) { background:#ffffffb3; border:1px solid #e2e8f0; padding:24px; border-radius:20px; }.module-content :deep(.metric strong) { display:block; font-size:30px; margin:10px 0; }.module-content :deep(.browse-grid) { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:16px; margin:20px 0; }.module-content :deep(.exam-card) { padding:22px; border:1px solid #e2e8f0; border-radius:20px; background:#ffffffb3; }.module-content :deep(.search) { width:100%; margin:16px 0; }footer { text-align:center; font-size:12px; color:#64748b; padding:20px; }
@media(max-width:650px) { .ielts-module { padding:16px 12px; }.module-nav { border-radius:20px; flex-wrap:wrap; }.module-nav button { flex:1 0 28%; padding:10px 6px; }.brand h1 { font-size:24px; }.brand img { width:40px; height:40px; }.module-content :deep(.overview-grid) { grid-template-columns:1fr; } }
</style>
