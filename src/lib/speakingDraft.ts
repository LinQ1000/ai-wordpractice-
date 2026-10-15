import { parseAssessment, type SpeakingAssessment } from '../../server/speakingAssessment';

export interface SpeakingDraftSnapshot {
  answer: string;
  assessment?: { answer: string; result: SpeakingAssessment };
  sessionId?: string;
}

export interface SpeakingDraft extends SpeakingDraftSnapshot {
  version: 1;
  questionId: string;
  updatedAt: number;
  previous?: SpeakingDraftSnapshot;
}

export const speakingLastQuestionKey = 'ielts-speaking-last-question';
export const speakingDraftKey = (questionId: string) => `ielts-speaking-draft:${questionId}`;
const invalidDraft = () => new Error('口语草稿格式无效。');
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function snapshot(value: unknown): SpeakingDraftSnapshot {
  if (!object(value) || typeof value.answer !== 'string' || value.answer.length > 4000) throw invalidDraft();
  const result: SpeakingDraftSnapshot = { answer: value.answer };
  if (value.sessionId !== undefined) {
    if (typeof value.sessionId !== 'string' || !/^[A-Za-z0-9-]{1,120}$/.test(value.sessionId)) throw invalidDraft();
    result.sessionId = value.sessionId;
  }
  if (value.assessment !== undefined) {
    if (!object(value.assessment) || typeof value.assessment.answer !== 'string' ||
      !value.assessment.answer.trim() || value.assessment.answer.length > 4000) throw invalidDraft();
    result.assessment = { answer: value.assessment.answer, result: parseAssessment(value.assessment.result) };
  }
  return result;
}

/** Restore only the selected question and validated feedback; never retain extra fields. */
export function parseSpeakingDraft(value: unknown, questionId: string): SpeakingDraft {
  if (!object(value) || value.version !== 1 || value.questionId !== questionId ||
    !Number.isSafeInteger(value.updatedAt) || (value.updatedAt as number) < 0) throw invalidDraft();
  return {
    ...snapshot(value),
    version: 1,
    questionId,
    updatedAt: value.updatedAt as number,
    ...(value.previous === undefined ? {} : { previous: snapshot(value.previous) }),
  };
}
