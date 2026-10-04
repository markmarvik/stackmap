import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'node_modules/**']
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      globals: globals.browser
    }
  },
  {
    // Config files and the node:test smoke suite run in Node, not the browser.
    files: ['*.config.js', 'test/**/*.js'],
    languageOptions: {
      globals: globals.node
    }
  }
];
