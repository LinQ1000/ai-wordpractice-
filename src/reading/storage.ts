import { ref } from 'vue';
import type { Answers, ReadingDraft, ReadingExam, ReadingRecord, ReadingWord } from './model';
import { validateExam } from './adapter';
import { gradeExam } from './grading';
export const readingStorageWarning = ref('');
function read<T>(key: string, fallback: T, validate: (value: unknown) => value is T): T {
  try { const raw = localStorage.getItem(key); if (!raw) return fallback; const data:unknown=JSON.parse(raw); if (validate(data)) return data; throw new Error(); }
  catch { readingStorageWarning.value='部分本地数据无法读取，已保留原数据。请先导出备份或检查浏览器存储设置。'; return fallback; }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); readingStorageWarning.value=''; return true; }
  catch { readingStorageWarning.value='保存失败：浏览器存储空间不足或已禁用。请导出数据备份，并保留当前页面后重试。'; return false; }
}
const list = (v:unknown): v is any[] => Array.isArray(v);
const validAnswers = (v:unknown):v is Answers => !!v && typeof v==='object' && !Array.isArray(v) && Object.values(v).every(a=>typeof a==='string' ? a.length<=2000 : Array.isArray(a) && a.length<=30 && a.every(x=>typeof x==='string' && x.length<=200));
const validExam = (v:unknown):v is ReadingExam => { try { validateExam(v); return true; } catch { return false; } };
export const customExams = ref<ReadingExam[]>(read('ielts-practice-reading-bank-v1',[],(v):v is ReadingExam[]=>list(v)&&v.every(validExam)).map(validateExam));
export const readingHistory = ref<ReadingRecord[]>(read('ielts-practice-reading-records-v1',[],(v):v is ReadingRecord[]=>list(v)&&v.every(r=>r&&typeof r.id==='string'&&typeof r.examId==='string'&&typeof r.title==='string'&&typeof r.date==='string'&&Number.isFinite(r.seconds)&&r.result&&Array.isArray(r.result.items)&&Number.isFinite(r.result.earned)&&Number.isFinite(r.result.total)&&validAnswers(r.answers)&&validExam(r.exam))).map(r=>{const exam=validateExam(r.exam);return {...r,exam,result:gradeExam(exam,r.answers)};}));
export const readingWords = ref<ReadingWord[]>(read('ielts-practice-reading-words-v1',[],(v):v is ReadingWord[]=>list(v)&&v.every(w=>w&&typeof w.word==='string'&&typeof w.meaning==='string'&&typeof w.addedAt==='string'&&typeof w.sourceTitle==='string'&&typeof w.examId==='string'&&w.source&&typeof w.source.label==='string')));
export function saveCustomExams(exams:ReadingExam[]) { const next=exams.map(validateExam); if(!write('ielts-practice-reading-bank-v1',next))return false;customExams.value=next;return true; }
export function saveRecord(record:ReadingRecord) { const next=[record,...readingHistory.value.filter(r=>r.id!==record.id)]; if(!write('ielts-practice-reading-records-v1',next))return false;readingHistory.value=next;return true; }
export function deleteRecord(id:string) { const next=readingHistory.value.filter(r=>r.id!==id);if(!write('ielts-practice-reading-records-v1',next))return false;readingHistory.value=next;return true; }
export function saveReadingWord(word:ReadingWord) { const next=[word,...readingWords.value.filter(w=>w.word.toLowerCase()!==word.word.toLowerCase())];if(!write('ielts-practice-reading-words-v1',next))return false;readingWords.value=next;return true; }
export function deleteReadingWord(word:string) {const next=readingWords.value.filter(w=>w.word!==word);if(!write('ielts-practice-reading-words-v1',next))return false;readingWords.value=next;return true;}
export function loadDraft(examId:string):ReadingDraft|undefined { return read<ReadingDraft|undefined>(`ielts-practice-reading-draft-v1:${examId}`,undefined,(v):v is ReadingDraft=>{const d=v as ReadingDraft;return !!d&&d.version===1&&d.examId===examId&&typeof d.sessionId==='string'&&validAnswers(d.answers)&&Number.isFinite(d.seconds)&&d.seconds>=0;}); }
export function saveDraft(draft:ReadingDraft){return write(`ielts-practice-reading-draft-v1:${draft.examId}`,draft);}
export function clearDraft(examId:string){try{localStorage.removeItem(`ielts-practice-reading-draft-v1:${examId}`);}catch{readingStorageWarning.value='本次结果已保存，但旧草稿未能清除。';}}
export function downloadJson(filename:string,value:unknown){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
