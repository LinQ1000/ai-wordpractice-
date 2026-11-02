import type { CatalogEntry, Option, Question, ReadingExam, QuestionGroup, Source } from './model';
import { safeHtml } from './html';
import { normalizeAnswer } from './grading';
const kinds: Record<string, string> = { matching:'匹配题', classification:'分类题', true_false_not_given:'判断题', yes_no_not_given:'观点判断', single_choice:'单项选择', multi_choice:'多项选择', multiple_choice:'多项选择', short_answer:'简答题', sentence_completion:'句子填空', summary_completion:'摘要填空', table_completion:'表格填空', notes_completion:'笔记填空', flow_chart_completion:'流程图填空', diagram_completion:'图示填空' };
function optionsFrom(nodes: Element[]): Option[] {
  const options: Option[] = [];
  for (const node of nodes) {
    const value = node.getAttribute('value') || node.getAttribute('data-heading') || node.getAttribute('data-option') || node.getAttribute('data-value') || '';
    if (value && !options.some(o => o.value === value)) options.push({ value, label: (node.closest('label')?.textContent || node.textContent || value).replace(/\s+/g,' ').trim() });
  }
  return options;
}
function sourceAnswers(value: string | string[]): string[] {
  return [...new Set((Array.isArray(value) ? value : [value]).flatMap(answer => answer.split(/\s*\|\s*|\s*\/\s*/)).flatMap(answer => /\([^)]*\)/.test(answer) ? [answer.replace(/\([^)]*\)/g, ''), answer.replace(/[()]/g, '')] : [answer]).map(answer => answer.replace(/\s+/g, ' ').trim()).filter(Boolean))];
}
function wordLimit(text: string): number | undefined {
  const normalized = text.toUpperCase();
  if (/ONE WORD/.test(normalized)) return /AND\/OR A NUMBER|AND A NUMBER/.test(normalized) ? 2 : 1;
  if (/TWO WORDS/.test(normalized)) return /AND\/OR A NUMBER|AND A NUMBER/.test(normalized) ? 3 : 2;
  if (/THREE WORDS/.test(normalized)) return /AND\/OR A NUMBER|AND A NUMBER/.test(normalized) ? 4 : 3;
  return undefined;
}
export function adaptLegacy(data: any, entry: CatalogEntry): ReadingExam {
  if (!data || !Array.isArray(data.questionGroups) || !data.answerKey || !Array.isArray(data.passage?.blocks)) throw new Error('题目数据不完整。');
  const groups: QuestionGroup[] = data.questionGroups.map((source: any, index: number) => {
    const doc = new DOMParser().parseFromString(source.bodyHtml || '', 'text/html');
    doc.querySelectorAll('em,p').forEach(node => {
      if (/^drag\b/i.test(node.textContent?.trim() || '')) node.textContent = 'Choose the matching options in the answer area below.' + (source.allowOptionReuse ? ' You may use an option more than once.' : '');
    });
    const ids: string[] = source.questionIds || [];
    doc.querySelectorAll('img[src]').forEach(node => { const src = node.getAttribute('src') || ''; if (/^media\/[a-zA-Z0-9._-]+$/.test(src)) node.setAttribute('src', '/ielts/assets/generated/reading-exams/' + src); });
    const questions: Question[] = [];
    const checkboxes = [...doc.querySelectorAll('input[type="checkbox"]')];
    const multiNames = [...new Set(checkboxes.map(node => node.getAttribute('name') || '').filter(Boolean))];
    const consumed = new Set<string>();
    for (const name of multiNames) {
      const related = ids.filter(id => name === id || (name.match(/q?\d+/g) || []).map(v => 'q' + v.replace('q','')).includes(id));
      if (!related.length) continue;
      const nodes = checkboxes.filter(node => node.getAttribute('name') === name);
      const expected = related.flatMap(id => Array.isArray(data.answerKey[id]) ? data.answerKey[id] : [data.answerKey[id]]).filter((v: unknown) => typeof v === 'string');
      const correctSet = [...new Set<string>(expected)];
      const selectionCount = Number(nodes[0]?.closest('[data-limit]')?.getAttribute('data-limit')) || (related.length > 1 ? related.length : correctSet.length);
      questions.push({ id: related.join('-'), label: related.map(id => data.questionDisplayMap?.[id] || id.replace('q','')).join('、'), kind:'multi', promptHtml:'', options:optionsFrom(nodes), accepted:[], correctSet, points:related.length > 1 ? related.length : correctSet.length, selectionCount });
      related.forEach(id => consumed.add(id));
    }
    const pool = optionsFrom([...doc.querySelectorAll('[data-heading], .drag-item[data-option], .draggable-word[data-value], .card[data-value]')]);
    for (const id of ids.filter(id => !consumed.has(id))) {
      const nodes = [...doc.querySelectorAll('input,select,textarea')].filter(node => node.getAttribute('name') === id || node.id === id || node.id === `${id}-input`);
      let options = optionsFrom(nodes.filter(node => node.getAttribute('type') === 'radio'));
      if (!options.length && nodes.some(node => node.tagName === 'SELECT')) options = optionsFrom([...nodes.find(node => node.tagName === 'SELECT')!.querySelectorAll('option[value]')]).filter(o => !!o.value);
      if (!options.length && source.kind === 'true_false_not_given') options = ['TRUE','FALSE','NOT GIVEN'].map(value => ({value,label:value}));
      if (!options.length && source.kind === 'yes_no_not_given') options = ['YES','NO','NOT GIVEN'].map(value => ({value,label:value}));
      if (!options.length && ['matching','classification'].includes(source.kind)) options = pool;
      const answer = data.answerKey[id];
      if (typeof answer !== 'string' && !Array.isArray(answer)) throw new Error(`${entry.id}: ${id} 缺少参考答案。`);
      questions.push({ id, label:data.questionDisplayMap?.[id] || id.replace('q',''), kind:options.length ? (['matching','classification'].includes(source.kind) ? 'matching' : 'choice') : 'text', promptHtml:'', options, accepted:sourceAnswers(answer), points:1, ...(options.length ? {} : {maxWords: wordLimit(doc.body.textContent || '')}) });
    }
    // Content is retained, while every legacy input is replaced with an inert question marker.
    doc.querySelectorAll('input,select,textarea,.match-dropzone,.paragraph-dropzone').forEach(node => {
      const name = node.getAttribute('name') || node.getAttribute('data-question') || node.id;
      const marker = doc.createElement('strong'); marker.textContent = name ? ` [${name.replace(/q/g, '')}] ` : ' […] ';
      if (node.getAttribute('type') === 'radio' || node.getAttribute('type') === 'checkbox') node.remove(); else node.replaceWith(marker);
    });
    doc.querySelectorAll('[draggable]').forEach(node => node.removeAttribute('draggable'));
    return { id:source.groupId || `group-${index}`, title: source.kind === 'yes_no_not_given' && questions.some(q=>q.options.some(o=>o.value.toUpperCase()==='TRUE')) ? '判断题' : kinds[source.kind] || '阅读题目', kind:source.kind, instructionsHtml:safeHtml(doc.body.innerHTML), questions };
  });
  const passage = new DOMParser().parseFromString(data.passage.blocks.map((b:any) => b.html || b.bodyHtml || b.text || '').join('\n'), 'text/html');
  passage.querySelectorAll('.paragraph-dropzone,.dropped-items,#divider,.empty-space').forEach(node => node.remove());
  return { ...entry, version:1, passageHtml:safeHtml(passage.body.innerHTML), groups, questionCount:groups.flatMap(g=>g.questions).reduce((n,q)=>n+q.points,0) };
}
export function validateExam(value: unknown): ReadingExam {
  const v = value as ReadingExam;
  if (!v || v.version !== 1 || !/^[a-zA-Z0-9_-]{1,100}$/.test(v.id) || typeof v.title !== 'string' || !v.title.trim() || !['P1','P2','P3'].includes(v.part) || typeof v.passageHtml !== 'string' || !v.passageHtml.trim() || !v.source || typeof v.source.label !== 'string' || !v.source.label.trim() || !Array.isArray(v.groups) || !v.groups.length || v.groups.length > 40) throw new Error('题库格式不正确，请按示例填写编号、文章、题目和来源。');
  const ids = new Set<string>(); let total = 0;
  const groups = v.groups.map((group,index) => {
    if (!group || !Array.isArray(group.questions) || !group.questions.length || group.questions.length > 100 || typeof group.instructionsHtml !== 'string') throw new Error('题组不完整。');
    const questions = group.questions.map(q => {
      if (!q || !/^[a-zA-Z0-9_-]{1,100}$/.test(q.id) || ids.has(q.id) || ['__proto__','constructor','prototype'].includes(q.id) || !['text','choice','multi','matching'].includes(q.kind) || typeof q.label !== 'string' || !Number.isInteger(q.points) || q.points < 1 || q.points > 10 || !Array.isArray(q.accepted) || !q.accepted.every(a=>typeof a==='string' && a.trim()) || !Array.isArray(q.options) || !q.options.every(o=>o && typeof o.value==='string' && o.value.trim() && typeof o.label==='string') || new Set(q.options.map(o=>o.value)).size!==q.options.length || (q.maxWords!==undefined && (!Number.isInteger(q.maxWords)||q.maxWords<1||q.maxWords>20))) throw new Error('题号重复、答案或选项格式不正确。');
      if (q.kind==='multi') {
        if (!Array.isArray(q.correctSet) || !q.correctSet.length || !q.correctSet.every(a=>typeof a==='string' && q.options.some(o=>normalizeAnswer(o.value)===normalizeAnswer(a))) || new Set(q.correctSet).size!==q.correctSet.length || !q.selectionCount || !Number.isInteger(q.selectionCount) || q.selectionCount !== q.correctSet.length || q.selectionCount > q.options.length || q.points!==q.correctSet.length) throw new Error('多选题的答案、分值或选择数量不正确。');
      } else if (!q.accepted.length || (q.kind!=='text' && (!q.options.length || !q.accepted.every(a=>q.options.some(o=>normalizeAnswer(o.value)===normalizeAnswer(a)))))) throw new Error('题目缺少有效答案。');
      ids.add(q.id); total+=q.points;
      return {...q, promptHtml:safeHtml(q.promptHtml || '')};
    });
    return {...group,id:`group-${index+1}`,title:String(group.title || '阅读题目'),instructionsHtml:safeHtml(group.instructionsHtml),questions};
  });
  if (total>200) throw new Error('每篇文章最多支持 200 分题目。');
  const source: Source = {label:v.source.label.trim(),reference:typeof v.source.reference==='string'?v.source.reference:''};
  if (v.source.url && /^https?:\/\//.test(v.source.url)) source.url=v.source.url;
  return {...v,title:v.title.trim(),frequency:typeof v.frequency==='string'?v.frequency:'自建',passageHtml:safeHtml(v.passageHtml),source,groups,questionCount:total};
}
export { kinds };
