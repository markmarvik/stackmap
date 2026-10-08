import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FORKS,
  RUN_PRICE_LABEL,
  parseRunId,
  runHref,
  getFork,
  nextForkId,
  resolveChoice,
  reportColumns
} from '../src/data/forks.js';

test('all 12 forks live in one list', () => {
  assert.equal(FORKS.length, 12);
  assert.deepEqual(FORKS.map((fork) => fork.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  for (const fork of FORKS) {
    assert.equal(typeof fork.title, 'string');
    assert.ok(fork.title);
    if (fork.kind === 'report') assert.equal(fork.choices.length, 2);
    else assert.equal(fork.choices.length, 3);
  }
});

test('forks 1–4 are free and 5–12 are the paid gate', () => {
  assert.equal(RUN_PRICE_LABEL, 'See the other body — $7');
  for (const fork of FORKS) {
    assert.equal(fork.paid, fork.id >= 5);
  }
});

test('fork 1 films four beats and B/C say what did not happen', () => {
  const fork = getFork(1);
  const scene = resolveChoice(fork, 'A');
  assert.equal(scene.type, 'scene');
  assert.deepEqual(scene.beats.map((beat) => beat.id), ['pov', 'body', 'organ', 'after']);
  assert.equal(scene.beats[2].frame, 'liver');
  assert.match(fork.claim, /^What happens when/i);

  const sip = resolveChoice(fork, 'B');
  const leave = resolveChoice(fork, 'C');
  assert.equal(sip.type, 'skip');
  assert.equal(leave.type, 'skip');
  assert.match(sip.line, /does not/i);
  assert.match(leave.line, /does not/i);
  assert.equal(nextForkId(1), 2);
});

test('unfilmed forks stay content stubs and the report is not a new organ', () => {
  assert.equal(resolveChoice(getFork(2), 'A').type, 'stub');
  assert.equal(getFork(2).beats, undefined);
  const report = resolveChoice(getFork(12), 'B');
  assert.equal(report.type, 'report');
  assert.equal(getFork(12).organ, null);
  const columns = reportColumns();
  assert.equal(columns.length, 11);
  assert.equal(columns[0].worse, 'A drink');
  assert.equal(columns[0].other, 'Leave');
});

test('deep links parse /run/:id with or without the pages base', () => {
  assert.equal(parseRunId('/run/1', '/'), 1);
  assert.equal(parseRunId('/run/1/', '/'), 1);
  assert.equal(parseRunId('/run/12', '/'), 12);
  assert.equal(parseRunId('/stackmap/run/4', '/stackmap/'), 4);
  assert.equal(parseRunId('/stackmap/run/4/', '/stackmap/'), 4);
  assert.equal(parseRunId('/', '/'), null);
  assert.equal(parseRunId('/pricing.html', '/'), null);
  assert.equal(parseRunId('/run/', '/'), null);
  assert.equal(runHref(1, '/'), '/run/1');
  assert.equal(runHref(2, '/stackmap/'), '/stackmap/run/2');
});
