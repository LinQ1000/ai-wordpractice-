export interface ListeningQuestion { id: string; prompt: string; answers: string[] }
export interface ListeningExam { id: string; kind: 'listening'; title: string; source: string; audioUrl: string; questions: ListeningQuestion[] }
export interface WritingExam { id: string; kind: 'writing'; title: string; source: string; task: 1 | 2; prompt: string; imageUrl?: string }
export type Exam = ListeningExam | WritingExam;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const nonempty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
export function safeResource(v: unknown): v is string {
  if (!nonempty(v)) return false;
  try { const url = new URL(v, 'https://local.invalid'); return ['https:', 'http:'].includes(url.protocol); } catch { return false; }
}
export function parseBank(value: unknown): Exam[] {
  if (!object(value) || value.version !== 1 || !Array.isArray(value.exams)) throw new Error('题库格式需要 version: 1 和 exams 数组。');
  const ids = new Set<string>();
  return value.exams.map((exam: unknown) => {
    if (!object(exam) || !nonempty(exam.id) || !nonempty(exam.title) || !nonempty(exam.source) || ids.has(exam.id)) throw new Error('每套题需要唯一 id、title 和 source。');
    ids.add(exam.id);
    if (exam.kind === 'listening') {
      if (!safeResource(exam.audioUrl) || !Array.isArray(exam.questions) || !exam.questions.length) throw new Error('听力题需要有效 audioUrl 和非空 questions。');
      const questionIds = new Set<string>();
      const questions = exam.questions.map((q: unknown) => {
        if (!object(q) || !nonempty(q.id) || questionIds.has(q.id) || !nonempty(q.prompt) || !Array.isArray(q.answers) || !q.answers.length || !q.answers.every(nonempty)) throw new Error('每道听力题需要唯一 id、prompt 和非空 answers 数组。');
        questionIds.add(q.id); return { id: q.id, prompt: q.prompt, answers: q.answers as string[] };
      });
      return { id: exam.id, title: exam.title, source: exam.source, kind: 'listening', audioUrl: exam.audioUrl, questions };
    }
    if (exam.kind === 'writing' && [1,2].includes(Number(exam.task)) && nonempty(exam.prompt) && (exam.imageUrl === undefined || safeResource(exam.imageUrl))) {
      return { id: exam.id, title: exam.title, source: exam.source, kind: 'writing', task: Number(exam.task) as 1 | 2, prompt: exam.prompt, imageUrl: exam.imageUrl as string | undefined };
    }
    throw new Error('写作题需要 kind: writing、task: 1 或 2、prompt，以及可选的 imageUrl。');
  });
}
export function mergeBank(current: Exam[], incoming: Exam[]) {
  const exams = new Map(current.map(exam => [exam.id, exam]));
  incoming.forEach(exam => exams.set(exam.id, exam)); return [...exams.values()];
}
export function normalizeAnswer(value: string) { return value.trim().toLowerCase().replace(/\s+/g,' '); }
