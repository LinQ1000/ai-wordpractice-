import type { Mode, Rating, Word } from '../stores/learning';
import { matchesSpelling } from './spelling';

export type WordList = 'ielts' | 'month' | 'week' | 'season';
export type Exercise = 'spelling' | 'meaning';
export interface StudyPreferences { wordList: WordList; exercise: Exercise; includeLearned: boolean }
export interface PendingAnswer { id: string; word: string; rating: Rating; at: number; seconds: number; exercise: Exercise }
export interface StudyDraft extends StudyPreferences {
  version: 1; mode: Mode; sessionId: string; wordIds: string[];
  completed: number; recognized: number; spellingCompleted: number; firstTryCorrect: number;
  typedWord: string; attempts: number; revealed: boolean; spellingCorrect: boolean; showAnswer: boolean;
  elapsedSeconds: number; pending?: PendingAnswer;
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;
const exercise = (value: unknown): value is Exercise => value === 'spelling' || value === 'meaning';
export function parseStudyPreferences(value: unknown): StudyPreferences | undefined {
  if (!object(value) || !['ielts', 'month', 'week', 'season'].includes(String(value.wordList)) || !exercise(value.exercise) || typeof value.includeLearned !== 'boolean') return;
  return { wordList: value.wordList as WordList, exercise: value.exercise, includeLearned: value.includeLearned };
}
export function studyDraftKey(mode: Mode, settings: StudyPreferences) {
  return `ai-vocabulary-session:${mode}:${settings.wordList}:${settings.exercise}:${settings.includeLearned && mode === 'study' ? 'all' : 'scheduled'}`;
}
export function parseStudyDraft(value: unknown, mode: Mode, settings: StudyPreferences, source: Word[]): StudyDraft | undefined {
  if (!object(value) || value.version !== 1 || value.mode !== mode || !parseStudyPreferences(value) || value.wordList !== settings.wordList || value.exercise !== settings.exercise || value.includeLearned !== settings.includeLearned || typeof value.sessionId !== 'string' || !value.sessionId || value.sessionId.length > 100) return;
  if (!Array.isArray(value.wordIds) || !value.wordIds.length || value.wordIds.length > 100 || !value.wordIds.every(word => typeof word === 'string') || new Set(value.wordIds).size !== value.wordIds.length) return;
  const vocabulary = new Map(source.map(word => [word.word, word]));
  if (!value.wordIds.every(word => vocabulary.has(word))) return;
  if (!integer(value.completed, value.wordIds.length) || !integer(value.recognized, value.completed) || !integer(value.spellingCompleted, value.completed) || !integer(value.firstTryCorrect, value.spellingCompleted)) return;
  if (typeof value.typedWord !== 'string' || value.typedWord.length > 200 || !integer(value.attempts, 10000) || !['revealed', 'spellingCorrect', 'showAnswer'].every(key => typeof value[key] === 'boolean') || typeof value.elapsedSeconds !== 'number' || !Number.isFinite(value.elapsedSeconds) || value.elapsedSeconds < 0 || value.elapsedSeconds > 300) return;
  const current = vocabulary.get(value.wordIds[value.completed]);
  if (value.spellingCorrect && (!current || !value.attempts || !value.showAnswer || !matchesSpelling(value.typedWord, current.word))) return;
  if (value.pending !== undefined) {
    const pending = value.pending;
    if (!object(pending) || !current || pending.id !== `${value.sessionId}:${value.completed}` || pending.word !== current.word || !['hard', 'normal', 'easy'].includes(String(pending.rating)) || pending.exercise !== value.exercise || typeof pending.at !== 'number' || !Number.isFinite(pending.at) || pending.at <= 0 || typeof pending.seconds !== 'number' || !Number.isFinite(pending.seconds) || pending.seconds < 0 || pending.seconds > 300 || !value.showAnswer || (value.exercise === 'spelling' && !value.spellingCorrect)) return;
  }
  return value as unknown as StudyDraft;
}
