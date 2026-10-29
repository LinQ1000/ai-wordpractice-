<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{ kind: 'listening' | 'writing' | 'speaking' }>();
const names = { listening: '听力', writing: '写作', speaking: '口语' };
const descriptions = {
  listening: '选择题、填空与图表题等官方样题，提供在线练习、答案及录音文本入口。',
  writing: '学术类 Task 1 图表题与 Task 2 议论文官方样题。',
  speaking: '官方口语模拟练习，了解 Part 1–3 的任务形式。  ',
};
const resources = computed(() => [
  {
    title: `British Council · ${names[props.kind]}练习`,
    description: descriptions[props.kind],
    url: `https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests/academic/${props.kind}`,
    source: 'British Council',
  },
  {
    title: 'IELTS 官方样题汇总',
    description: '包含听力、学术类写作与口语样题，以及可用的 PDF、答案和在线练习入口。',
    url: 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test',
    source: 'IELTS.org',
  },
]);
</script>

<template>
  <section class="official-resources" :aria-label="`官方${names[kind]}练习资源`">
    <div class="resource-heading"><h2>官方{{ names[kind] }}练习资源</h2><span>官方样题 / 模拟练习</span></div>
    <p class="intro">选择资源，在新标签页打开官方练习。</p>
    <div class="resource-grid">
      <article v-for="resource in resources" :key="resource.url" class="resource-card">
        <span class="source">{{ resource.source }}</span>
        <h3>{{ resource.title }}</h3><p>{{ resource.description }}</p>
        <a :href="resource.url" target="_blank" rel="noopener noreferrer">打开官方练习 ↗<span class="sr-only">（新标签页）</span></a>
      </article>
    </div>
    <p class="resource-note">以上为外部官方资源，练习记录保留在各自网站；本站题库可通过 JSON 导入补充。资源链接核查日期：2026-10-15。</p>
  </section>
</template>

<style scoped>
.official-resources { padding:26px; border:1px solid #e8eaf0; background:white; border-radius:18px; margin-bottom:24px; }
.resource-heading { display:flex; align-items:center; flex-wrap:wrap; gap:12px; }.resource-heading h2 { font-size:20px; margin:0; }.resource-heading span { background:#eeeeff; color:#5758d8; padding:5px 10px; border-radius:20px; font-size:12px; }
.intro,.resource-note { color:#747b89; font-size:13px; line-height:1.7; margin:12px 0; }.resource-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }.resource-card { padding:20px; border:1px solid #e8eaf0; border-radius:12px; background:#fafbff; }.source { color:#6668d9; font-size:12px; }.resource-card h3 { font-size:17px; margin:10px 0; }.resource-card p { color:#747b89; line-height:1.7; font-size:14px; margin:12px 0 18px; }.resource-card a { display:inline-block; border-radius:8px; padding:10px 14px; color:white; background:#5b5ce2; text-decoration:none; font-size:14px; }.resource-card a:hover { background:#494bc7; }.resource-card a:focus-visible { outline:3px solid #292b80; outline-offset:3px; }.sr-only { position:absolute; width:1px; height:1px; padding:0; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
@media(max-width:650px) { .resource-grid { grid-template-columns:1fr; }.official-resources { padding:18px; } }
</style>
