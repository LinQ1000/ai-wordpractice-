import { computed, ref } from 'vue';
export type Rating = 'hard' | 'normal' | 'easy';
export type Mode = 'study' | 'review' | 'mistakes';
export interface Word { word: string; meaning: string; phonetic?: string; example?: string }
interface Progress { repetitions: number; due: number; difficult?: boolean; lastAnswerId?: string; answeredAt?: number }
interface Activity { date: string; word: string; rating: Rating; seconds: number; answerId?: string; result?: Progress }
const progressKey = 'ai-vocabulary-progress';
function read<T>(key: string, fallback: T, validate: (value: unknown) => boolean): T {
  try { const value: unknown = JSON.parse(localStorage.getItem(key) || 'null'); return validate(value) ? value as T : fallback; }
  catch { return fallback; }
}
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const validProgress = (p: unknown): p is Progress => isObject(p) && typeof p.repetitions === 'number' && Number.isFinite(p.repetitions) && typeof p.due === 'number' && Number.isFinite(p.due) && (p.lastAnswerId === undefined || typeof p.lastAnswerId === 'string') && (p.answeredAt === undefined || (typeof p.answeredAt === 'number' && Number.isFinite(p.answeredAt)));
export const records = ref(read<Record<string, Progress>>(progressKey, {}, v => isObject(v) && Object.values(v).every(validProgress)));
export const activities = ref(read<Activity[]>('ai-vocabulary-activities', [], v => Array.isArray(v) && v.every(a => isObject(a) && typeof a.date === 'string' && typeof a.word === 'string' && ['hard', 'normal', 'easy'].includes(String(a.rating)) && typeof a.seconds === 'number' && (a.answerId === undefined || typeof a.answerId === 'string') && (a.result === undefined || validProgress(a.result)))));
export const batchSize = ref(read<number>('ai-vocabulary-batch', 20, v => typeof v === 'number' && Number.isInteger(v) && v >= 5 && v <= 100));
export const storageWarning = ref('');
export function dateKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
const currentDate = ref(dateKey());
export function refreshLearningDate() { currentDate.value = dateKey(); }
function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { storageWarning.value = '浏览器未能保存最新记录，请保留当前页面。'; return false; }
}
export function saveSettings(value: number) {
  if (!Number.isInteger(value) || value < 5 || value > 100) return false;
  batchSize.value = value; return save('ai-vocabulary-batch', value);
}
export function recordAnswer(word: string, rating: Rating, seconds: number, now = Date.now(), answerId?: string) {
  refreshLearningDate();
  const existing = answerId ? activities.value.find(activity => activity.answerId === answerId) : undefined;
  let previous = records.value[word];
  // The activity snapshot can be newer if saving the separate progress key failed.
  for (const activity of activities.value) {
    if (activity.word === word && activity.result && (activity.result.answeredAt || 0) > (previous?.answeredAt || 0)) previous = activity.result;
  }
  if (previous) records.value[word] = previous;
  let result: Progress;
  if (existing?.result) result = existing.result;
  else if (answerId && previous && (previous.lastAnswerId === answerId || (previous.answeredAt || 0) > now)) result = previous;
  else {
    const repetitions = rating === 'easy' ? (previous?.repetitions || 0) + 1 : 0;
    const days = rating === 'hard' ? 0 : rating === 'normal' ? 1 : [1,3,7,14,30][Math.min(repetitions-1,4)];
    result = { repetitions, due: now + (days ? days*86400000 : 60000), difficult: rating !== 'easy', answeredAt: now, ...(answerId ? { lastAnswerId: answerId } : {}) };
  }
  // Replaying a saved submission repairs a partial storage write without counting it twice.
  if (!previous || (previous.answeredAt || 0) <= now) records.value[word] = result;
  if (!existing) activities.value.push({ date: dateKey(new Date(now)), word, rating, seconds: Math.max(0, Math.min(300, seconds)), ...(answerId ? { answerId, result } : {}) });
  const savedProgress = save(progressKey, records.value);
  const savedActivities = save('ai-vocabulary-activities', activities.value);
  return savedProgress && savedActivities;
}
export function selectWords(data: Word[], mode: Mode, now = Date.now()) {
  const due = data.filter(w => records.value[w.word]?.due <= now).sort((a,b) => records.value[a.word]!.due-records.value[b.word]!.due);
  if (mode === 'review') return due.slice(0,batchSize.value);
  if (mode === 'mistakes') return data.filter(w => records.value[w.word]?.difficult || records.value[w.word]?.repetitions === 0).slice(0,batchSize.value);
  return [...due,...data.filter(w => !records.value[w.word])].slice(0,batchSize.value);
}
export const today = computed(() => activities.value.filter(a => a.date === currentDate.value));
export const learnedWords = computed(() => Object.values(records.value).filter(p => p.repetitions >= 3).length);
export const accuracy = computed(() => today.value.length ? Math.round(today.value.filter(a=>a.rating==='easy').length/today.value.length*100) : 0);
export const studiedToday = computed(() => new Set(today.value.map(a=>a.word)).size);
export const minutesToday = computed(() => Math.round(today.value.reduce((sum,a)=>sum+a.seconds,0)/60));
export const streak = computed(() => {
  const days = new Set(activities.value.map(a=>a.date)); const date = new Date(`${currentDate.value}T12:00:00`); let count=0;
  if (!days.has(dateKey(date))) date.setDate(date.getDate()-1);
  while(days.has(dateKey(date))) { count++; date.setDate(date.getDate()-1); }
  return count;
});
