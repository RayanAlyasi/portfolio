// Lint rules for the site's JavaScript: browser modules in src/scripts, Node scripts everywhere else.
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';

export default defineConfig([
  globalIgnores(['dist/', '.astro/', 'node_modules/', 'deploy/nginx/site.conf']),
  js.configs.recommended,
  {
    files: ['src/scripts/**/*.js'],
    languageOptions: { sourceType: 'module', globals: globals.browser },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: { sourceType: 'module', globals: globals.node },
  },
  {
    // The layout check passes functions to Playwright's page.evaluate, which run inside the browser.
    files: ['scripts/qa/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    rules: {
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
]);
