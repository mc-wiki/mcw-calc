// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: ['dist', '**/dist/**', '**/locale/**'],
  vue: true,
  stylistic: false,
  rules: {
    'ts/consistent-type-imports': 'off',
    'no-console': 'off',
    'vue/singleline-html-element-content-newline': 'off',
    'ts/ban-ts-comment': [
      'error',
      {
        'ts-ignore': 'allow-with-description',
        'ts-nocheck': 'allow-with-description',
      },
    ],
    'unused-imports/no-unused-vars': 'warn',
    'node/prefer-global/process': 'off',
    'vue/html-self-closing': 'off',
    'vue/html-indent': 'off',
  },
})
