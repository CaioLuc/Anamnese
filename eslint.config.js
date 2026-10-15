import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // Cloud Functions rodam em Node (CommonJS)
    files: ['functions/**/*.js'],
    languageOptions: { globals: globals.node, sourceType: 'commonjs' },
  },
  {
    // Testes do Firebase Emulator Suite rodam em Node (ESM)
    files: ['tests/emulador/**/*.js', 'vitest.emulador.config.js'],
    languageOptions: { globals: globals.node },
  },
])
