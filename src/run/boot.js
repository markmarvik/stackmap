/**
 * /run/:id — one fork screen. Does not boot the constellation.
 */

import { AnatomyRenderer } from '../core/AnatomyRenderer.js';
import { readStorage, writeStorage } from '../core/persist.js';
import {
  RUN_PRICE_LABEL,
  RUN_UNLOCK_KEY,
  FORKS,
  parseRunId,
  runHref,
  getFork,
  nextForkId,
  resolveChoice,
  reportColumns
} from '../data/forks.js';
import './run.css';

const anatomy = new AnatomyRenderer();
let root = null;
let fork = null;
let mode = 'choose';
let beatIndex = 0;
let outcome = null;
let assetsReady = false;

function baseUrl() {
  return import.meta.env.BASE_URL || '/';
}

function unlocked() {
  return readStorage(RUN_UNLOCK_KEY) === '1';
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function hideConstellationChrome() {
  document.documentElement.classList.add('is-run');
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.remove();
  document.body.style.overflow = 'auto';
}

function assetSrc(frame) {
  if (!assetsReady) return '';
  if (frame === 'body' || frame === 'after') {
    return anatomy.images.base.male?.src || '';
  }
  if (frame === 'liver') {
    return anatomy.images.organs.liver?.src || '';
  }
  return '';
}

function appendFrame(parent, frame) {
  const frameEl = el('div', 'run-frame');
  frameEl.setAttribute('data-frame', frame);
  if (frame === 'pov') {
    const pov = el('div', 'run-pov');
    pov.appendChild(el('div', 'run-glass'));
    frameEl.appendChild(pov);
    parent.appendChild(frameEl);
    return;
  }

  const plate = el('div', frame === 'after' ? 'run-plate after' : 'run-plate');
  const src = assetSrc(frame);
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = frame === 'liver' ? 'Placeholder liver' : 'Placeholder body';
    plate.appendChild(img);
  }
  frameEl.appendChild(plate);
  parent.appendChild(frameEl);
  parent.appendChild(el('p', 'run-placeholder', 'Placeholder'));
}

function appendContinue(parent, label, onClick) {
  const button = el('button', 'run-go', label);
  button.type = 'button';
  button.addEventListener('click', onClick);
  parent.appendChild(button);
}

function goToFork(id, replace) {
  const href = runHref(id, baseUrl());
  if (replace) history.replaceState({ run: id }, '', href);
  else history.pushState({ run: id }, '', href);
  showFork(id);
}

function continueNext() {
  const next = nextForkId(fork.id);
  if (next) goToFork(next, false);
}

function renderMissing(wrap) {
  wrap.appendChild(el('p', 'run-brand', 'StackMap'));
  wrap.appendChild(el('h1', 'run-title', 'No such fork'));
  const note = el('p', 'run-note run-missing');
  const link = document.createElement('a');
  link.href = runHref(1, baseUrl());
  link.textContent = 'Back to fork 1';
  link.addEventListener('click', (event) => {
    event.preventDefault();
    goToFork(1, false);
  });
  note.appendChild(link);
  wrap.appendChild(note);
}

function renderGate(wrap) {
  wrap.appendChild(el('p', 'run-brand', 'StackMap'));
  wrap.appendChild(el('p', 'run-kicker', `Fork ${fork.id} of ${FORKS.length}`));
  wrap.appendChild(el('h1', 'run-title', fork.title));
  wrap.appendChild(el('p', 'run-price', RUN_PRICE_LABEL));
  wrap.appendChild(el('p', 'run-note', 'One-time. Preview only — sets a flag on this device. No charge.'));
  appendContinue(wrap, RUN_PRICE_LABEL, () => {
    writeStorage(RUN_UNLOCK_KEY, '1');
    showFork(fork.id);
  });
}

function renderChoices(wrap) {
  wrap.appendChild(el('p', 'run-brand', 'StackMap'));
  wrap.appendChild(el('p', 'run-kicker', `Fork ${fork.id} of ${FORKS.length}`));
  wrap.appendChild(el('h1', 'run-title', fork.title));
  if (fork.organLabel) wrap.appendChild(el('p', 'run-kicker', fork.organLabel));
  if (fork.claim) wrap.appendChild(el('p', 'run-claim', fork.claim));
  if (!fork.beats && fork.kind !== 'report') {
    wrap.appendChild(el('p', 'run-note', fork.stubLine || 'Not filmed in this cut.'));
  }
  const list = el('div', 'run-choices');
  fork.choices.forEach((choice) => {
    const button = el('button', choice.film ? 'run-choice film' : 'run-choice');
    button.type = 'button';
    button.appendChild(el('span', 'run-letter', choice.id));
    button.appendChild(el('span', 'run-choice-label', choice.label));
    if (choice.film) button.appendChild(el('span', 'run-film-tag', 'Film'));
    button.addEventListener('click', () => choose(choice.id));
    list.appendChild(button);
  });
  wrap.appendChild(list);
}

function renderScene(wrap) {
  const beat = outcome.beats[beatIndex];
  const last = beatIndex === outcome.beats.length - 1;
  wrap.appendChild(el('p', 'run-brand', 'StackMap'));
  wrap.appendChild(el('p', 'run-kicker', beat.kicker));
  appendFrame(wrap, beat.frame);
  wrap.appendChild(el('p', 'run-line', beat.line));
  if (fork.claim) wrap.appendChild(el('p', 'run-claim', fork.claim));
  appendContinue(wrap, last ? 'Continue' : 'Next', () => {
    if (!last) {
      beatIndex += 1;
      render();
      return;
    }
    continueNext();
  });
}

function renderSkipOrStub(wrap) {
  wrap.appendChild(el('p', 'run-brand', 'StackMap'));
  wrap.appendChild(el('p', 'run-kicker', outcome.choice.id));
  wrap.appendChild(el('h1', 'run-title', outcome.choice.label));
  wrap.appendChild(el('p', 'run-skip', outcome.line));
  appendContinue(wrap, 'Continue', continueNext);
}

function renderReport(wrap) {
  const rows = reportColumns();
  wrap.appendChild(el('p', 'run-brand', 'StackMap'));
  wrap.appendChild(el('p', 'run-kicker', outcome.choice.label));
  wrap.appendChild(el('h1', 'run-title', 'Report'));
  wrap.appendChild(el('p', 'run-claim', fork.claim));
  const cols = el('div', 'run-columns');
  [
    ['Worse body', 'worse'],
    ['Other body', 'other']
  ].forEach(([heading, key]) => {
    const col = el('section', 'run-col');
    col.appendChild(el('h2', null, heading));
    const list = document.createElement('ol');
    rows.forEach((row) => {
      const item = document.createElement('li');
      item.appendChild(el('strong', null, row.title));
      item.appendChild(document.createTextNode(row[key]));
      list.appendChild(item);
    });
    col.appendChild(list);
    cols.appendChild(col);
  });
  wrap.appendChild(cols);
  wrap.appendChild(el('p', 'run-note', 'End of the run. The other body is not a hero ending.'));
}

function render() {
  if (!root) return;
  root.replaceChildren();
  const wrap = el('div', 'run-wrap');
  root.appendChild(wrap);
  if (!fork) {
    document.title = 'StackMap';
    renderMissing(wrap);
    return;
  }
  document.title = `${fork.title} · StackMap`;
  if (mode === 'gate') renderGate(wrap);
  else if (mode === 'scene') renderScene(wrap);
  else if (mode === 'skip' || mode === 'stub') renderSkipOrStub(wrap);
  else if (mode === 'report') renderReport(wrap);
  else renderChoices(wrap);
}

function choose(choiceId) {
  outcome = resolveChoice(fork, choiceId);
  beatIndex = 0;
  if (!outcome) return;
  mode = outcome.type;
  render();
}

function showFork(id) {
  fork = getFork(id);
  outcome = null;
  beatIndex = 0;
  if (!fork) mode = 'missing';
  else if (fork.paid && !unlocked()) mode = 'gate';
  else mode = 'choose';
  render();
}

function onPop() {
  const id = parseRunId(window.location.pathname, baseUrl());
  if (id == null) {
    window.location.reload();
    return;
  }
  showFork(id);
}

export function bootRun() {
  const id = parseRunId(window.location.pathname, baseUrl());
  if (id == null) return false;

  hideConstellationChrome();
  root = document.getElementById('run-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'run-root';
    document.body.appendChild(root);
  }

  const assetBase = `${baseUrl()}assets/body`.replace(/([^:]\/)\/+/g, '$1');
  anatomy.load(assetBase).then(() => {
    assetsReady = true;
    if (mode === 'scene') render();
  });

  window.addEventListener('popstate', onPop);
  showFork(id);
  return true;
}
