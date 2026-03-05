/// <reference types="./types.d.ts" />

import type { Linter } from 'eslint'

import eslintReact from '@eslint-react/eslint-plugin'
import { includeIgnoreFile } from '@eslint/compat'
import eslint from '@eslint/js'
import { configs as perfectionist } from 'eslint-plugin-perfectionist'
import preferArrow from 'eslint-plugin-prefer-arrow-functions'
import turbo from 'eslint-plugin-turbo'
import { defineConfig, globalIgnores } from 'eslint/config'
import { join } from 'node:path'
import tseslint from 'typescript-eslint'

const warnToError = (rules: Partial<Linter.RulesRecord>): Linter.RulesRecord => {
  const result: Linter.RulesRecord = {}
  for (const [key, value] of Object.entries(rules))
    if (value === undefined) result[key] = 'error'
    else if (value === 'warn' || value === 1) result[key] = 'error'
    else if (Array.isArray(value) && (value[0] === 'warn' || value[0] === 1)) result[key] = ['error', ...value.slice(1)]
    else result[key] = value

  return result
}

export { warnToError }

export default defineConfig(
  includeIgnoreFile(join(import.meta.dirname, '../../.gitignore')),
  globalIgnores(['module_bindings']),
  perfectionist['recommended-natural'],
  { ignores: ['postcss.config.mjs'] },
  {
    extends: [
      eslint.configs.recommended,
      eslint.configs.all,
      ...tseslint.configs.all,
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      eslintReact.configs['strict-type-checked'],
      eslintReact.configs.recommended
    ],
    files: ['**/*.js', '**/*.ts', '**/*.tsx'],
    plugins: {
      preferArrow,
      turbo
    },
    rules: {
      '@eslint-react/avoid-shorthand-boolean': 'off',
      '@eslint-react/avoid-shorthand-fragment': 'off',
      '@eslint-react/jsx-dollar': 'error',
      '@eslint-react/jsx-shorthand-boolean': 'error',
      '@eslint-react/jsx-shorthand-fragment': 'error',
      '@eslint-react/naming-convention/component-name': 'error',
      '@eslint-react/naming-convention/ref-name': 'error',
      '@eslint-react/no-duplicate-key': 'error',
      '@eslint-react/no-missing-component-display-name': 'error',
      '@eslint-react/no-missing-context-display-name': 'off',
      '@eslint-react/no-unnecessary-key': 'error',
      '@typescript-eslint/consistent-return': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'separate-type-imports', prefer: 'type-imports' }
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/init-declarations': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        { format: ['camelCase', 'UPPER_CASE', 'PascalCase'], selector: 'variable' }
      ],
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/no-misused-promises': [2, { checksVoidReturn: { attributes: false } }],
      '@typescript-eslint/no-unnecessary-condition': ['error', { allowConstantLoopConditions: true }],
      '@typescript-eslint/no-unsafe-type-assertion': 'off',
      '@typescript-eslint/prefer-readonly-parameter-types': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      camelcase: 'off',
      'capitalized-comments': ['error', 'always', { ignorePattern: 'oxlint|biome|console|let|const|return|if|for|throw' }],
      curly: ['error', 'multi'],
      'id-length': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'new-cap': ['error', { capIsNewExceptionPattern: 'Inter|JetBrains_Mono' }],
      'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
      'no-magic-numbers': 'off',
      'no-nested-ternary': 'off',
      'no-ternary': 'off',
      'no-undefined': 'off',
      'no-underscore-dangle': 'off',
      'one-var': ['error', 'consecutive'],
      'perfectionist/sort-variable-declarations': 'off',
      'preferArrow/prefer-arrow-functions': ['error', { returnStyle: 'implicit' }],
      'sort-imports': 'off',
      'sort-keys': 'off',
      'sort-vars': 'off'
    }
  },
  {
    rules: {
      ...warnToError({
        ...eslintReact.configs['strict-type-checked'].rules,
        ...eslintReact.configs.recommended.rules
      }),
      '@eslint-react/dom/no-string-style-prop': 'error'
    }
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    linterOptions: { reportUnusedDisableDirectives: true }
  }
)
