<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { ReadingExam } from './model';
import { lookupWord } from './repository';
import { readingWords, saveReadingWord, readingStorageWarning } from './storage';
const props=defineProps<{word:string;example:string;exam:ReadingExam}>();
const emit=defineEmits<{close:[]}>();
const normalized=props.word.toLowerCase().replace(/[’‘]/g,"'").trim();
const existing=readingWords.value.find(w=>w.word.toLowerCase()===normalized);
const meaning=ref(existing?.meaning||'');const phonetic=ref(existing?.phonetic||'');const note=ref('正在查询本地词典…');const input=ref<HTMLInputElement>();let disposed=false;
function close(event:KeyboardEvent){if(event.key==='Escape')emit('close');}
onMounted(async()=>{input.value?.focus();document.addEventListener('keydown',close);if(existing){note.value='此词已在阅读生词库中，可以更新释义。';return;}try{const result=await lookupWord(normalized);if(disposed)return;if(result){if(!meaning.value)meaning.value=result.meaning;phonetic.value=result.phonetic||'';note.value='释义来自本地词典，可根据文章语境修改。';}else note.value='词典暂未收录，请填写释义后加入。';}catch(error){if(!disposed)note.value=(error as Error).message;}});
onUnmounted(()=>{disposed=true;document.removeEventListener('keydown',close);});
function save(){if(!meaning.value.trim())return;const saved=saveReadingWord({word:normalized,meaning:meaning.value.trim(),phonetic:phonetic.value,example:props.example,addedAt:existing?.addedAt||new Date().toISOString(),examId:props.exam.id,sourceTitle:props.exam.title,source:props.exam.source});if(saved)emit('close');}
</script>
<template><div class="rp-modal-backdrop" @click.self="emit('close')"><section class="rp-dialog" role="dialog" aria-modal="true" aria-labelledby="word-title"><div class="rp-row"><div><span class="rp-eyebrow">READING VOCABULARY</span><h2 id="word-title">{{word}}</h2></div><button class="rp-icon-button" aria-label="关闭生词窗口" @click="emit('close')">×</button></div><p class="rp-muted" role="status">{{note}}</p><form @submit.prevent="save"><label class="rp-field">中文释义 / 语境含义<input ref="input" v-model="meaning" required maxlength="500" placeholder="填写在这篇文章中的含义"></label><p v-if="phonetic" class="rp-muted">{{phonetic}}</p><blockquote class="rp-quote">{{example}}</blockquote><p class="rp-caption">来源：{{exam.title}} · {{exam.source.label}}</p><p v-if="readingStorageWarning" role="alert" class="rp-error">{{readingStorageWarning}}</p><div class="rp-row rp-actions"><button class="rp-button secondary" type="button" @click="emit('close')">取消</button><button class="rp-button" type="submit" :disabled="!meaning.trim()">{{existing?'更新生词':'加入生词库'}}</button></div></form></section></div></template>
