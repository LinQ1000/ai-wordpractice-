<script setup lang="ts">
import {computed,ref} from 'vue';
import {readingHistory,deleteRecord,downloadJson} from './storage';
const emit=defineEmits<{open:[string]}>();const search=ref('');
const filtered=computed(()=>readingHistory.value.filter(r=>`${r.title} ${r.date}`.toLowerCase().includes(search.value.toLowerCase())));
function remove(id:string){if(window.confirm('删除这条阅读练习记录？'))deleteRecord(id);}
function date(value:string){return new Date(value).toLocaleString('zh-CN');}
</script>
<template><section class="rp-panel"><header class="rp-row rp-wrap"><div><span class="rp-eyebrow">PRACTICE HISTORY</span><h1>每一次练习，都有记录。</h1><p class="rp-muted">回看答案、得分与练习时长。这里显示新版阅读模块生成的记录。</p></div><button class="rp-button secondary" :disabled="!readingHistory.length" @click="downloadJson('reading-records.json',readingHistory)">导出全部记录</button></header><label class="rp-field rp-record-search">搜索记录<input v-model="search" type="search" placeholder="输入文章名称或日期"></label><div class="rp-record-list"><article v-for="r in filtered" :key="r.id" class="rp-record-card"><div><span class="rp-caption">{{date(r.date)}} · {{Math.floor(r.seconds/60)}} 分 {{r.seconds%60}} 秒</span><h3>{{r.title}}</h3><p class="rp-caption">{{r.source.label}}</p></div><div class="rp-record-score"><strong>{{r.result.earned}} / {{r.result.total}}</strong><span>{{r.result.percentage}}%</span></div><div class="rp-row"><button class="rp-button secondary" @click="emit('open',r.id)">回看答案</button><button class="rp-link danger" @click="remove(r.id)">删除</button></div></article></div><p v-if="!filtered.length" class="rp-empty">{{readingHistory.length?'没有匹配的练习记录。':'完成一篇阅读并提交后，记录会显示在这里。'}}</p></section></template>
