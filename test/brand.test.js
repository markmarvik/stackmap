import test from 'node:test';
import assert from 'node:assert/strict';
import { PUBLIC_HOST_LABEL, PUBLIC_URL } from '../src/core/Brand.js';

// Plain node leaves import.meta.env undefined, so this must not throw.
test('Brand public URL falls back when imported from node', () => {
  assert.equal(PUBLIC_URL, 'https://stackmap-31c.pages.dev/');
  assert.ok(PUBLIC_URL.endsWith('/'));
  assert.equal(PUBLIC_HOST_LABEL.includes('https://'), false);
  assert.equal(PUBLIC_HOST_LABEL, 'stackmap-31c.pages.dev');
});
