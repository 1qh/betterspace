import { recommended } from 'betterspace/eslint'
import { eslint, warnToError } from 'lintmax/eslint'

const config = eslint({
  append: [
    {
      ...recommended,
      files: ['packages/be/**/*.ts', 'packages/be/**/*.tsx'],
      rules: {
        ...warnToError(recommended.rules),
        'betterspace/discovery-check': 'off'
      }
    },
    {
      files: ['packages/be/spacetimedb/src/**/*.ts'],
      rules: {
        '@typescript-eslint/no-unsafe-assignment': 'off',
        'betterspace/no-duplicate-crud': 'off'
      }
    },
    {
      rules: {
        'better-tailwindcss/no-unknown-classes': [
          'error',
          {
            ignore: [
              'group',
              'peer',
              'nodrag',
              'nopan',
              'nowheel',
              'not-prose',
              'is-user',
              'is-assistant',
              'is-user:dark',
              'animated',
              'node-container',
              'origin-top-center',
              'toaster'
            ]
          }
        ]
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
    }
  ],
  ignores: ['packages/be/spacetimedb/module_bindings/**', 'packages/ui/**'],
  rules: {
    '@eslint-react/hooks-extra/no-direct-set-state-in-use-effect': 'off',
    '@typescript-eslint/no-magic-numbers': 'off',
    'no-magic-numbers': 'off',
    'react-hooks/preserve-manual-memoization': 'off',
    'react-hooks/set-state-in-effect': 'off'
  },
  tailwind: 'packages/ui/src/styles/globals.css'
})

export default config
