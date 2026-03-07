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
    ignorePatterns: ['_generated/', 'module_bindings', 'mobile/maestro/', 'packages/ui/']
  }
})
