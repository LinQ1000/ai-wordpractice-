import type { CatalogEntry, ReadingExam } from './model';
import { adaptLegacy } from './adapter';
import { customExams } from './storage';
let catalogPromise:Promise<CatalogEntry[]>|undefined;
const cache=new Map<string,ReadingExam>();
export async function loadCatalog(){
  if(!catalogPromise)catalogPromise=fetch('/reading/catalog.json').then(async response=>{if(!response.ok)throw new Error('题库目录加载失败，请重试。');const data=await response.json();if(!Array.isArray(data))throw new Error('题库目录格式不正确。');return data as CatalogEntry[];}).catch(error=>{catalogPromise=undefined;throw error;});
  return catalogPromise;
}
export async function loadExam(id:string){
  const custom=customExams.value.find(e=>e.id===id);if(custom)return custom;
  if(cache.has(id))return cache.get(id)!;
  const entry=(await loadCatalog()).find(e=>e.id===id);if(!entry)throw new Error('未找到这篇文章，可能已被移除。');
  const response=await fetch(`/reading/exams/${encodeURIComponent(id)}.json`);if(!response.ok)throw new Error('文章加载失败，请返回题库后重试。');
  const exam=adaptLegacy(await response.json(),entry);cache.set(id,exam);return exam;
}
let dictionaryPromise:Promise<Record<string,{meaning:string;phonetic?:string}>>|undefined;
export async function lookupWord(word:string){
  if(!dictionaryPromise)dictionaryPromise=fetch('/reading/dictionary.json').then(async response=>{if(!response.ok)throw new Error('本地词典加载失败，可手动填写释义。');return (await response.json()).words;}).catch(error=>{dictionaryPromise=undefined;throw error;});
  const dictionary=await dictionaryPromise;
  const key=word.toLowerCase().replace(/[’‘]/g,"'");
  return dictionary[key];
}
