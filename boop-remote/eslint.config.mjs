export default [{
  files: ['**/*.js', '**/*.mjs'],
  languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { window: 'readonly', document: 'readonly', navigator: 'readonly', localStorage: 'readonly', location: 'readonly', fetch: 'readonly', console: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', URL: 'readonly', process: 'readonly', AbortSignal: 'readonly', Bun: 'readonly' } },
  rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }], 'no-undef': 'error', 'no-unreachable': 'error', 'no-dupe-keys': 'error', 'eqeqeq': ['error', 'smart'] },
}];
