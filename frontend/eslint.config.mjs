import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';


/** @type {import('eslint').Linter.Config[]} */
export default [
  {files: ['**/*.{js,mjs,cjs,ts,vue}']},
  {languageOptions: { globals: globals.browser }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {files: ['**/*.vue'], languageOptions: {parserOptions: {parser: tseslint.parser}}},
  {ignores: ['dist/assets/*.js']},
  // Add Auto-Fixable Formatting Rules:
  {
    rules: {
      'indent': ['error', 2],  // Enforce 2-space indentation
      'quotes': ['error', 'single'],  // Use single quotes
      'vue/html-indent': ['error', 2],  // Enforce indentation in Vue files
      'vue/max-attributes-per-line': ['error', { singleline: 3 }], // Format Vue attributes
      '@typescript-eslint/no-explicit-any': 'off',  // Disable 'any' restriction
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',  // Allow @ts-ignore and @ts-expect-error
      '@typescript-eslint/no-unused-expressions': 'off',
      'vue/multi-word-component-names': 'off',
      'no-unused-vars': ['warn'],
    },
  },
];