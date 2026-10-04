/**
 * MyStack — local personal stack profile (Phase 1+ depth).
 *
 * Persists selected constellation nodes in localStorage so users can build
 * and re-open a personal stack without accounts. Free-tier soft limit is
 * advisory only (no paywall). Supports notes + morning/evening slots.
 */

import { FREE_STACK_LIMIT, isOverFreeStackLimit } from './FeatureFlags.js';
import { readStorage, writeStorage } from './persist.js';

const STORAGE_KEY = 'stackmap-mystack-v1';
const LEGACY_STORAGE_KEY = 'aetheris-mystack-v1';
const HIGHLIGHT_KEY = 'stackmap-mystack-highlight';
const LEGACY_HIGHLIGHT_KEY = 'aetheris-mystack-highlight';
const VIEW_KEY = 'stackmap-mystack-view';
const SCHEMA_VERSION = 1;

/** @deprecated Prefer FREE_STACK_LIMIT from FeatureFlags — kept as alias. */
export const FREE_STACK_SOFT_LIMIT = FREE_STACK_LIMIT;
export { FREE_STACK_LIMIT };

const VALID_SLOTS = new Set(['morning', 'evening', null, undefined, '']);

function emptyProfile() {
  return {
    schemaVersion: SCHEMA_VERSION,
    selectedNodes: [],
    updatedAt: null
  };
}

function nodeKey(id, constellation) {
  return `${String(constellation || 'supplements').toLowerCase()}::${String(id)}`;
}

function normalizeEntry(raw) {
  if (!raw || typeof raw !== 'object' || !raw.id) return null;
  const constellation = String(raw.constellation || raw.tree || 'supplements').toLowerCase();
  const entry = {
    id: String(raw.id),
    constellation,
  };
  if (raw.note != null && String(raw.note).trim()) {
    entry.note = String(raw.note).slice(0, 500);
  }
  const slot = raw.slot == null || raw.slot === '' ? null : String(raw.slot).toLowerCase();
  if (slot === 'morning' || slot === 'evening') {
    entry.slot = slot;
  }
  // Absent means active — only an explicit pause is stored.
  if (raw.paused) entry.paused = true;
  return entry;
}

export class MyStackStore {
  constructor() {
    this.profile = emptyProfile();
    this.highlightMode = false;
    this.viewMode = 'all';
    this._listeners = new Set();
    this._index = new Map(); // key -> entry
  }

  load() {
    try {
      const raw = readStorage(STORAGE_KEY, [LEGACY_STORAGE_KEY]);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.profile = this._migrate(parsed);
      } else {
        this.profile = emptyProfile();
      }
    } catch {
      this.profile = emptyProfile();
    }
    this.highlightMode = readStorage(HIGHLIGHT_KEY, [LEGACY_HIGHLIGHT_KEY]) === '1';
    this.viewMode = readStorage(VIEW_KEY) === 'active' ? 'active' : 'all';
    this._rebuildIndex();
    this._emit();
    return this;
  }

  _migrate(parsed) {
    const base = emptyProfile();
    if (!parsed || typeof parsed !== 'object') return base;
    const version = Number(parsed.schemaVersion) || 1;
    // Future: branch on version for field renames / shape changes
    const nodes = Array.isArray(parsed.selectedNodes) ? parsed.selectedNodes : [];
    base.schemaVersion = SCHEMA_VERSION;
    base.selectedNodes = nodes.map(normalizeEntry).filter(Boolean);
    base.updatedAt = parsed.updatedAt || null;
    if (version !== SCHEMA_VERSION) {
      // schema bump placeholder — currently identity migrate into v1 shape
      base.schemaVersion = SCHEMA_VERSION;
    }
    return base;
  }

  _rebuildIndex() {
    this._index.clear();
    for (const entry of this.profile.selectedNodes) {
      this._index.set(nodeKey(entry.id, entry.constellation), entry);
    }
  }

  _persist() {
    this.profile.updatedAt = new Date().toISOString();
    this.profile.schemaVersion = SCHEMA_VERSION;
    writeStorage(STORAGE_KEY, JSON.stringify(this.profile));
    this._emit();
  }

  _emit() {
    for (const fn of this._listeners) {
      try { fn(this); } catch { /* non-fatal */ }
    }
  }

  subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  getCount() {
    return this.profile.selectedNodes.length;
  }

  /** Stack entries that are not paused. */
  getActiveCount() {
    return this.profile.selectedNodes.filter((e) => !e.paused).length;
  }

  getEntries() {
    return this.profile.selectedNodes.slice();
  }

  getEntry(id, constellation) {
    return this._index.get(nodeKey(id, constellation)) || null;
  }

  has(id, constellation) {
    return this._index.has(nodeKey(id, constellation));
  }

  /** In the stack and not paused. Missing `paused` counts as active. */
  isActive(id, constellation) {
    const entry = this.getEntry(id, constellation);
    return !!(entry && !entry.paused);
  }

  /** Ids in stack for a single constellation (for canvas highlight). */
  idsFor(constellation) {
    const set = new Set();
    const c = String(constellation || '').toLowerCase();
    for (const entry of this.profile.selectedNodes) {
      if (entry.constellation === c) set.add(entry.id);
    }
    return set;
  }

  /**
   * Add a node. Soft-limit: still allows add but returns { overSoftLimit: true }.
   * Never hard-blocks.
   */
  add(id, constellation, extras = {}) {
    if (!id) return { ok: false, reason: 'missing-id' };
    const c = String(constellation || 'supplements').toLowerCase();
    const key = nodeKey(id, c);
    if (this._index.has(key)) {
      return { ok: true, already: true, overSoftLimit: isOverFreeStackLimit(this.getCount()) };
    }
    const entry = normalizeEntry({ id, constellation: c, ...extras });
    if (!entry) return { ok: false, reason: 'invalid' };
    this.profile.selectedNodes.push(entry);
    this._index.set(key, entry);
    this._persist();
    return {
      ok: true,
      overSoftLimit: isOverFreeStackLimit(this.getCount()),
      count: this.getCount()
    };
  }

  remove(id, constellation) {
    const key = nodeKey(id, constellation);
    if (!this._index.has(key)) return { ok: false, reason: 'not-found' };
    this.profile.selectedNodes = this.profile.selectedNodes.filter(
      (e) => nodeKey(e.id, e.constellation) !== key
    );
    this._index.delete(key);
    this._persist();
    return { ok: true, count: this.getCount() };
  }

  toggle(id, constellation, extras = {}) {
    if (this.has(id, constellation)) {
      return { ...this.remove(id, constellation), removed: true };
    }
    return { ...this.add(id, constellation, extras), added: true };
  }

  setNote(id, constellation, note) {
    const entry = this.getEntry(id, constellation);
    if (!entry) return { ok: false };
    const trimmed = note == null ? '' : String(note).slice(0, 500);
    if (trimmed) entry.note = trimmed;
    else delete entry.note;
    this._persist();
    return { ok: true };
  }

  setSlot(id, constellation, slot) {
    const entry = this.getEntry(id, constellation);
    if (!entry) return { ok: false };
    const s = slot == null || slot === '' ? null : String(slot).toLowerCase();
    if (s && s !== 'morning' && s !== 'evening') return { ok: false, reason: 'bad-slot' };
    if (s) entry.slot = s;
    else delete entry.slot;
    this._persist();
    return { ok: true };
  }

  setPaused(id, constellation, paused) {
    const entry = this.getEntry(id, constellation);
    if (!entry) return { ok: false };
    if (paused) entry.paused = true;
    else delete entry.paused;
    this._persist();
    return { ok: true, paused: !!entry.paused };
  }

  clear() {
    this.profile.selectedNodes = [];
    this._index.clear();
    this._persist();
    return { ok: true };
  }

  setHighlightMode(on) {
    this.highlightMode = !!on;
    writeStorage(HIGHLIGHT_KEY, this.highlightMode ? '1' : '0');
    this._emit();
  }

  toggleHighlightMode() {
    this.setHighlightMode(!this.highlightMode);
    return this.highlightMode;
  }

  setViewMode(mode) {
    this.viewMode = mode === 'active' ? 'active' : 'all';
    writeStorage(VIEW_KEY, this.viewMode);
    this._emit();
  }

  exportJSON() {
    return JSON.stringify(
      {
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        app: 'stackmap',
        legacyApp: 'aetheris',
        selectedNodes: this.profile.selectedNodes
      },
      null,
      2
    );
  }

  /**
   * Import from JSON string or object. Replaces current stack (merge=false)
   * or merges entries (merge=true).
   */
  importJSON(input, { merge = false } = {}) {
    let parsed = input;
    if (typeof input === 'string') {
      parsed = JSON.parse(input);
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid My Stack JSON');
    }
    const list = Array.isArray(parsed.selectedNodes)
      ? parsed.selectedNodes
      : (Array.isArray(parsed) ? parsed : null);
    if (!list) throw new Error('My Stack JSON missing selectedNodes[]');

    const incoming = list.map(normalizeEntry).filter(Boolean);
    if (!merge) {
      this.profile.selectedNodes = incoming;
    } else {
      for (const entry of incoming) {
        const key = nodeKey(entry.id, entry.constellation);
        if (this._index.has(key)) {
          const existing = this._index.get(key);
          if (entry.note) existing.note = entry.note;
          if (entry.slot) existing.slot = entry.slot;
          if (entry.paused) existing.paused = true;
        } else {
          this.profile.selectedNodes.push(entry);
        }
      }
    }
    this._rebuildIndex();
    this._persist();
    return { ok: true, count: this.getCount() };
  }

  /** Whether canvas should dim this node under highlight mode. */
  shouldDim(id, constellation) {
    if (!this.highlightMode) return false;
    if (this.getCount() === 0) return false;
    return !this.has(id, constellation);
  }

  /** Active view hides everything except active stack entries. All view hides nothing. */
  shouldHide(id, constellation) {
    return this.viewMode === 'active' && !this.isActive(id, constellation);
  }
}

/** Singleton used by the app. */
export const myStack = new MyStackStore();
