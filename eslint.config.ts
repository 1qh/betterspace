import baseConfig, { warnToError } from '@a/eslint-config/base'
import nextjsConfig from '@a/eslint-config/nextjs'
import reactConfig from '@a/eslint-config/react'
import { recommended } from 'betterspace/eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const betterspaceRules = warnToError(recommended.rules),
  config = defineConfig(
    globalIgnores(['packages/be/spacetimedb/module_bindings/**', 'packages/ui/**']),
    baseConfig,
    reactConfig,
    nextjsConfig,
    {
      ...recommended,
      files: ['packages/be/**/*.ts', 'packages/be/**/*.tsx'],
      rules: {
        ...betterspaceRules,
        'betterspace/discovery-check': 'off'
      }
    },
    {
      files: ['packages/be/spacetimedb/src/**/*.ts'],
      rules: {
        'betterspace/no-duplicate-crud': 'off'
      }
    },
    {
      files: ['apps/**/*.ts', 'apps/**/*.tsx', 'packages/be/**/*.ts', 'packages/be/**/*.tsx'],
      ignores: ['**/env.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            importNames: ['env'],
            message: "Use `import env from '~/env'` instead to ensure validated types.",
            name: 'process'
          }
        ],
        'no-restricted-properties': [
          'error',
          {
            message: "Use `import env from '~/env'` instead to ensure validated types.",
            object: 'process',
            property: 'env'
          }
        ]
      }
    },
    {
      rules: {
        '@eslint-react/hooks-extra/no-direct-set-state-in-use-effect': 'off',
        '@typescript-eslint/no-magic-numbers': 'off',
        'no-magic-numbers': 'off',
        'react-hooks/preserve-manual-memoization': 'off',
        'react-hooks/set-state-in-effect': 'off'
      }
    },
    {
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir: import.meta.dirname
        }
      }
    }
  )

export default config
