import baseConfig from '@a/eslint-config/base'
import betterspaceApi from '@a/eslint-config/betterspace-api'
import nextjsConfig from '@a/eslint-config/nextjs'
import reactConfig from '@a/eslint-config/react'
import restrictEnvAccess from '@a/eslint-config/restrict-env'
import { defineConfig } from 'eslint/config'

export default defineConfig(
  { ignores: ['dist/**'] },
  baseConfig,
  reactConfig,
  nextjsConfig,
  restrictEnvAccess,
  betterspaceApi
)
