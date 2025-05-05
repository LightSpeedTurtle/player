import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  vue.configs['vue3-recommended'],
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
      },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
      // You can add or override TypeScript-specific rules here
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
  {
    files: ['**/*.vue'],
    plugins: { vue },
    rules: {
      'vue/no-unused-components': 'warn',
      'vue/no-multiple-template-root': 'off',
      'vue/no-mutating-props': 'warn',
      'vue/require-default-prop': 'off',
      'vue/multi-word-component-names': 'off',
    },
  },
];
