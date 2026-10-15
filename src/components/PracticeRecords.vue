<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import { practiceHistory, historyError, exportPractice, type PracticeRecord, type Skill } from '../stores/practiceHistory';

const props = defineProps<{ skill: Skill }>();
const instanceId = useId();
const query = ref('');
const expandedId = ref<string | null>(null);
const copying = ref(false);
const notice = ref('');
const noticeIsError = ref(false);
const noticeRecordId = ref<string | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const records = computed(() => practiceHistory.value.filter(record => record.skill === props.skill)
  .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)));
const searchTerm = computed(() => query.value.normalize('NFKC').trim().toLocaleLowerCase());
const visibleRecords = computed(() => records.value.filter(record => !searchTerm.value ||
  [record.title, record.summary, record.content].some(value =>
    value.normalize('NFKC').toLocaleLowerCase().includes(searchTerm.value))));
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
});

function formattedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '日期未记录' : dateFormatter.format(date);
}

function dateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function contentId(id: string) {
  return `${instanceId}-record-${encodeURIComponent(id)}`;
}

function recordText(record: PracticeRecord) {
  return `${record.title}\n练习时间：${formattedDate(record.date)}\n${record.summary}\n\n${record.content}`;
}

function showNotice(message: string, isError = false, recordId: string | null = null) {
  notice.value = message;
  noticeIsError.value = isError;
  noticeRecordId.value = recordId;
}

function clearSearch() {
  query.value = '';
  searchInput.value?.focus();
}

async function copyRecord(record: PracticeRecord) {
  const activeSkill = props.skill;
  copying.value = true;
  notice.value = '';
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(recordText(record));
    if (activeSkill === props.skill) showNotice('已复制本条练习的题目、时间和内容。', false, record.id);
  } catch {
    if (activeSkill === props.skill) showNotice('复制失败。你可以导出本条文本，或直接选中下方内容复制。', true, record.id);
  } finally {
    copying.value = false;
  }
}

function downloadRecord(record: PracticeRecord) {
  let url: string | undefined;
  try {
    const blob = new Blob([recordText(record)], { type: 'text/plain;charset=utf-8' });
    url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = record.title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').trim().slice(0, 80) || '练习记录';
    link.download = `${safeTitle}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    showNotice('已准备好本条文本，请在浏览器下载列表中查看。', false, record.id);
  } catch {
    showNotice('文本导出失败，你仍可以选中练习内容并手动复制。', true, record.id);
  } finally {
    const downloadUrl = url;
    if (downloadUrl) setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }
}

function exportAll() {
  try {
    exportPractice(props.skill);
    showNotice(`已准备好全部 ${records.value.length} 条记录，格式为 JSON。`);
  } catch {
    showNotice('记录导出失败，请稍后重试，或展开记录导出单条文本。', true);
  }
}

watch(() => props.skill, () => {
  query.value = '';
  expandedId.value = null;
  notice.value = '';
  noticeRecordId.value = null;
});

watch(visibleRecords, (items) => {
  if (!items.some(record => record.id === expandedId.value)) expandedId.value = null;
});
</script>

<template>
  <section class="panel practice-records" :aria-labelledby="`${instanceId}-heading`">
    <header class="records-header">
      <div>
        <h2 :id="`${instanceId}-heading`">📝 练习记录</h2>
        <p class="records-description">回顾回答与反馈，看看自己每一次的进步。</p>
      </div>
      <button type="button" class="export-button" :disabled="!records.length" @click="exportAll">导出全部记录</button>
    </header>
    <p class="storage-note">记录保存在当前浏览器中，换设备前可先导出备份。</p>
    <p v-if="historyError" class="message error-message" role="alert">{{ historyError }}</p>
    <p v-if="notice && !noticeRecordId" class="message" :class="{ 'error-message': noticeIsError }" role="status">{{ notice }}</p>

    <div v-if="records.length" class="search-area">
      <label :for="`${instanceId}-search`">查找以前的练习</label>
      <div class="search-row">
        <input :id="`${instanceId}-search`" ref="searchInput" v-model="query" type="search"
          placeholder="搜索题目、摘要或回答内容" autocomplete="off" @keydown.esc="clearSearch" />
        <button v-if="query" type="button" class="secondary-button" @click="clearSearch">清除搜索</button>
      </div>
      <p class="result-count" role="status" aria-live="polite">
        <template v-if="searchTerm">找到 {{ visibleRecords.length }} 条，共 {{ records.length }} 条记录</template>
        <template v-else>共 {{ records.length }} 条记录 · 最近练习在前</template>
      </p>
    </div>

    <div v-if="!records.length" class="empty-state">
      <span class="empty-icon" aria-hidden="true">📖</span>
      <h3>你的学习足迹，从第一次练习开始</h3>
      <p>前往题库选择一道题，完成并保存练习后，就能在这里回顾回答和反馈。</p>
    </div>
    <div v-else-if="!visibleRecords.length" class="empty-state">
      <h3>没有找到相关练习</h3>
      <p>试试更短的关键词，或者清除搜索，查看全部记录。</p>
      <button type="button" class="secondary-button" @click="clearSearch">查看全部记录</button>
    </div>

    <article v-for="record in visibleRecords" :key="record.id" class="record-card">
      <div class="record-heading">
        <h3>{{ record.title }}</h3>
        <time :datetime="dateTime(record.date)">{{ formattedDate(record.date) }}</time>
      </div>
      <p class="record-summary">{{ record.summary }}</p>
      <button type="button" class="expand-button" :aria-expanded="expandedId === record.id"
        :aria-controls="expandedId === record.id ? contentId(record.id) : undefined"
        :aria-label="`${expandedId === record.id ? '收起练习内容' : '查看练习内容'}：${record.title}`"
        @click="expandedId = expandedId === record.id ? null : record.id">
        {{ expandedId === record.id ? '收起练习内容' : '查看练习内容' }}
        <span aria-hidden="true">{{ expandedId === record.id ? '⌃' : '⌄' }}</span>
      </button>
      <div v-if="expandedId === record.id" :id="contentId(record.id)" class="record-details">
        <div class="record-actions">
          <button type="button" class="secondary-button" :disabled="copying" @click="copyRecord(record)">{{ copying ? '正在复制…' : '复制本条内容' }}</button>
          <button type="button" class="secondary-button" @click="downloadRecord(record)">导出本条文本</button>
        </div>
        <p v-if="notice && noticeRecordId === record.id" class="message" :class="{ 'error-message': noticeIsError }" role="status">{{ notice }}</p>
        <pre>{{ record.content || '这条记录没有保存详细内容。' }}</pre>
      </div>
    </article>
  </section>
</template>

<style scoped>
.practice-records { min-width: 0; }
.records-header, .record-heading, .search-row, .record-actions { display: flex; align-items: center; gap: 12px; }
.records-header, .record-heading { justify-content: space-between; }
h2, h3, p { margin: 0; }
h2 { font-size: 23px; }
.records-description { margin-top: 8px; color: #475569; line-height: 1.7; }
.storage-note { margin-top: 16px; color: #64748b; font-size: 13px; line-height: 1.7; }
button { min-height: 42px; padding: 9px 15px; border: 1px solid transparent; border-radius: 9px; font: inherit; cursor: pointer; transition: background-color .15s; }
button:disabled { opacity: .5; cursor: not-allowed; }
button:focus-visible, input:focus-visible { outline: 3px solid #818cf8; outline-offset: 3px; }
.export-button { flex-shrink: 0; background: #4f46c5; color: white; }
.export-button:hover:not(:disabled) { background: #4338a9; }
.secondary-button { background: #fff; border-color: #cbd5e1; color: #334155; }
.secondary-button:hover:not(:disabled) { background: #f1f5f9; }
.message { margin-top: 16px; padding: 11px 14px; border-radius: 9px; background: #eff6ff; color: #1e40af; line-height: 1.65; overflow-wrap: anywhere; }
.error-message { background: #fff7ed; color: #9a3412; }
.search-area { margin-top: 24px; }
.search-area label { display: block; margin-bottom: 9px; font-weight: 600; color: #334155; }
.search-row input { flex: 1; width: 100%; min-width: 0; min-height: 46px; padding: 10px 13px; border: 1px solid #cbd5e1; border-radius: 9px; background: #fff; color: #0f172a; font: inherit; }
.search-row button { flex-shrink: 0; }
.result-count { margin-top: 10px; color: #64748b; font-size: 13px; }
.empty-state { margin-top: 24px; padding: 36px 20px; border: 1px dashed #cbd5e1; border-radius: 12px; background: #ffffff70; text-align: center; }
.empty-icon { display: block; margin-bottom: 12px; font-size: 32px; }
.empty-state h3 { font-size: 17px; color: #334155; }
.empty-state p { max-width: 440px; margin: 12px auto; color: #64748b; line-height: 1.8; }
.record-card { margin-top: 18px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffffa8; min-width: 0; }
.record-heading { align-items: flex-start; flex-wrap: wrap; gap: 8px 16px; }
.record-heading h3 { flex: 1 1 200px; font-size: 17px; line-height: 1.5; color: #1e293b; overflow-wrap: anywhere; }
time { flex-shrink: 0; font-size: 13px; color: #64748b; line-height: 1.9; }
.record-summary { margin-top: 10px; color: #475569; line-height: 1.7; overflow-wrap: anywhere; }
.expand-button { display: inline-flex; align-items: center; gap: 12px; margin-top: 10px; padding-left: 0; color: #4338ca; background: transparent; }
.expand-button:hover { color: #312e81; text-decoration: underline; }
.record-details { padding-top: 12px; border-top: 1px solid #e2e8f0; }
.record-actions { flex-wrap: wrap; }
pre { margin: 14px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; font: inherit; font-size: 14px; line-height: 1.85; padding: 16px; border-radius: 10px; color: #334155; background: #f8fafc; }
@media (max-width: 600px) {
  .records-header { align-items: flex-start; flex-direction: column; }
  h2 { font-size: 21px; }
  .search-row { flex-wrap: wrap; }
  .search-row input { flex-basis: 100%; }
  .record-card { padding: 16px; }
  .record-heading h3 { flex-basis: 100%; }
  pre { padding: 12px; }
}
</style>
