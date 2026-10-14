import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDeepLink, buildDeepLink } from '../src/core/DeepLink.js';

test('parseDeepLink reads a valid constellation and node', () => {
  assert.deepEqual(parseDeepLink('?c=foods&n=sugary-soda'), { c: 'foods', n: 'sugary-soda' });
  assert.deepEqual(parseDeepLink('?c= FOODS &n=  Calcium-Alone  '), { c: 'foods', n: 'calcium-alone' });
  assert.deepEqual(parseDeepLink('https://stackmap.example/map?c=all&n=iron-routine#panel'), {
    c: 'all',
    n: 'iron-routine'
  });
  assert.deepEqual(parseDeepLink('c=habits&n=smoking'), { c: 'habits', n: 'smoking' });
});

test('parseDeepLink treats missing keys as null', () => {
  assert.deepEqual(parseDeepLink(''), { c: null, n: null });
  assert.deepEqual(parseDeepLink('?'), { c: null, n: null });
  assert.deepEqual(parseDeepLink('?c='), { c: null, n: null });
  assert.deepEqual(parseDeepLink('?n='), { c: null, n: null });
  assert.deepEqual(parseDeepLink('?foo=1'), { c: null, n: null });
  assert.deepEqual(parseDeepLink('?c=supplements'), { c: 'supplements', n: null });
  assert.deepEqual(parseDeepLink('?n=magnesium'), { c: null, n: 'magnesium' });
});

test('parseDeepLink drops invalid and malicious ids', () => {
  assert.deepEqual(parseDeepLink('?c=javascript:alert(1)&n=<script>alert(1)</script>'), { c: null, n: null });
  assert.deepEqual(parseDeepLink('?n=../../etc/passwd'), { c: null, n: null });
  assert.deepEqual(parseDeepLink('?n=foo bar'), { c: null, n: null });
  assert.deepEqual(parseDeepLink('?n=supplements::calcium-alone'), { c: null, n: null });
  assert.deepEqual(parseDeepLink('?n=' + 'a'.repeat(65)), { c: null, n: null });
  assert.deepEqual(parseDeepLink('?n=' + 'a'.repeat(64) + '&c=not-a-map'), { c: null, n: 'a'.repeat(64) });
  assert.deepEqual(parseDeepLink('?c=%3Cimg%20src=x%20onerror=alert(1)%3E&n=%00iron'), { c: null, n: null });
  assert.deepEqual(parseDeepLink('?n=ok%20id&c=foods'), { c: 'foods', n: null });
});

test('buildDeepLink round-trips valid links and strips bad ids', () => {
  const cases = [
    { c: 'foods', n: 'sugary-soda' },
    { c: 'supplements', n: 'calcium-alone' },
    { c: 'all', n: 'iron-routine' },
    { c: 'habits', n: null },
    { c: null, n: 'magnesium' },
    { c: null, n: null }
  ];
  for (const link of cases) {
    const built = buildDeepLink('https://stackmap.example/map?foo=1#top', link);
    assert.equal(built.startsWith('https://stackmap.example/map?'), true);
    assert.equal(built.endsWith('#top'), true);
    assert.match(built, /(?:^|[?&])foo=1(?:&|#|$)/);
    assert.deepEqual(parseDeepLink(built), link);
  }

  const cleared = buildDeepLink('/app?c=foods&n=old&foo=1', { c: 'foods', n: null });
  assert.equal(cleared.includes('n='), false);
  assert.deepEqual(parseDeepLink(cleared), { c: 'foods', n: null });

  const rejected = buildDeepLink('/app', { c: '<script>', n: '../secret' });
  assert.equal(rejected.includes('script'), false);
  assert.deepEqual(parseDeepLink(rejected), { c: null, n: null });
});
