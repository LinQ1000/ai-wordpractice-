import { ref } from 'vue';
export type Skill = 'listening' | 'writing' | 'speaking';
export interface PracticeRecord { id: string; skill: Skill; title: string; date: string; summary: string; content: string }
const key = 'ielts-module-history';
export const historyError = ref('');
function load(): PracticeRecord[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter(v => v && ['listening','writing','speaking'].includes(v.skill) && ['id','title','date','summary','content'].every(k => typeof v[k] === 'string'));
  } catch { historyError.value = '练习记录读取失败。'; return []; }
}
export const practiceHistory = ref<PracticeRecord[]>(load());
export function savePractice(record: Omit<PracticeRecord,'id'|'date'>, id: string = crypto.randomUUID()) {
  const next = [{...record,id,date:new Date().toISOString()},...practiceHistory.value.filter(r=>r.id!==id)];
  try { localStorage.setItem(key,JSON.stringify(next)); practiceHistory.value=next; historyError.value=''; return id; }
  catch { historyError.value='练习记录保存失败，请导出当前内容。'; return undefined; }
}
export function exportPractice(skill: Skill) {
  const blob = new Blob([JSON.stringify(practiceHistory.value.filter(r=>r.skill===skill),null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`ielts-${skill}-records.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export function readPreference(key: string, fallback: boolean) {
  try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return typeof value === 'boolean' ? value : fallback; } catch { return fallback; }
}
export function savePreference(key: string, value: boolean) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { historyError.value='设置保存失败。'; }
}
