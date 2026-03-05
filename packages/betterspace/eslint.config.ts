import baseConfig from '@a/eslint-config/base'
import reactConfig from '@a/eslint-config/react'
import { defineConfig } from 'eslint/config'

export default defineConfig({ ignores: ['dist/**'] }, baseConfig, reactConfig, {
  rules: {
    '@eslint-react/hooks-extra/no-direct-set-state-in-use-effect': 'off',
    '@typescript-eslint/no-magic-numbers': 'off',
    'no-magic-numbers': 'off',
    'react-hooks/preserve-manual-memoization': 'off',
    'react-hooks/set-state-in-effect': 'off'
  }
})
