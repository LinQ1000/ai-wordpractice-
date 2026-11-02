/** Convert bundled content to JSON. No legacy UI or grading code is executed. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, 'public/ielts/assets/generated/reading-exams');
const destination = path.join(root, 'public/reading');
fs.mkdirSync(path.join(destination, 'exams'), { recursive: true });
const catalog = [];
const context = { __READING_EXAM_DATA__: { register(id, data) {
  if (!/^[a-z0-9-]+$/.test(id) || !data.meta?.title || !data.answerKey || !data.questionGroups?.length) throw new Error(`Invalid source: ${id}`);
  const provenance = { label: '项目既有阅读题库（第三方文章与试题）', url: 'https://github.com/sallowayma-git/IELTS-practice', reference: data.sourceRefs?.pdf || data.sourceRefs?.shuiHtml || data.meta.legacyFilename || id };
  const output = { ...data, provenance };
  fs.writeFileSync(path.join(destination, 'exams', `${id}.json`), JSON.stringify(output));
  catalog.push({ id, title: data.meta.title, part: data.meta.category || 'P1', frequency: data.meta.frequency || '', questionCount: Object.keys(data.answerKey).length + data.questionGroups.filter(g=>['multi_choice','multiple_choice'].includes(g.kind)&&g.questionIds.length===1&&Array.isArray(data.answerKey[g.questionIds[0]])).reduce((n,g)=>n+data.answerKey[g.questionIds[0]].length-1,0), source: provenance });
} } };
context.globalThis = context;
vm.createContext(context);
for (const filename of fs.readdirSync(source).filter(f => f.endsWith('.js') && f !== 'manifest.js').sort()) {
  vm.runInContext(fs.readFileSync(path.join(source, filename), 'utf8'), context, {timeout: 1000, filename});
}
fs.writeFileSync(path.join(destination, 'catalog.json'), JSON.stringify(catalog));
console.log(`Prepared ${catalog.length} reading resources as JSON.`);
const dictionaryContext = {};
dictionaryContext.globalThis = dictionaryContext;
vm.createContext(dictionaryContext);
vm.runInContext(fs.readFileSync(path.join(root, 'public/ielts/assets/wordlists/ecdict_reading.bundle.js'), 'utf8'), dictionaryContext, {timeout:3000});
const dictionary = dictionaryContext.__LOCAL_DICTIONARIES__?.ecdict;
const entries = dictionary?.entries || dictionary?.words || [];
const words = Object.fromEntries(entries.filter(w=>w.w && w.t).map(w=>[w.w.toLowerCase(),{meaning:w.t,phonetic:w.p||''}]));
for (const word of JSON.parse(fs.readFileSync(path.join(root,'public/ielts/assets/wordlists/ielts_core.json'),'utf8'))) words[word.word.toLowerCase()] = {meaning:word.meaning,phonetic:word.phonetic||''};
fs.writeFileSync(path.join(destination,'dictionary.json'),JSON.stringify({source:{label:'ECDICT 与项目既有 IELTS 核心词汇',url:'https://github.com/skywind3000/ECDICT'},words}));
console.log(`Prepared ${Object.keys(words).length} dictionary entries.`);
