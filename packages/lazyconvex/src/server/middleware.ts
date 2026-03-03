/* eslint-disable no-await-in-loop */
/** biome-ignore-all lint/performance/noAwaitInLoops: sequential middleware chain */
import type { GlobalHookCtx, GlobalHooks, Middleware, MiddlewareCtx, Rec } from './types'

import { log } from './helpers'

const withOp = (ctx: GlobalHookCtx, op: MiddlewareCtx['operation']): MiddlewareCtx => ({ ...ctx, operation: op }),
  // oxlint-disable-next-line max-statements

  /**
   * Composes multiple middleware instances into a single GlobalHooks object that chains their lifecycle callbacks.
   * @param middlewares - Middleware instances to compose
   * @returns Combined GlobalHooks with all middleware callbacks chained in order
   */
  composeMiddleware = (...middlewares: Middleware[]): GlobalHooks => {
    const hooks: GlobalHooks = {},
      hasBeforeCreate = middlewares.some(mw => mw.beforeCreate),
      hasAfterCreate = middlewares.some(mw => mw.afterCreate),
      hasBeforeUpdate = middlewares.some(mw => mw.beforeUpdate),
      hasAfterUpdate = middlewares.some(mw => mw.afterUpdate),
      hasBeforeDelete = middlewares.some(mw => mw.beforeDelete),
      hasAfterDelete = middlewares.some(mw => mw.afterDelete)

    if (hasBeforeCreate)
      hooks.beforeCreate = async (ctx: GlobalHookCtx, args: { data: Rec }) => {
        let { data } = args
        const mCtx = withOp(ctx, 'create')
        for (const mw of middlewares) if (mw.beforeCreate) data = await mw.beforeCreate(mCtx, { data })
        return data
      }

    if (hasAfterCreate)
      hooks.afterCreate = async (ctx: GlobalHookCtx, args: { data: Rec; id: string }) => {
        const mCtx = withOp(ctx, 'create')
        for (const mw of middlewares) if (mw.afterCreate) await mw.afterCreate(mCtx, args)
      }

    if (hasBeforeUpdate)
      hooks.beforeUpdate = async (ctx: GlobalHookCtx, args: { id: string; patch: Rec; prev: Rec }) => {
        let { patch } = args
        const mCtx = withOp(ctx, 'update')
        for (const mw of middlewares) if (mw.beforeUpdate) patch = await mw.beforeUpdate(mCtx, { ...args, patch })
        return patch
      }

    if (hasAfterUpdate)
      hooks.afterUpdate = async (ctx: GlobalHookCtx, args: { id: string; patch: Rec; prev: Rec }) => {
        const mCtx = withOp(ctx, 'update')
        for (const mw of middlewares) if (mw.afterUpdate) await mw.afterUpdate(mCtx, args)
      }

    if (hasBeforeDelete)
      hooks.beforeDelete = async (ctx: GlobalHookCtx, args: { doc: Rec; id: string }) => {
        const mCtx = withOp(ctx, 'delete')
        for (const mw of middlewares) if (mw.beforeDelete) await mw.beforeDelete(mCtx, args)
      }

    if (hasAfterDelete)
      hooks.afterDelete = async (ctx: GlobalHookCtx, args: { doc: Rec; id: string }) => {
        const mCtx = withOp(ctx, 'delete')
        for (const mw of middlewares) if (mw.afterDelete) await mw.afterDelete(mCtx, args)
      }

    return hooks
  },
  /**
   * Creates a middleware that logs structured audit entries for create, update, and delete operations.
   * @param opts - Optional log level and verbosity settings
   * @returns Middleware that emits audit log entries
   */
  auditLog = (opts?: { logLevel?: 'debug' | 'info'; verbose?: boolean }): Middleware => {
    const level = opts?.logLevel ?? 'info',
      verbose = opts?.verbose ?? false
    return {
      afterCreate: (ctx, { data, id }) => {
        const entry: Rec = { id, op: 'create', table: ctx.table, userId: ctx.userId }
        if (verbose) entry.data = data
        log(level, 'audit:create', entry)
      },
      afterDelete: (ctx, { id }) => {
        log(level, 'audit:delete', { id, op: 'delete', table: ctx.table, userId: ctx.userId })
      },
      afterUpdate: (ctx, { id, patch }) => {
        const entry: Rec = { id, op: 'update', table: ctx.table, userId: ctx.userId }
        if (verbose) entry.fields = Object.keys(patch)
        log(level, 'audit:update', entry)
      },
      name: 'auditLog'
    }
  },
  DEFAULT_SLOW_THRESHOLD_MS = 500,
  /**
   * Creates a middleware that warns when mutation operations exceed a configurable time threshold.
   * @param opts - Optional threshold in milliseconds (default 500ms)
   * @returns Middleware that logs slow operation warnings
   */
  slowQueryWarn = (opts?: { threshold?: number }): Middleware => {
    const threshold = opts?.threshold ?? DEFAULT_SLOW_THRESHOLD_MS
    return {
      afterCreate: (ctx, { id }) => {
        const dur = Date.now() - (((ctx as unknown as Rec)._mwStart as number | undefined) ?? Date.now())
        if (dur > threshold) log('warn', 'slow:create', { durationMs: dur, id, table: ctx.table, threshold })
      },
      afterDelete: (ctx, { id }) => {
        const dur = Date.now() - (((ctx as unknown as Rec)._mwStart as number | undefined) ?? Date.now())
        if (dur > threshold) log('warn', 'slow:delete', { durationMs: dur, id, table: ctx.table, threshold })
      },
      afterUpdate: (ctx, { id }) => {
        const dur = Date.now() - (((ctx as unknown as Rec)._mwStart as number | undefined) ?? Date.now())
        if (dur > threshold) log('warn', 'slow:update', { durationMs: dur, id, table: ctx.table, threshold })
      },
      beforeCreate: (ctx, { data }) => {
        ;(ctx as unknown as Rec)._mwStart = Date.now()
        return data
      },
      beforeDelete: ctx => {
        ;(ctx as unknown as Rec)._mwStart = Date.now()
      },
      beforeUpdate: (ctx, { patch }) => {
        ;(ctx as unknown as Rec)._mwStart = Date.now()
        return patch
      },
      name: 'slowQueryWarn'
    }
  },
  SCRIPT_TAG_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/giu,
  EVENT_HANDLER_PATTERN = /\bon\w+\s*=/giu,
  sanitizeString = (val: string): string => val.replace(SCRIPT_TAG_PATTERN, '').replace(EVENT_HANDLER_PATTERN, ''),
  sanitizeRec = (data: Rec): Rec => {
    const result: Rec = {}
    for (const key of Object.keys(data)) {
      const v = data[key]
      result[key] = typeof v === 'string' ? sanitizeString(v) : v
    }
    return result
  },
  /**
   * Creates a middleware that strips `<script>` tags and inline event handlers from string fields before writes.
   * @param opts - Optional list of specific fields to sanitize; defaults to all string fields
   * @returns Middleware that sanitizes input data
   */
  inputSanitize = (opts?: { fields?: string[] }): Middleware => {
    const targetFields = opts?.fields ? new Set(opts.fields) : undefined
    return {
      beforeCreate: (_ctx, { data }) => {
        if (targetFields) {
          const result: Rec = { ...data }
          for (const f of targetFields) if (typeof result[f] === 'string') result[f] = sanitizeString(result[f])
          return result
        }
        return sanitizeRec(data)
      },
      beforeUpdate: (_ctx, { patch }) => {
        if (targetFields) {
          const result: Rec = { ...patch }
          for (const f of targetFields) if (typeof result[f] === 'string') result[f] = sanitizeString(result[f])
          return result
        }
        return sanitizeRec(patch)
      },
      name: 'inputSanitize'
    }
  }

export { auditLog, composeMiddleware, inputSanitize, sanitizeRec, sanitizeString, slowQueryWarn }
