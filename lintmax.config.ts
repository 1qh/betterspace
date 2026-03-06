import { defineConfig } from 'lintmax'

export default defineConfig({
  biome: {
    overrides: [
      {
        disableLinter: true,
        includes: ['packages/ui/**']
      }
    ]
  },
  oxlint: {
    ignorePatterns: ['_generated/', 'module_bindings', 'mobile/maestro/', 'packages/ui/'],
    overrides: [
      {
        files: ['**/spacetimedb/blogProfile.ts', '**/spacetimedb/mobileAi.ts', '**/spacetimedb/orgProfile.ts'],
        rules: { 'unicorn/filename-case': 'off' }
      }
    ]
  }
})
