import type { ZodObject, ZodRawShape } from 'zod/v4'

import { array, object, string } from 'zod/v4'

import type { BaseSchema, OrgDefSchema, OrgSchema, OwnedSchema, SchemaBrand, SingletonSchema } from './server/types'

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
  brandSchemas = <B extends string, T extends Record<string, ZodObject<ZodRawShape>>>(
    brand: B,
    schemas: T
  ): { [K in keyof T]: SchemaBrand<B> & T[K] } => {
    const keys = Object.keys(schemas)
    for (const key of keys) {
      const schema = schemas[key]
      if (schema)
        Object.defineProperty(schema as unknown as { __bs?: B }, '__bs', {
          configurable: true,
          enumerable: false,
          value: brand
        })
    }
    return typed(schemas)
  },
  makeOwned = <T extends Record<string, ZodObject<ZodRawShape>>>(schemas: T) =>
    brandSchemas<'owned', T>('owned', schemas) as {
      [K in keyof T]: OwnedSchema<T[K] extends ZodObject<infer S> ? S : ZodRawShape> & T[K]
    },
  makeOrgScoped = <T extends Record<string, ZodObject<ZodRawShape>>>(schemas: T) =>
    brandSchemas<'org', T>('org', schemas) as {
      [K in keyof T]: OrgSchema<T[K] extends ZodObject<infer S> ? S : ZodRawShape> & T[K]
    },
  makeOrg = <T extends Record<string, ZodObject<ZodRawShape>>>(schemas: T) =>
    brandSchemas<'orgDef', T>('orgDef', schemas) as {
      [K in keyof T]: OrgDefSchema<T[K] extends ZodObject<infer S> ? S : ZodRawShape> & T[K]
    },
  makeBase = <T extends Record<string, ZodObject<ZodRawShape>>>(schemas: T) =>
    brandSchemas<'base', T>('base', schemas) as {
      [K in keyof T]: BaseSchema<T[K] extends ZodObject<infer S> ? S : ZodRawShape> & T[K]
    },
  makeSingleton = <T extends Record<string, ZodObject<ZodRawShape>>>(schemas: T) =>
    brandSchemas<'singleton', T>('singleton', schemas) as {
      [K in keyof T]: SingletonSchema<T[K] extends ZodObject<infer S> ? S : ZodRawShape> & T[K]
    }

export { child, cvFile, cvFiles, makeBase, makeOrg, makeOrgScoped, makeOwned, makeSingleton, orgSchema }
