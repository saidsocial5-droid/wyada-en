import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAnswer, hasNonLatin, normalize } from '../src/lesson/check.ts';
import { addDays, displayStreak, lessonXp, localDate, nextStreak } from '../src/lesson/rules.ts';

test('normalize: case, punctuation, apostrophes, contractions', () => {
  assert.equal(normalize('  Hello,   Thank you! '), 'hello thank you');
  assert.equal(normalize('I’m fine.'), 'i am fine');
  assert.equal(normalize("What's your name?"), 'what is your name');
  assert.equal(normalize('I can not'), 'i cannot');
});

test('exact and alternative solutions', () => {
  assert.deepEqual(checkAnswer('good morning', ['Good morning']), { correct: true, typo: false, expected: 'Good morning' });
  assert.equal(checkAnswer('No thanks', ['No thank you', 'No thanks']).correct, true);
  assert.equal(checkAnswer("I'm fine, and you?", ['I am fine and you']).correct, true);
});

test('typos: long words tolerate one edit, short words must be exact', () => {
  const r = checkAnswer('Good mornin', ['Good morning']);
  assert.equal(r.correct, true); assert.equal(r.typo, true);
  assert.equal(checkAnswer('Goud morning', ['Good morning']).correct, true);
  assert.equal(checkAnswer('on thank you', ['No thank you']).correct, false);
  assert.equal(checkAnswer('Good mrnng', ['Good morning']).correct, false);
  assert.equal(checkAnswer('Good', ['Good morning']).correct, false);
  assert.equal(checkAnswer('', ['Hello']).correct, false);
});

test('non-Latin input is detected', () => {
  assert.equal(hasNonLatin('شكرا'), true);
  assert.equal(hasNonLatin("Thank you, I'm fine!"), false);
  assert.equal(hasNonLatin('Café crème'), false);
});

test('rules mirror the server', () => {
  assert.equal(lessonXp(0), 15);
  assert.equal(lessonXp(1), 10);
  assert.deepEqual(nextStreak(0, null, '2026-11-07'), { length: 1, extended: true });
  assert.deepEqual(nextStreak(1, '2026-11-07', '2026-11-07'), { length: 1, extended: false });
  assert.deepEqual(nextStreak(1, '2026-11-06', '2026-11-07'), { length: 2, extended: true });
  assert.deepEqual(nextStreak(9, '2026-11-03', '2026-11-07'), { length: 1, extended: true });
  assert.deepEqual(nextStreak(4, '2026-11-08', '2026-11-07'), { length: 4, extended: false });
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(displayStreak(5, '2026-11-06', '2026-11-07'), 5);
  assert.equal(displayStreak(5, '2026-11-05', '2026-11-07'), 0);
});

test('local date follows the time zone, not UTC', () => {
  const t = new Date('2026-11-07T23:30:00Z');
  assert.equal(localDate('UTC', t), '2026-11-07');
  assert.equal(localDate('Asia/Dubai', t), '2026-11-08');
  assert.equal(localDate('America/Montreal', t), '2026-11-07');
});
