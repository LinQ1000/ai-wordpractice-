export function normalizeSpelling(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
}
export function matchesSpelling(input: string, expected: string): boolean {
  return !!normalizeSpelling(input) && normalizeSpelling(input) === normalizeSpelling(expected);
}
export function spellingRating(attempts: number, revealed: boolean): 'easy' | 'normal' | 'hard' {
  return revealed ? 'hard' : attempts > 1 ? 'normal' : 'easy';
}
