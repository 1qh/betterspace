#!/usr/bin/env bun
/* eslint-disable no-console */
/** biome-ignore-all lint/style/noProcessEnv: cli */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const green = (s: string) => `\u001B[32m${s}\u001B[0m`,
  yellow = (s: string) => `\u001B[33m${s}\u001B[0m`,
  dim = (s: string) => `\u001B[2m${s}\u001B[0m`,
  bold = (s: string) => `\u001B[1m${s}\u001B[0m`,
  TABLES_TS = `import { t } from 'spacetimedb'

const blogTable = {
  id: t.u32(),
  title: t.string(),
  content: t.string(),
  category: t.string(),
  published: t.bool()
}

export { blogTable }
`,
  SCHEMA_TS = `import { schema, table } from 'spacetimedb'

import { blogTable } from './tables'

const db = schema({
  blog: table({ public: true }, blogTable)
})

export { db }
`,
  DB_TS = `import { makeCrud } from 'betterspace/server'

import { db } from './schema'

const blog = makeCrud({
  schema: db,
  table: 'blog'
})

export { blog }
`,
  BLOG_TS = `import { reducer } from 'spacetimedb'

import { blog } from '../db'

const createBlog = reducer('blog.create', (ctx, input: { category: string; content: string; published: boolean; title: string }) =>
  blog.create(ctx, input)
)

const updateBlog = reducer(
  'blog.update',
  (ctx, input: { content?: string; id: number; published?: boolean; title?: string }) => blog.update(ctx, input.id, input)
)

const removeBlog = reducer('blog.rm', (ctx, input: { id: number }) => blog.rm(ctx, input.id))

export { createBlog, removeBlog, updateBlog }
`,
  CLIENT_TS = `'use client'

import { createContext, useContext } from 'react'

interface SpacetimeClient {
  callReducer: (name: string, input: Record<string, unknown>) => Promise<void>
}

const clientContext = createContext<null | SpacetimeClient>(null)

const useSpacetime = (): SpacetimeClient => {
  const client = useContext(clientContext)
  if (!client) throw new Error('Spacetime client not configured')
  return client
}

export { clientContext, useSpacetime }
`,
  LAYOUT_TSX = `import type { ReactNode } from 'react'

import './globals.css'

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang='en'>
    <body>{children}</body>
  </html>
)

export default RootLayout
`,
  PAGE_TSX = `'use client'

import { useState } from 'react'

import { useSpacetime } from '../spacetime-client'

const BlogPage = () => {
  const spacetime = useSpacetime()
  const [title, setTitle] = useState('')

  const handleCreate = async () => {
    if (!title.trim()) return
    await spacetime.callReducer('blog.create', {
      category: 'tech',
      content: '',
      published: false,
      title
    })
    setTitle('')
  }

  return (
    <main className='mx-auto max-w-2xl p-8'>
      <h1 className='mb-6 text-2xl font-bold'>Blog</h1>
      <div className='mb-6 flex gap-2'>
        <input
          className='flex-1 rounded border px-3 py-2'
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder='New post title...'
          value={title}
        />
        <button className='rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700' onClick={handleCreate} type='button'>
          Create
        </button>
      </div>
    </main>
  )
}

export default BlogPage
`,
  ENV_LOCAL = `SPACETIME_SERVER_URL=http://localhost:3000
NEXT_PUBLIC_SPACETIME_SERVER_URL=http://localhost:3000
`,
  BACKEND_FILES: [string, string][] = [
    ['tables.ts', TABLES_TS],
    ['schema.ts', SCHEMA_TS],
    ['db.ts', DB_TS],
    ['reducers/blog.ts', BLOG_TS]
  ],
  FRONTEND_FILES: [string, string][] = [
    ['spacetime-client.ts', CLIENT_TS],
    ['layout.tsx', LAYOUT_TSX],
    ['page.tsx', PAGE_TSX]
  ],
  writeOneFile = ({
    absDir,
    content,
    label,
    name
  }: {
    absDir: string
    content: string
    label: string
    name: string
  }): boolean => {
    const path = join(absDir, name)
    if (existsSync(path)) {
      console.log(`  ${yellow('skip')} ${label}/${name} ${dim('(exists)')}`)
      return false
    }
    const parent = path.slice(0, path.lastIndexOf('/'))
    if (!existsSync(parent)) mkdirSync(parent, { recursive: true })
    writeFileSync(path, content)
    console.log(`  ${green('✓')} ${label}/${name}`)
    return true
  },
  writeFilesToDir = (absDir: string, label: string, files: [string, string][]) => {
    if (!existsSync(absDir)) mkdirSync(absDir, { recursive: true })
    let created = 0,
      skipped = 0
    for (const [name, content] of files)
      if (writeOneFile({ absDir, content, label, name })) created += 1
      else skipped += 1
    return { created, skipped }
  },
  parseFlags = (args: string[]) => {
    let moduleDir = 'module',
      appDir = 'src/app',
      help = false
    for (const arg of args)
      if (arg === '--help' || arg === '-h') help = true
      else if (arg.startsWith('--module-dir=')) moduleDir = arg.slice('--module-dir='.length)
      else if (arg.startsWith('--app-dir=')) appDir = arg.slice('--app-dir='.length)

    return { appDir, help, moduleDir }
  },
  printHelp = () => {
    console.log(`${bold('betterspace init')} — scaffold a betterspace SpacetimeDB project\n`)
    console.log(bold('Usage:'))
    console.log('  betterspace init [options]\n')
    console.log(bold('Options:'))
    console.log(`  --module-dir=DIR  SpacetimeDB module directory ${dim('(default: module)')}`)
    console.log(`  --app-dir=DIR     Next.js app directory ${dim('(default: src/app)')}`)
    console.log('  --help, -h        Show this help\n')
  },
  printSummary = (created: number, skipped: number) => {
    console.log('')
    if (created > 0) console.log(`${green('✓')} Created ${created} file${created > 1 ? 's' : ''}.`)
    if (skipped > 0) console.log(`${yellow('⚠')} Skipped ${skipped} existing file${skipped > 1 ? 's' : ''}.`)
    console.log(`\n${bold('Next steps:')}`)
    console.log(`  ${dim('$')} bun add betterspace spacetimedb zod`)
    console.log(`  ${dim('$')} spacetime publish && spacetime generate && bun dev\n`)
  },
  init = (args: string[] = []) => {
    const { appDir, help, moduleDir } = parseFlags(args)
    if (help) {
      printHelp()
      return
    }
    console.log(`\n${bold('Scaffolding betterspace project...')}\n`)
    const b = writeFilesToDir(join(process.cwd(), moduleDir), moduleDir, BACKEND_FILES),
      f = writeFilesToDir(join(process.cwd(), appDir), appDir, FRONTEND_FILES),
      envPath = join(process.cwd(), '.env.local')
    if (existsSync(envPath)) console.log(`  ${yellow('skip')} .env.local ${dim('(exists)')}`)
    else {
      writeFileSync(envPath, ENV_LOCAL)
      console.log(`  ${green('✓')} .env.local`)
    }
    printSummary(b.created + f.created, b.skipped + f.skipped)
  }

if (process.argv[1]?.endsWith('create.ts') || process.argv[1]?.endsWith('create-betterspace-app'))
  init(process.argv.slice(2))

export { init }
