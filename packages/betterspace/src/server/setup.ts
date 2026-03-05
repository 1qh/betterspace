/** biome-ignore-all lint/nursery/useConsistentMethodSignatures: bivariant method syntax needed for SDK compat */
/* eslint-disable @typescript-eslint/max-params */
import type { AlgebraicTypeType, ReducerExport, TypeBuilder } from 'spacetimedb/server'

import type { GlobalHookCtx, GlobalHooks, Middleware, Rec } from './types'
import type { CacheFieldBuilders, CacheOptions } from './types/cache'
import type { CrudFieldBuilders, CrudHooks, CrudOptions } from './types/crud'
import type { FileUploadFields } from './types/file'
import type { OrgCrudFieldBuilders, OrgCrudOptions } from './types/org-crud'
import type { SingletonFieldBuilders, SingletonHooks, SingletonOptions } from './types/singleton'

import { makeCacheCrud } from './cache-crud'
import { makeChildCrud } from './child'
import { makeCrud } from './crud'
import { makeFileUpload } from './file'
import { err } from './helpers'
import { composeMiddleware } from './middleware'
import { makeOrg } from './org'
import { makeOrgCrud } from './org-crud'
import { makeSingletonCrud } from './singleton'

interface CrudDefaults {
  expectedUpdatedAtField: TypeBuilder<unknown, AlgebraicTypeType>
  foreignKeyField?: TypeBuilder<unknown, AlgebraicTypeType>
  idField: TypeBuilder<unknown, AlgebraicTypeType>
  orgIdField?: TypeBuilder<unknown, AlgebraicTypeType>
}

type ReducerExportRecord = Record<string, ReducerExport<never, never>>

interface SetupConfig {
  hooks?: GlobalHooks
  middleware?: Middleware[]
}

interface SpacetimeDbLike {
  // eslint-disable-next-line @typescript-eslint/method-signature-style
  reducer(...args: unknown[]): unknown
}

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> => {
    if (!value || typeof value !== 'object') return false
    const { then } = value as { then?: unknown }
    return typeof then === 'function'
  },
  requireSync = <T>(value: Promise<T> | T, hookName: string): T => {
    if (isPromiseLike(value))
      return err('VALIDATION_FAILED', { message: `Hook "${hookName}" must be synchronous in SpacetimeDB reducers` })
    return value
  },
  toGlobalCtx = (
    table: string,
    { db, sender, timestamp }: { db: unknown; sender: GlobalHookCtx['sender']; timestamp: GlobalHookCtx['timestamp'] }
  ): GlobalHookCtx => ({ db, sender, table, timestamp }),
  hasGlobalHooks = (hooks: GlobalHooks): boolean =>
    Boolean(
      hooks.beforeCreate ??
        hooks.afterCreate ??
        hooks.beforeUpdate ??
        hooks.afterUpdate ??
        hooks.beforeDelete ??
        hooks.afterDelete
    ),
  mergeGlobalBeforeCreate = (left: GlobalHooks, right: GlobalHooks): GlobalHooks['beforeCreate'] => {
    if (!(left.beforeCreate || right.beforeCreate)) return
    return (ctx, { data: initialData }) => {
      let data = initialData
      if (left.beforeCreate) data = requireSync(left.beforeCreate(ctx, { data }), 'global.beforeCreate:left')
      if (right.beforeCreate) data = requireSync(right.beforeCreate(ctx, { data }), 'global.beforeCreate:right')
      return data
    }
  },
  mergeGlobalAfterCreate = (left: GlobalHooks, right: GlobalHooks): GlobalHooks['afterCreate'] => {
    if (!(left.afterCreate || right.afterCreate)) return
    return (ctx, args) => {
      if (left.afterCreate) requireSync(left.afterCreate(ctx, args), 'global.afterCreate:left')
      if (right.afterCreate) requireSync(right.afterCreate(ctx, args), 'global.afterCreate:right')
    }
  },
  mergeGlobalBeforeUpdate = (left: GlobalHooks, right: GlobalHooks): GlobalHooks['beforeUpdate'] => {
    if (!(left.beforeUpdate || right.beforeUpdate)) return
    return (ctx, { patch: initialPatch, prev }) => {
      let patch = initialPatch
      if (left.beforeUpdate) patch = requireSync(left.beforeUpdate(ctx, { patch, prev }), 'global.beforeUpdate:left')
      if (right.beforeUpdate) patch = requireSync(right.beforeUpdate(ctx, { patch, prev }), 'global.beforeUpdate:right')
      return patch
    }
  },
  mergeGlobalAfterUpdate = (left: GlobalHooks, right: GlobalHooks): GlobalHooks['afterUpdate'] => {
    if (!(left.afterUpdate || right.afterUpdate)) return
    return (ctx, args) => {
      if (left.afterUpdate) requireSync(left.afterUpdate(ctx, args), 'global.afterUpdate:left')
      if (right.afterUpdate) requireSync(right.afterUpdate(ctx, args), 'global.afterUpdate:right')
    }
  },
  mergeGlobalBeforeDelete = (left: GlobalHooks, right: GlobalHooks): GlobalHooks['beforeDelete'] => {
    if (!(left.beforeDelete || right.beforeDelete)) return
    return (ctx, args) => {
      if (left.beforeDelete) requireSync(left.beforeDelete(ctx, args), 'global.beforeDelete:left')
      if (right.beforeDelete) requireSync(right.beforeDelete(ctx, args), 'global.beforeDelete:right')
    }
  },
  mergeGlobalAfterDelete = (left: GlobalHooks, right: GlobalHooks): GlobalHooks['afterDelete'] => {
    if (!(left.afterDelete || right.afterDelete)) return
    return (ctx, args) => {
      if (left.afterDelete) requireSync(left.afterDelete(ctx, args), 'global.afterDelete:left')
      if (right.afterDelete) requireSync(right.afterDelete(ctx, args), 'global.afterDelete:right')
    }
  },
  mergeGlobalHooks = (left: GlobalHooks | undefined, right: GlobalHooks | undefined): GlobalHooks | undefined => {
    if (!(left || right)) return
    if (!left) return right
    if (!right) return left

    const merged: GlobalHooks = {
      afterCreate: mergeGlobalAfterCreate(left, right),
      afterDelete: mergeGlobalAfterDelete(left, right),
      afterUpdate: mergeGlobalAfterUpdate(left, right),
      beforeCreate: mergeGlobalBeforeCreate(left, right),
      beforeDelete: mergeGlobalBeforeDelete(left, right),
      beforeUpdate: mergeGlobalBeforeUpdate(left, right)
    }

    if (!hasGlobalHooks(merged)) return
    return merged
  },
  hasCrudHooks = <DB, Row extends Rec, CreateArgs extends Rec, UpdatePatch extends Rec>(
    hooks: CrudHooks<DB, Row, CreateArgs, UpdatePatch>
  ): boolean =>
    Boolean(
      hooks.beforeCreate ??
        hooks.afterCreate ??
        hooks.beforeUpdate ??
        hooks.afterUpdate ??
        hooks.beforeDelete ??
        hooks.afterDelete
    ),
  mergeCrudBeforeCreate = <DB, Row extends Rec, CreateArgs extends Rec, UpdatePatch extends Rec>(
    table: string,
    globalHooks: GlobalHooks | undefined,
    localHooks: CrudHooks<DB, Row, CreateArgs, UpdatePatch> | undefined
  ): CrudHooks<DB, Row, CreateArgs, UpdatePatch>['beforeCreate'] => {
    if (!(globalHooks?.beforeCreate || localHooks?.beforeCreate)) return
    return (ctx, { data: initialData }) => {
      let data = initialData
      if (globalHooks?.beforeCreate)
        data = requireSync(
          globalHooks.beforeCreate(toGlobalCtx(table, ctx), { data: data as Rec }),
          'crud.beforeCreate:global'
        ) as CreateArgs
      if (localHooks?.beforeCreate) data = requireSync(localHooks.beforeCreate(ctx, { data }), 'crud.beforeCreate:local')
      return data
    }
  },
  mergeCrudAfterCreate = <DB, Row extends Rec, CreateArgs extends Rec, UpdatePatch extends Rec>(
    table: string,
    globalHooks: GlobalHooks | undefined,
    localHooks: CrudHooks<DB, Row, CreateArgs, UpdatePatch> | undefined
  ): CrudHooks<DB, Row, CreateArgs, UpdatePatch>['afterCreate'] => {
    if (!(globalHooks?.afterCreate || localHooks?.afterCreate)) return
    return (ctx, { data, row }) => {
      if (globalHooks?.afterCreate)
        requireSync(
          globalHooks.afterCreate(toGlobalCtx(table, ctx), { data: data as Rec, row: row as Rec }),
          'crud.afterCreate:global'
        )
      if (localHooks?.afterCreate) requireSync(localHooks.afterCreate(ctx, { data, row }), 'crud.afterCreate:local')
    }
  },
  mergeCrudBeforeUpdate = <DB, Row extends Rec, CreateArgs extends Rec, UpdatePatch extends Rec>(
    table: string,
    globalHooks: GlobalHooks | undefined,
    localHooks: CrudHooks<DB, Row, CreateArgs, UpdatePatch> | undefined
  ): CrudHooks<DB, Row, CreateArgs, UpdatePatch>['beforeUpdate'] => {
    if (!(globalHooks?.beforeUpdate || localHooks?.beforeUpdate)) return
    return (ctx, { patch: initialPatch, prev }) => {
      let patch = initialPatch
      if (globalHooks?.beforeUpdate)
        patch = requireSync(
          globalHooks.beforeUpdate(toGlobalCtx(table, ctx), { patch: patch as Rec, prev: prev as Rec }),
          'crud.beforeUpdate:global'
        ) as UpdatePatch
      if (localHooks?.beforeUpdate)
        patch = requireSync(localHooks.beforeUpdate(ctx, { patch, prev }), 'crud.beforeUpdate:local')
      return patch
    }
  },
  mergeCrudAfterUpdate = <DB, Row extends Rec, CreateArgs extends Rec, UpdatePatch extends Rec>(
    table: string,
    globalHooks: GlobalHooks | undefined,
    localHooks: CrudHooks<DB, Row, CreateArgs, UpdatePatch> | undefined
  ): CrudHooks<DB, Row, CreateArgs, UpdatePatch>['afterUpdate'] => {
    if (!(globalHooks?.afterUpdate || localHooks?.afterUpdate)) return
    return (ctx, { next, patch, prev }) => {
      if (globalHooks?.afterUpdate)
        requireSync(
          globalHooks.afterUpdate(toGlobalCtx(table, ctx), {
            next: next as Rec,
            patch: patch as Rec,
            prev: prev as Rec
          }),
          'crud.afterUpdate:global'
        )
      if (localHooks?.afterUpdate)
        requireSync(localHooks.afterUpdate(ctx, { next, patch, prev }), 'crud.afterUpdate:local')
    }
  },
  mergeCrudBeforeDelete = <DB, Row extends Rec, CreateArgs extends Rec, UpdatePatch extends Rec>(
    table: string,
    globalHooks: GlobalHooks | undefined,
    localHooks: CrudHooks<DB, Row, CreateArgs, UpdatePatch> | undefined
  ): CrudHooks<DB, Row, CreateArgs, UpdatePatch>['beforeDelete'] => {
    if (!(globalHooks?.beforeDelete || localHooks?.beforeDelete)) return
    return (ctx, { row }) => {
      if (globalHooks?.beforeDelete)
        requireSync(globalHooks.beforeDelete(toGlobalCtx(table, ctx), { row: row as Rec }), 'crud.beforeDelete:global')
      if (localHooks?.beforeDelete) requireSync(localHooks.beforeDelete(ctx, { row }), 'crud.beforeDelete:local')
    }
  },
  mergeCrudAfterDelete = <DB, Row extends Rec, CreateArgs extends Rec, UpdatePatch extends Rec>(
    table: string,
    globalHooks: GlobalHooks | undefined,
    localHooks: CrudHooks<DB, Row, CreateArgs, UpdatePatch> | undefined
  ): CrudHooks<DB, Row, CreateArgs, UpdatePatch>['afterDelete'] => {
    if (!(globalHooks?.afterDelete || localHooks?.afterDelete)) return
    return (ctx, { row }) => {
      if (globalHooks?.afterDelete)
        requireSync(globalHooks.afterDelete(toGlobalCtx(table, ctx), { row: row as Rec }), 'crud.afterDelete:global')
      if (localHooks?.afterDelete) requireSync(localHooks.afterDelete(ctx, { row }), 'crud.afterDelete:local')
    }
  },
  mergeCrudHooks = <DB, Row extends Rec, CreateArgs extends Rec, UpdatePatch extends Rec>(
    table: string,
    globalHooks: GlobalHooks | undefined,
    localHooks: CrudHooks<DB, Row, CreateArgs, UpdatePatch> | undefined
  ): CrudHooks<DB, Row, CreateArgs, UpdatePatch> | undefined => {
    if (!(globalHooks || localHooks)) return
    const merged: CrudHooks<DB, Row, CreateArgs, UpdatePatch> = {
      afterCreate: mergeCrudAfterCreate(table, globalHooks, localHooks),
      afterDelete: mergeCrudAfterDelete(table, globalHooks, localHooks),
      afterUpdate: mergeCrudAfterUpdate(table, globalHooks, localHooks),
      beforeCreate: mergeCrudBeforeCreate(table, globalHooks, localHooks),
      beforeDelete: mergeCrudBeforeDelete(table, globalHooks, localHooks),
      beforeUpdate: mergeCrudBeforeUpdate(table, globalHooks, localHooks)
    }
    if (!hasCrudHooks(merged)) return
    return merged
  },
  hasSingletonHooks = <DB, Row extends Rec, UpdatePatch extends Rec>(
    hooks: SingletonHooks<DB, Row, UpdatePatch>
  ): boolean =>
    Boolean(hooks.beforeCreate ?? hooks.afterCreate ?? hooks.beforeUpdate ?? hooks.afterUpdate ?? hooks.beforeRead),
  mergeSingletonBeforeCreate = <DB, Row extends Rec, UpdatePatch extends Rec>(
    table: string,
    globalHooks: GlobalHooks | undefined,
    localHooks: SingletonHooks<DB, Row, UpdatePatch> | undefined
  ): SingletonHooks<DB, Row, UpdatePatch>['beforeCreate'] => {
    if (!(globalHooks?.beforeCreate || localHooks?.beforeCreate)) return
    return (ctx, { data: initialData }) => {
      let data = initialData
      if (globalHooks?.beforeCreate)
        data = requireSync(
          globalHooks.beforeCreate(toGlobalCtx(table, ctx), { data: data as Rec }),
          'singleton.beforeCreate:global'
        ) as UpdatePatch
      if (localHooks?.beforeCreate)
        data = requireSync(localHooks.beforeCreate(ctx, { data }), 'singleton.beforeCreate:local')
      return data
    }
  },
  mergeSingletonAfterCreate = <DB, Row extends Rec, UpdatePatch extends Rec>(
    table: string,
    globalHooks: GlobalHooks | undefined,
    localHooks: SingletonHooks<DB, Row, UpdatePatch> | undefined
  ): SingletonHooks<DB, Row, UpdatePatch>['afterCreate'] => {
    if (!(globalHooks?.afterCreate || localHooks?.afterCreate)) return
    return (ctx, { data, row }) => {
      if (globalHooks?.afterCreate)
        requireSync(
          globalHooks.afterCreate(toGlobalCtx(table, ctx), { data: data as Rec, row: row as Rec }),
          'singleton.afterCreate:global'
        )
      if (localHooks?.afterCreate) requireSync(localHooks.afterCreate(ctx, { data, row }), 'singleton.afterCreate:local')
    }
  },
  mergeSingletonBeforeUpdate = <DB, Row extends Rec, UpdatePatch extends Rec>(
    table: string,
    globalHooks: GlobalHooks | undefined,
    localHooks: SingletonHooks<DB, Row, UpdatePatch> | undefined
  ): SingletonHooks<DB, Row, UpdatePatch>['beforeUpdate'] => {
    if (!(globalHooks?.beforeUpdate || localHooks?.beforeUpdate)) return
    return (ctx, { patch: initialPatch, prev }) => {
      let patch = initialPatch
      if (globalHooks?.beforeUpdate)
        patch = requireSync(
          globalHooks.beforeUpdate(toGlobalCtx(table, ctx), { patch: patch as Rec, prev: prev as Rec }),
          'singleton.beforeUpdate:global'
        ) as UpdatePatch
      if (localHooks?.beforeUpdate)
        patch = requireSync(localHooks.beforeUpdate(ctx, { patch, prev }), 'singleton.beforeUpdate:local')
      return patch
    }
  },
  mergeSingletonAfterUpdate = <DB, Row extends Rec, UpdatePatch extends Rec>(
    table: string,
    globalHooks: GlobalHooks | undefined,
    localHooks: SingletonHooks<DB, Row, UpdatePatch> | undefined
  ): SingletonHooks<DB, Row, UpdatePatch>['afterUpdate'] => {
    if (!(globalHooks?.afterUpdate || localHooks?.afterUpdate)) return
    return (ctx, { next, patch, prev }) => {
      if (globalHooks?.afterUpdate)
        requireSync(
          globalHooks.afterUpdate(toGlobalCtx(table, ctx), {
            next: next as Rec,
            patch: patch as Rec,
            prev: prev as Rec
          }),
          'singleton.afterUpdate:global'
        )
      if (localHooks?.afterUpdate)
        requireSync(localHooks.afterUpdate(ctx, { next, patch, prev }), 'singleton.afterUpdate:local')
    }
  },
  mergeSingletonHooks = <DB, Row extends Rec, UpdatePatch extends Rec>(
    table: string,
    globalHooks: GlobalHooks | undefined,
    localHooks: SingletonHooks<DB, Row, UpdatePatch> | undefined
  ): SingletonHooks<DB, Row, UpdatePatch> | undefined => {
    if (!(globalHooks || localHooks)) return
    const merged: SingletonHooks<DB, Row, UpdatePatch> = {
      afterCreate: mergeSingletonAfterCreate(table, globalHooks, localHooks),
      afterUpdate: mergeSingletonAfterUpdate(table, globalHooks, localHooks),
      beforeCreate: mergeSingletonBeforeCreate(table, globalHooks, localHooks),
      beforeRead: localHooks?.beforeRead,
      beforeUpdate: mergeSingletonBeforeUpdate(table, globalHooks, localHooks)
    }
    if (!hasSingletonHooks(merged)) return
    return merged
  },
  registerExports = (target: ReducerExportRecord, next: ReducerExportRecord) => {
    const names = Object.keys(next)
    for (const name of names) {
      const reducer = next[name]
      if (reducer) target[name] = reducer
    }
  },
  /** Low-level factory that creates CRUD builders from shared SpacetimeDB config. */
  setup = (spacetimedb: SpacetimeDbLike, config: SetupConfig = {}) => {
    const middlewareHooks =
        config.middleware && config.middleware.length > 0 ? composeMiddleware(...config.middleware) : undefined,
      globalHooks = mergeGlobalHooks(config.hooks, middlewareHooks),
      accumulatedExports: ReducerExportRecord = {},
      crud = (factoryConfig: Parameters<typeof makeCrud>[1]) => {
        const mergedHooks = mergeCrudHooks(
            factoryConfig.tableName,
            globalHooks,
            factoryConfig.options?.hooks as CrudHooks<unknown, Rec, Rec, Rec> | undefined
          ),
          nextConfig = mergedHooks
            ? {
                ...factoryConfig,
                options: {
                  ...factoryConfig.options,
                  hooks: mergedHooks
                }
              }
            : factoryConfig,
          result = makeCrud(spacetimedb, nextConfig as Parameters<typeof makeCrud>[1])
        registerExports(accumulatedExports, result.exports)
        return result
      },
      orgCrud = (factoryConfig: Parameters<typeof makeOrgCrud>[1]) => {
        const mergedHooks = mergeCrudHooks(
            factoryConfig.tableName,
            globalHooks,
            factoryConfig.options?.hooks as CrudHooks<unknown, Rec, Rec, Rec> | undefined
          ),
          nextConfig = mergedHooks
            ? {
                ...factoryConfig,
                options: {
                  ...factoryConfig.options,
                  hooks: mergedHooks
                }
              }
            : factoryConfig,
          result = makeOrgCrud(spacetimedb, nextConfig as Parameters<typeof makeOrgCrud>[1])
        registerExports(accumulatedExports, result.exports)
        return result
      },
      childCrud = (factoryConfig: Parameters<typeof makeChildCrud>[1]) => {
        const mergedHooks = mergeCrudHooks(
            factoryConfig.tableName,
            globalHooks,
            factoryConfig.options?.hooks as CrudHooks<unknown, Rec, Rec, Rec> | undefined
          ),
          nextConfig = mergedHooks
            ? {
                ...factoryConfig,
                options: {
                  ...factoryConfig.options,
                  hooks: mergedHooks
                }
              }
            : factoryConfig,
          result = makeChildCrud(spacetimedb, nextConfig as Parameters<typeof makeChildCrud>[1])
        registerExports(accumulatedExports, result.exports)
        return result
      },
      singletonCrud = (factoryConfig: Parameters<typeof makeSingletonCrud>[1]) => {
        const mergedHooks = mergeSingletonHooks(
            factoryConfig.tableName,
            globalHooks,
            factoryConfig.options?.hooks as SingletonHooks<unknown, Rec, Rec> | undefined
          ),
          nextConfig = mergedHooks
            ? {
                ...factoryConfig,
                options: {
                  ...factoryConfig.options,
                  hooks: mergedHooks
                }
              }
            : factoryConfig,
          result = makeSingletonCrud(spacetimedb, nextConfig as Parameters<typeof makeSingletonCrud>[1])
        registerExports(accumulatedExports, result.exports)
        return result
      },
      cacheCrud = (factoryConfig: Parameters<typeof makeCacheCrud>[1]) => {
        const result = makeCacheCrud(spacetimedb, factoryConfig)
        registerExports(accumulatedExports, result.exports)
        return result
      },
      org = (factoryConfig: Parameters<typeof makeOrg>[1]) => {
        const result = makeOrg(spacetimedb as unknown as Parameters<typeof makeOrg>[0], factoryConfig)
        registerExports(accumulatedExports, result.exports)
        return result
      },
      allExports = (): ReducerExportRecord => ({ ...accumulatedExports })

    return {
      allExports,
      cacheCrud,
      childCrud,
      crud,
      exports: accumulatedExports,
      org,
      orgCrud,
      singletonCrud
    }
  }

type TableAccessor = (db: unknown) => unknown

const dbTable: (db: unknown, name: string) => unknown = (db, name) => (db as Record<string, unknown>)[name],
  pkById = (tbl: unknown) => (tbl as Record<string, unknown>).id,
  pkByKey = (name: string) => (tbl: unknown) => (tbl as Record<string, unknown>)[name],
  tblOf =
    (name: string): TableAccessor =>
    db =>
      dbTable(db, name),
  /** Convenience wrapper around setup with shared field defaults. */
  setupCrud = (spacetimedb: SpacetimeDbLike, defaults: CrudDefaults, config?: SetupConfig) => {
    const s = setup(spacetimedb, config),
      { expectedUpdatedAtField, idField } = defaults,
      fkField = defaults.foreignKeyField ?? idField,
      oIdField = defaults.orgIdField ?? idField

    return {
      allExports: s.allExports,

      cacheCrud: (
        tableName: string,
        keyName: string,
        fields: CacheFieldBuilders,
        options?: CacheOptions & {
          keyField?: TypeBuilder<unknown, AlgebraicTypeType>
        }
      ) =>
        s.cacheCrud({
          fields,
          keyField: (options?.keyField ?? idField) as never,
          keyName,
          options: options?.ttl === undefined ? undefined : { ttl: options.ttl },
          pk: pkByKey(keyName) as never,
          table: tblOf(tableName) as never,
          tableName
        }),

      childCrud: (
        tableName: string,
        parent: { foreignKey: string; table: string },
        fields: CrudFieldBuilders,
        options?: CrudOptions
      ) =>
        s.childCrud({
          expectedUpdatedAtField: expectedUpdatedAtField as never,
          fields,
          foreignKeyField: fkField as never,
          foreignKeyName: parent.foreignKey,
          idField: idField as never,
          options: options as never,
          parentPk: pkById as never,
          parentTable: tblOf(parent.table) as never,
          pk: pkById as never,
          table: tblOf(tableName) as never,
          tableName
        }),

      crud: (tableName: string, fields: CrudFieldBuilders, options?: CrudOptions) =>
        s.crud({
          expectedUpdatedAtField: expectedUpdatedAtField as never,
          fields,
          idField: idField as never,
          options: options as never,
          pk: pkById as never,
          table: tblOf(tableName) as never,
          tableName
        }),

      exports: s.exports,

      fileUpload: (
        namespace: string,
        tableName: string,
        fields: FileUploadFields,
        options?: { allowedTypes?: Set<string>; maxFileSize?: number }
      ) => {
        const result = makeFileUpload(spacetimedb as Parameters<typeof makeFileUpload>[0], {
          ...options,
          fields,
          idField: idField as never,
          namespace,
          pk: pkById as never,
          table: tblOf(tableName) as never
        })
        registerExports(s.exports, result.exports)
        return result
      },

      org: s.org,

      orgCrud: (
        tableName: string,
        fields: OrgCrudFieldBuilders,
        options?: OrgCrudOptions & {
          orgMemberTable?: TableAccessor
        }
      ) =>
        s.orgCrud({
          expectedUpdatedAtField: expectedUpdatedAtField as never,
          fields,
          idField: idField as never,
          options: options as never,
          orgIdField: oIdField as never,
          orgMemberTable: (options?.orgMemberTable ?? tblOf('orgMember')) as never,
          pk: pkById as never,
          table: tblOf(tableName) as never,
          tableName
        }),

      singletonCrud: (tableName: string, fields: SingletonFieldBuilders, options?: SingletonOptions) =>
        s.singletonCrud({
          fields,
          options: options as never,
          table: tblOf(tableName) as never,
          tableName
        })
    }
  }

export type { CrudDefaults }
export { setup, setupCrud }
