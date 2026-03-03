import baseConfig from '@a/eslint-config/base'
import betterspaceApi from '@a/eslint-config/betterspace-api'
import nextjsConfig from '@a/eslint-config/nextjs'
import reactConfig from '@a/eslint-config/react'
import restrictEnvAccess from '@a/eslint-config/restrict-env'
import { defineConfig } from 'eslint/config'

export default defineConfig(
  {
    ignores: [
      'dist/**',
      'spacetimedb/src/**',
      'spacetimedb/__tests__/**',
      'spacetimedb/test-skeleton.ts',
      'check-schema.ts',
      'lazy.ts'
    ]
  },
  baseConfig,
  reactConfig,
  nextjsConfig,
  restrictEnvAccess,
  betterspaceApi,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['../../packages/be/eslint.config.ts', '../../packages/be/t.ts', '../../packages/be/z.ts']
        }
      }
    }
  }
)
