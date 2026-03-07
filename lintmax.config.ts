import { defineConfig } from 'lintmax'

export default defineConfig({
  biome: {
    overrides: [
      {
        disableLinter: true,
        includes: ['packages/ui/**']
      },
      {
        disableLinter: true,
        includes: ['**/generated/**', '**/module_bindings/**']
      }
    ]
  },
  oxlint: {
    ignorePatterns: ['_generated/', 'generated/', 'module_bindings', 'mobile/maestro/', 'packages/ui/']
  }
})
