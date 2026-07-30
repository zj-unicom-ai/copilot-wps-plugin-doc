/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  root: true,
  'extends': [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-prettier/skip-formatting'
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  globals: {
    // WPS API globals
    Application: 'readonly',
    wps: 'readonly',
    // Node.js globals for scripts
    process: 'readonly'
  },
  rules: {
    'vue/multi-word-component-names': ['error', {
      ignores: ['Settings', 'Preview']
    }]
  },
  ignorePatterns: [
    'public/office.js',
    'dist/',
    'node_modules/'
  ]
}
