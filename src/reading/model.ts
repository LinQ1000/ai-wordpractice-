export interface Source { label: string; url?: string; reference?: string }
export interface CatalogEntry { id: string; title: string; part: string; frequency: string; questionCount: number; source: Source; custom?: boolean }
export interface Option { value: string; label: string }
export interface Question {
  id: string; label: string; kind: 'text' | 'choice' | 'multi' | 'matching';
  promptHtml: string; options: Option[]; accepted: string[]; points: number;
  correctSet?: string[]; maxWords?: number; selectionCount?: number;
}
export interface QuestionGroup { id: string; title: string; instructionsHtml: string; questions: Question[]; kind: string }
export interface ReadingExam extends CatalogEntry { version: 1; passageHtml: string; groups: QuestionGroup[] }
export type Answers = Record<string, string | string[]>;
export interface GradedAnswer { id: string; label: string; answer: string | string[]; expected: string[]; earned: number; possible: number; status: 'correct' | 'partial' | 'incorrect' | 'unanswered' }
export interface ReadingResult { earned: number; total: number; percentage: number; items: GradedAnswer[] }
export interface ReadingRecord { id: string; examId: string; title: string; date: string; seconds: number; source: Source; result: ReadingResult; answers: Answers; exam: ReadingExam }
export interface ReadingDraft { version: 1; examId: string; sessionId: string; answers: Answers; seconds: number; updatedAt: string }
export interface ReadingWord { word: string; meaning: string; phonetic?: string; example?: string; addedAt: string; examId: string; sourceTitle: string; source: Source }
