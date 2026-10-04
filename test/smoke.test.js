import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, STARTER_STACKS, searchCatalog } from '../src/data/catalog.js';
import { calcVitality, personalizedScore } from '../src/core/ScoringEngine.js';

test('catalog entries have ids and names', () => {
  assert.ok(Array.isArray(CATALOG) && CATALOG.length > 0);
  for (const item of CATALOG) {
    assert.equal(typeof item.id, 'string');
    assert.ok(item.id && item.name && item.constellation);
  }
});

test('searchCatalog matches names and rejects an empty query', () => {
  const hits = searchCatalog('magnesium', 5);
  assert.ok(hits.length > 0 && hits.length <= 5);
  assert.ok(hits.some((hit) => hit.name.toLowerCase().includes('magnesium')));
  assert.deepEqual(searchCatalog(''), []);
});

test('starter stacks are named lists of catalog items', () => {
  const ids = new Set(CATALOG.map((item) => item.id));
  assert.ok(STARTER_STACKS.length > 0);
  for (const stack of STARTER_STACKS) {
    assert.ok(stack.id && stack.name && stack.items.length > 0);
    assert.ok(stack.items.every((item) => item.id && item.constellation && ids.has(item.id)));
  }
});

test('scoring functions return finite numbers', () => {
  assert.equal(calcVitality({ longevity: 80, qol: 40 }), Math.round(80 * 0.65 + 40 * 0.35));
  assert.equal(calcVitality({ vitality: 77.2 }), 77);
  assert.equal(calcVitality(null), 0);

  const match = personalizedScore(
    { name: 'Magnesium', organs: ['brain'], cat: 'sleep' },
    { sleep: 'poor', age: 50 }
  );
  assert.equal(typeof match, 'number');
  assert.ok(match >= 25 && match <= 98);
  assert.equal(personalizedScore(null, {}), 0);
});
