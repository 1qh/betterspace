import { defineConfig } from 'eslint/config'

import baseConfig from './base'
import nextjsConfig from './nextjs'
import reactConfig from './react'
import restrictEnvAccess from './restrict-env'

export default defineConfig(
  { ignores: ['.next/**', 'e2e/**'] },
  baseConfig,
  reactConfig,
  nextjsConfig,
  restrictEnvAccess,
  {
    rules: {
      '@eslint-react/hooks-extra/no-direct-set-state-in-use-effect': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
      'no-magic-numbers': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/set-state-in-effect': 'off'
    }
  }
)
