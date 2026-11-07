// End-to-end test of the M1 loop in demo mode, on the static web export.
// Usage: npx expo export --platform web --output-dir <dir> && node tests/e2e-demo.cjs <dir> <screenshots-dir>
// Needs Playwright + Chromium (not a project dependency).
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const assert = require('assert/strict');

const [root, shots] = process.argv.slice(2);
const course = require('../../content/en-from-ar/course.json');
const nodes = course.sections[0].units[0].nodes;

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(root, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    if (fs.existsSync(f + '.html')) f += '.html';
    else if (p.startsWith('/lesson/')) f = path.join(root, 'lesson', '[nodeId].html');
    else f = path.join(root, 'index.html');
  }
  res.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
});

const tid = (id) => `[data-testid="${id}"]`;
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, name) { if (shots) await page.screenshot({ path: path.join(shots, `${name}.png`) }); }

/** The exercise whose prompt is on screen (longest match: one prompt can contain another). */
const onScreen = (node, text, kind) => node.exercises.filter((e) => text.includes(e.prompt.source) && (!kind || e.kind === kind))
  .sort((a, b) => b.prompt.source.length - a.prompt.source.length)[0];
/** Which exercise type is on screen, from its controls. */
async function kindOnScreen(page) {
  if (await page.locator(tid('answer-input')).count()) return 'translate_to_en';
  if (await page.getByRole('radio').count()) return 'multiple_choice';
  return 'word_bank';
}

/** Answers the exercise on screen. mode: 'right' | 'wrong' | 'arabic' */
async function answer(page, node, mode = 'right') {
  const text = await page.innerText('body');
  const ex = onScreen(node, text, await kindOnScreen(page));
  assert.ok(ex, 'exercise on screen is from this lesson');
  const sol = ex.solutions[0];
  if (ex.kind === 'multiple_choice') {
    const target = mode === 'right' ? sol : ex.options.find((o) => o !== sol);
    await page.getByRole('radio', { name: target, exact: true }).click();
  } else if (ex.kind === 'word_bank') {
    const words = mode === 'right' ? sol.split(' ') : [sol.split(' ')[0]];
    for (const w of words) {
      const tok = ex.tokens.find((t) => t.toLowerCase() === w.toLowerCase());
      await page.locator(tid(`chip-${tok}`)).first().click();
    }
  } else {
    await page.locator(tid('answer-input')).fill(mode === 'arabic' ? 'شكرا' : mode === 'right' ? sol : 'banana');
  }
  return ex;
}

async function checkAndContinue(page) {
  await page.locator(tid('check')).click();
  await page.locator(tid('feedback-continue')).waitFor();
  const sheet = await page.innerText('body');
  await page.locator(tid('feedback-continue')).click();
  return sheet;
}

async function playLesson(page, node, { wrongOnce = false, screenshotPrefix, arabicGuard = false } = {}) {
  const t0 = Date.now();
  let left = node.exercises.length, didWrong = false, steps = 0, guarded = false;
  while (left > 0) {
    await page.locator(tid('check')).waitFor();
    steps++;
    if (arabicGuard && !guarded && (await kindOnScreen(page)) === 'translate_to_en') {
      await answer(page, node, 'arabic');
      await page.locator(tid('check')).click();
      await page.getByText('اكتب إجابتك بالحروف الإنجليزية').waitFor();
      assert.equal(await page.locator(tid('feedback-continue')).count(), 0, 'no attempt recorded');
      await shot(page, '07-arabic-guard');
      guarded = true;
    }
    const mode = wrongOnce && !didWrong ? 'wrong' : 'right';
    const ex = await answer(page, node, mode);
    if (screenshotPrefix && steps <= 3) await shot(page, `${screenshotPrefix}-${steps}-${ex.kind}`);
    if (left === 1 && mode === 'right') { const wait = node.exercises.length * 2000 + 1500 - (Date.now() - t0); if (wait > 0) await sleep(wait); }
    const sheet = await checkAndContinue(page);
    if (mode === 'wrong') { didWrong = true; assert.ok(sheet.includes(ex.solutions[0]), 'wrong sheet shows the correct answer'); }
    else left--;
  }
  await page.locator(tid('done')).waitFor({ timeout: 10000 });
  return { steps, guarded };
}

server.listen(8766, async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ locale: 'ar-MA', timezoneId: 'Africa/Casablanca', viewport: { width: 400, height: 860 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  try {
    // F01: welcome → course → path
    await page.goto('http://localhost:8766/');
    await page.locator(tid('get-started')).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.dir), 'rtl', 'Arabic device → RTL');
    await shot(page, '01-welcome');
    await page.locator(tid('get-started')).click();
    await page.locator(tid('course-en-from-ar')).click();
    await shot(page, '02-course');
    await page.locator(tid('continue')).click();
    await page.locator(tid('node-1')).waitFor();
    await shot(page, '03-path-start');
    assert.match(await page.locator(tid('node-2')).getAttribute('aria-label'), /locked/, 'node 2 starts locked');
    assert.match(await page.locator(tid('node-1')).getAttribute('aria-label'), /current/, 'node 1 is current');

    // lesson 1 with one wrong answer, plus the Arabic-input guard on the first translate exercise
    await page.locator(tid('node-1')).click();
    await page.locator(tid('check')).waitFor();
    const r1 = await playLesson(page, nodes[0], { wrongOnce: true, screenshotPrefix: '04-lesson' });
    assert.equal(r1.steps, 7, 'the wrong exercise came back once');
    assert.equal(await page.innerText(tid('result-xp')), '+10');
    assert.equal(await page.innerText(tid('result-accuracy')), '86%');
    assert.equal(await page.innerText(tid('result-streak')), '1');
    await shot(page, '05-complete');
    await page.locator(tid('done')).click();
    await page.locator(tid('node-2')).waitFor();
    assert.match(await page.locator(tid('node-1')).getAttribute('aria-label'), /done/);
    assert.match(await page.locator(tid('node-2')).getAttribute('aria-label'), /current/);
    await shot(page, '06-path-after');

    // lesson 2 perfect: +15, same-day streak stays 1; Arabic typed into an English answer is refused, not counted
    await page.locator(tid('node-2')).click();
    await page.locator(tid('check')).waitFor();
    const r2 = await playLesson(page, nodes[1], { arabicGuard: true });
    assert.ok(r2.guarded, 'Arabic input guard was exercised');
    assert.equal(await page.innerText(tid('result-xp')), '+15');
    assert.equal(await page.innerText(tid('result-streak')), '1');
    await page.locator(tid('done')).click();

    // quit dialog: cancel keeps you in, confirm leaves; nothing is saved
    await page.locator(tid('node-3')).click();
    await page.locator(tid('quit')).click();
    await page.locator(tid('dialog-cancel')).click();
    await page.locator(tid('check')).waitFor();
    await page.locator(tid('quit')).click();
    await shot(page, '08-quit-dialog');
    await page.locator(tid('dialog-confirm')).click();
    await page.locator(tid('node-3')).waitFor();
    assert.match(await page.locator(tid('node-3')).getAttribute('aria-label'), /current/);

    // locked nodes do nothing
    await page.locator(tid('node-5')).click();
    await sleep(500);
    assert.ok(await page.locator(tid('node-5')).isVisible(), 'still on the path');

    // progress survives a reload (demo storage), and the app opens on the path
    await page.goto('http://localhost:8766/');
    await page.locator(tid('node-3')).waitFor();
    assert.match(await page.locator(tid('node-2')).getAttribute('aria-label'), /done/);
    assert.deepEqual(errors, [], 'no page errors');
    console.log('E2E DEMO PASSED');
  } catch (e) {
    await shot(page, 'zz-failure');
    console.error('E2E FAILED:', e.message, errors);
    process.exitCode = 1;
  } finally { await browser.close(); server.close(); }
});
