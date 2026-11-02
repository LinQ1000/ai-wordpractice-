import type { Answers, Question, ReadingExam, ReadingResult } from './model';
export function normalizeAnswer(value: string): string {
  return value.normalize('NFKC').toLowerCase().trim().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
}
function alternatives(answer: string): string[] {
  // Explicit alternatives and optional words; do not discard punctuation or words.
  const options = answer.split(/\s*\|\s*|\s*\/\s*/).filter(Boolean);
  return options.flatMap(value => /\([^)]*\)/.test(value) ? [value.replace(/[()]/g, ''), value.replace(/\([^)]*\)/g, '')] : [value]).map(normalizeAnswer);
}
export function gradeQuestion(question: Question, value: string | string[] | undefined) {
  const raw = value ?? (question.kind === 'multi' ? [] : '');
  const filled = Array.isArray(raw) ? raw.length > 0 : !!raw.trim();
  let earned = 0;
  if (question.kind === 'multi') {
    const chosen = Array.isArray(raw) ? [...new Set(raw.map(normalizeAnswer))] : [];
    const expected = new Set((question.correctSet || []).map(normalizeAnswer));
    // Oversized or forged selections must never earn points.
    if (chosen.length <= (question.selectionCount || question.points) && chosen.every(v => question.options.some(o => normalizeAnswer(o.value) === v))) {
      earned = Math.min(question.points, chosen.filter(v => expected.has(v)).length);
    }
  } else if (typeof raw === 'string') {
    const normalized = normalizeAnswer(raw);
    const withinLimit = !question.maxWords || normalized.split(/\s+/).filter(Boolean).length <= question.maxWords;
    if (withinLimit && normalized && question.accepted.some(answer => alternatives(answer).includes(normalized))) earned = question.points;
  }
  return { id: question.id, label: question.label, answer: raw, expected: question.correctSet || question.accepted, earned, possible: question.points, status: !filled ? 'unanswered' as const : earned === question.points ? 'correct' as const : earned > 0 ? 'partial' as const : 'incorrect' as const };
}
export function gradeExam(exam: ReadingExam, answers: Answers): ReadingResult {
  const items = exam.groups.flatMap(group => group.questions.map(question => gradeQuestion(question, answers[question.id])));
  const earned = items.reduce((sum, item) => sum + item.earned, 0);
  const total = items.reduce((sum, item) => sum + item.possible, 0);
  return { earned, total, percentage: total ? Math.round(earned / total * 100) : 0, items };
}
