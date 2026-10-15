export interface SpeakingAssessment {
  overall: string;
  strengths: string[];
  corrections: { original: string; corrected: string; explanation: string }[];
  vocabulary: { original: string; suggestion: string; explanation: string }[];
  improvedAnswer: string;
  practiceTips: string[];
}

const invalidAssessment = () => new Error('AI 批改结果格式不完整，请重试。');
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function text(value: unknown, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) throw invalidAssessment();
  return value.trim();
}

function list(value: unknown, minimum: number, maximum: number): unknown[] {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) throw invalidAssessment();
  return value;
}

/** Validate provider output without retaining extra fields or coercing values. */
export function parseAssessment(value: unknown): SpeakingAssessment {
  if (!isObject(value)) throw invalidAssessment();
  return {
    overall: text(value.overall, 3000),
    strengths: list(value.strengths, 1, 8).map(item => text(item, 1200)),
    corrections: list(value.corrections, 0, 12).map(item => {
      if (!isObject(item)) throw invalidAssessment();
      return {
        original: text(item.original, 1500),
        corrected: text(item.corrected, 1500),
        explanation: text(item.explanation, 1500),
      };
    }),
    vocabulary: list(value.vocabulary, 0, 12).map(item => {
      if (!isObject(item)) throw invalidAssessment();
      return {
        original: text(item.original, 1500),
        suggestion: text(item.suggestion, 1500),
        explanation: text(item.explanation, 1500),
      };
    }),
    improvedAnswer: text(value.improvedAnswer, 8000),
    practiceTips: list(value.practiceTips, 1, 8).map(item => text(item, 1200)),
  };
}
