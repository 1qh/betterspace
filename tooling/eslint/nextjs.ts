import nextPlugin from '@next/eslint-plugin-next'
import { defineConfig } from 'eslint/config'

import { warnToError } from './base'

export default defineConfig({
  files: ['**/*.ts', '**/*.tsx'],
  plugins: {
    '@next/next': nextPlugin
  },
  rules: {
    ...warnToError({
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules
    }),
    '@next/next/no-duplicate-head': 'off'
  }
})
