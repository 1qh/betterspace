import type { ZodObject, ZodRawShape } from 'zod/v4'

import { array, object, string } from 'zod/v4'

import type { BaseSchema, OrgSchema, OwnedSchema, SchemaBrand, SingletonSchema } from './server/types'

import { typed } from './server/bridge'

interface ChildFn {
  <const P extends string, S extends ZodRawShape>(
    parent: P,
    schema: ZodObject<S>
  ): {
    foreignKey: `${P}Id`
    index: string
    parent: P
    schema: ZodObject<S>
  }
  <
    const P extends string,
    const S extends ZodRawShape,
    const FK extends keyof S & string,
    PS extends ZodRawShape = ZodRawShape
  >(config: {
    foreignKey: FK
    index?: string
    parent: P
    parentSchema?: ZodObject<PS>
    schema: ZodObject<S>
  }): {
    foreignKey: FK
    index: string
    parent: P
    parentSchema?: ZodObject<PS>
    schema: ZodObject<S>
  }
}

/** Creates a file-id schema annotated for Betterspace file inputs. */
const cvFile = () =>
    string()
      .min(1)
      .meta({ cv: 'file' as const }),
  /** Creates an array schema for multi-file fields. */
  cvFiles = () => array(cvFile()).meta({ cv: 'files' as const }),
  child: ChildFn = (configOrParent: Record<string, unknown> | string, childSchema?: ZodObject<ZodRawShape>) => {
    if (typeof configOrParent === 'string')
      return {
        foreignKey: `${configOrParent}Id`,
        index: `by_${configOrParent}`,
        parent: configOrParent,
        schema: childSchema
      } as never

    const config = configOrParent as { index?: string; parent: string }
    return { ...configOrParent, index: config.index ?? `by_${config.parent}` } as never
  },
  /** Default organization schema used by org helpers. */
  orgSchema = object({
    avatarId: string().min(1).nullable().optional(),
    name: string().min(1),
    slug: string()
      .min(1)
      .regex(/^[a-z0-9-]+$/u)
  }),
  /** Applies a schema brand to every entry in a schema map. */
  brandSchemas = <B extends string, T extends Record<string, ZodObject<ZodRawShape>>>(
    schemas: T
  ): { [K in keyof T]: SchemaBrand<B> & T[K] } => typed(schemas),
  /** Brands schemas for owned-table CRUD usage. */
  makeOwned = <T extends Record<string, ZodObject<ZodRawShape>>>(schemas: T) =>
    brandSchemas<'owned', T>(schemas) as {
      [K in keyof T]: OwnedSchema<T[K] extends ZodObject<infer S> ? S : ZodRawShape> & T[K]
    },
  /** Brands schemas for org-scoped CRUD usage. */
  makeOrgScoped = <T extends Record<string, ZodObject<ZodRawShape>>>(schemas: T) =>
    brandSchemas<'org', T>(schemas) as {
      [K in keyof T]: OrgSchema<T[K] extends ZodObject<infer S> ? S : ZodRawShape> & T[K]
    },
  /** Brands schemas for base table CRUD usage. */
  makeBase = <T extends Record<string, ZodObject<ZodRawShape>>>(schemas: T) =>
    brandSchemas<'base', T>(schemas) as {
      [K in keyof T]: BaseSchema<T[K] extends ZodObject<infer S> ? S : ZodRawShape> & T[K]
    },
  /** Brands schemas for singleton table CRUD usage. */
  makeSingleton = <T extends Record<string, ZodObject<ZodRawShape>>>(schemas: T) =>
    brandSchemas<'singleton', T>(schemas) as {
      [K in keyof T]: SingletonSchema<T[K] extends ZodObject<infer S> ? S : ZodRawShape> & T[K]
    }

export { child, cvFile, cvFiles, makeBase, makeOrgScoped, makeOwned, makeSingleton, orgSchema }
