import perfectionist from 'eslint-plugin-perfectionist'
import ts from 'typescript-eslint'

export default ts.config(
  {ignores: ['dist/*', 'benchmarks/*']},
  ...ts.configs.recommended,
  perfectionist.configs['recommended-line-length'],
  {
    rules: {
      'quotes': ['error', 'single'],
      'indent': ['error', 2],
      'semi': ['error', 'never'],
      'object-curly-spacing': 'error',
      'array-bracket-spacing': 'error',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'perfectionist/sort-interfaces': 'off',
      'perfectionist/sort-object-types': 'off',
      'perfectionist/sort-jsx-props': 'off',
      'perfectionist/sort-objects': 'off',
      'perfectionist/sort-classes': 'off',
    },
  },
)
