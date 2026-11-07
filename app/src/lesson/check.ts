// Answer checking, shared by every exercise type. Pure functions, no imports (tested with node --test).

const CONTRACTIONS: Record<string, string> = {
  "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are', "he's": 'he is', "she's": 'she is',
  "it's": 'it is', "what's": 'what is', "that's": 'that is', "where's": 'where is', "how's": 'how is',
  "don't": 'do not', "doesn't": 'does not', "isn't": 'is not', "aren't": 'are not', "can't": 'cannot', "won't": 'will not',
  "i'll": 'i will', "you'll": 'you will', "i've": 'i have', "let's": 'let us',
};

/** Lowercase, unify apostrophes, expand contractions, drop punctuation, collapse spaces. */
export function normalize(s: string): string {
  const words = s
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => CONTRACTIONS[w] ?? w.replace(/^'+|'+$/g, ''));
  return words.join(' ').replace(/\bcan not\b/g, 'cannot');
}

/** True when the text contains letters outside the Latin script (e.g. the learner typed in Arabic). */
export function hasNonLatin(s: string): boolean {
  return /[^\p{Script=Latin}\p{N}\p{P}\p{Z}\p{S}]/u.test(s);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

export type CheckResult = { correct: boolean; typo: boolean; expected: string };

/**
 * Correct if it matches any accepted solution after normalising.
 * A typo is accepted (and flagged) when word counts match and every differing word is ≥ 4 letters
 * and at most one edit away. Short words must be exact, so "no" never passes for "on".
 */
export function checkAnswer(answer: string, solutions: string[]): CheckResult {
  const a = normalize(answer);
  const expected = solutions[0] ?? '';
  if (!a) return { correct: false, typo: false, expected };
  for (const s of solutions) if (normalize(s) === a) return { correct: true, typo: false, expected: s };
  for (const s of solutions) {
    const sw = normalize(s).split(' ');
    const aw = a.split(' ');
    if (sw.length !== aw.length) continue;
    const ok = sw.every((w, i) => w === aw[i] || (w.length >= 4 && levenshtein(w, aw[i]) <= 1));
    if (ok) return { correct: true, typo: true, expected: s };
  }
  return { correct: false, typo: false, expected };
}
