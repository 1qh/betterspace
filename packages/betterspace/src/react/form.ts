/* eslint-disable max-statements */
'use client'
import type { StandardSchemaV1 } from '@tanstack/form-core'
import type { FormValidateOrFn, ReactFormExtendedApi } from '@tanstack/react-form'
import type { output, ZodObject, ZodRawShape } from 'zod/v4'

/** Supported UI field kinds inferred from Zod schemas. */
type FieldKind = 'boolean' | 'date' | 'file' | 'files' | 'number' | 'string' | 'stringArray' | 'unknown'

import { useForm as useTanStackForm } from '@tanstack/react-form'
import { useStore } from '@tanstack/react-store'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { ZodSchema } from '../zod'

import { extractErrorData, getErrorCode, getErrorMessage, isRecord } from '../server/helpers'
import {
  coerceOptionals,
  cvFileKindOf,
  defaultValues as dv,
  elementOf,
  isArrayType,
  isBooleanType,
  isDateType,
  isNumberType,
  isStringType,
  unwrapZod
} from '../zod'
import { defaultOnError } from './use-mutate'

/** Metadata describing how a form field should be rendered. */
interface FieldMeta {
  kind: FieldKind
  max?: number
}
/** Lookup table of field metadata keyed by field name. */
type FieldMetaMap = Record<string, FieldMeta>
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends (infer U)[]
        ? Widen<U>[]
        : T extends Record<string, unknown>
          ? { [K in keyof T]: Widen<T[K]> }
          : T

const getMax = (schema: undefined | ZodSchema): number | undefined => {
    const checks = schema?.def.checks as (undefined | { _zod: { def: { check: string; maximum?: number } } })[] | undefined
    if (!checks) return
    for (const check of checks)
      if (check?._zod.def.check === 'max_length' && check._zod.def.maximum !== undefined) return check._zod.def.maximum
  },
  /** Infers form metadata for a single field schema.
   * @param schema - Zod field schema
   * @returns Derived field metadata
   */
  getMeta = (schema: unknown): FieldMeta => {
    const { schema: base, type } = unwrapZod(schema),
      fileKind = cvFileKindOf(schema)
    if (fileKind === 'file') return { kind: 'file' }
    if (fileKind === 'files') return { kind: 'files', max: getMax(base) }
    if (isArrayType(type)) {
      const el = unwrapZod(elementOf(base))
      return { kind: isStringType(el.type) ? 'stringArray' : 'unknown', max: getMax(base) }
    }
    if (isStringType(type)) return { kind: 'string' }
    if (isNumberType(type)) return { kind: 'number' }
    if (isBooleanType(type)) return { kind: 'boolean' }
    if (isDateType(type)) return { kind: 'date' }
    return { kind: 'unknown' }
  },
  /** Builds metadata for every field in an object schema.
   * @param schema - Form schema
   * @returns Field metadata map
   */
  buildMeta = (schema: ZodObject<ZodRawShape>): FieldMetaMap => {
    const meta: FieldMetaMap = {},
      keys = Object.keys(schema.shape)
    for (const key of keys) meta[key] = getMeta(schema.shape[key])
    return meta
  }

type Api<T extends Record<string, unknown>> = ReactFormExtendedApi<
  T,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  FormValidateOrFn<T>,
  undefined,
  undefined,
  undefined,
  undefined,
  unknown
>

/** Conflict payload returned by optimistic concurrency checks. */
interface ConflictData<T = unknown> {
  code: string
  current?: T
  incoming?: T
}

/** Return shape produced by Betterspace `useForm`. */
interface FormReturn<T extends Record<string, unknown>, S extends ZodObject<ZodRawShape>> {
  conflict: ConflictData<T> | null
  error: Error | null
  fieldErrors: Record<string, string>
  instance: Api<T>
  isDirty: boolean
  isPending: boolean
  lastSaved: null | number
  meta: FieldMetaMap
  reset: (values?: T) => void
  resolveConflict: (action: 'cancel' | 'overwrite' | 'reload') => void
  schema: S
  watch: <K extends keyof T>(name: K) => T[K]
}

const submitError = (error: unknown): Error => new Error(getErrorMessage(error), { cause: error }),
  handleConflict = <T = unknown>(error: unknown): ConflictData<T> | null => {
    if (getErrorCode(error) !== 'CONFLICT') return null
    if (!isRecord(error)) return { code: 'CONFLICT' }
    const data = isRecord(error.data) ? error.data : undefined
    return {
      code: 'CONFLICT',
      current: data?.current as T | undefined,
      incoming: data?.incoming as T | undefined
    }
  },
  /** Creates a typed form instance with schema validation and conflict handling.
   * @param options - Form configuration and submit handler
   * @returns Form state, helpers, and TanStack form instance
   * @example
   * ```ts
   * const form = useForm({ schema, onSubmit: data => save(data) })
   * ```
   */
  useForm = <S extends ZodObject<ZodRawShape>>({
    autoSave,
    onConflict,
    onError,
    onSubmit,
    onSuccess,
    resetOnSuccess,
    schema,
    values
  }: {
    autoSave?: { debounceMs: number; enabled: boolean }
    onConflict?: (data: ConflictData<output<S>>) => void
    onError?: ((e: unknown) => void) | false
    onSubmit: (d: output<S>, force?: boolean) => output<S> | Promise<output<S> | undefined> | undefined
    onSuccess?: () => void
    resetOnSuccess?: boolean
    schema: S
    values?: Widen<output<S>>
  }) => {
    const resolved = values ?? dv(schema),
      [conflict, setConflict] = useState<ConflictData<output<S>> | null>(null),
      [er, setEr] = useState<Error | null>(null),
      [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}),
      [forceSubmit, setForceSubmit] = useState(false),
      [lastSaved, setLastSaved] = useState<null | number>(null),
      vRef = useRef(resolved),
      autoSaveTimerRef = useRef<null | ReturnType<typeof setTimeout>>(null)

    vRef.current = resolved
    if (Object.keys(resolved).some(k => !(k in schema.shape))) throw new Error('Form values include keys not in schema')
    const meta = useMemo(() => buildMeta(schema), [schema]),
      instance = useTanStackForm({
        defaultValues: resolved,

        onSubmit: async ({ value }) => {
          setEr(null)
          setFieldErrors({})
          try {
            const coerced = coerceOptionals(schema, value as output<S>),
              result = await onSubmit(coerced, forceSubmit),
              returned = isRecord(result) ? result : coerced,
              newValues = resetOnSuccess ? returned : value
            instance.reset(newValues as unknown as output<S>)
            if (resetOnSuccess && isRecord(returned)) vRef.current = returned as unknown as Widen<output<S>>
            setForceSubmit(false)
            // eslint-disable-next-line react-hooks/purity
            setLastSaved(Date.now())
            onSuccess?.()
          } catch (error) {
            const conflictData = handleConflict<output<S>>(error)
            if (conflictData) {
              setConflict(conflictData)
              onConflict?.(conflictData)
              return
            }
            const errData = extractErrorData(error)
            if (errData?.fieldErrors) setFieldErrors(errData.fieldErrors)
            const submitErr = submitError(error)
            setEr(submitErr)
            if (onError !== false) (onError ?? defaultOnError)(submitErr)
          }
        },
        validators: { onSubmit: schema as unknown as StandardSchemaV1<output<S>, unknown> }
      }) as unknown as Api<output<S>>,
      storeState = useStore(instance.store, s => ({ isDirty: s.isDirty, isSubmitting: s.isSubmitting, values: s.values })),
      { isDirty, isSubmitting } = storeState,
      watchedValues = storeState.values

    useEffect(() => {
      if (!(autoSave?.enabled && isDirty)) return
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = setTimeout(() => {
        instance.handleSubmit()
      }, autoSave.debounceMs)
      return () => {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
      }
    }, [autoSave?.enabled, autoSave?.debounceMs, isDirty, instance])
    return {
      conflict,
      error: er,
      fieldErrors,
      instance,
      isDirty,
      isPending: isSubmitting,
      lastSaved,
      meta,
      reset: (vals?: output<S>) => {
        const resetVals = vals ?? (vRef.current as unknown as output<S>)
        instance.reset(resetVals as unknown as output<S>)
        if (vals) vRef.current = vals as unknown as Widen<output<S>>
        setEr(null)
        setFieldErrors({})
        setLastSaved(null)
      },
      resolveConflict: (action: 'cancel' | 'overwrite' | 'reload') => {
        if (action === 'overwrite') {
          setConflict(null)
          setForceSubmit(true)
          instance.handleSubmit()
        } else if (action === 'reload') {
          setConflict(null)
          instance.reset(vRef.current as unknown as output<S>)
        } else setConflict(null)
      },
      schema,
      watch: <K extends keyof output<S>>(name: K) => watchedValues[name]
    } satisfies FormReturn<output<S>, S>
  },
  /** Creates `useForm` wiring for reducer-style mutation functions.
   * @param options - Mutation and form configuration
   * @returns Form API backed by `mutate`
   * @example
   * ```ts
   * const form = useFormMutation({ schema, mutate: api.posts.create })
   * ```
   */
  useFormMutation = <S extends ZodObject<ZodRawShape>, M = output<S>>({
    autoSave,
    mutate,
    onConflict,
    onError,
    onSuccess,
    resetOnSuccess = true,
    schema,
    transform,
    values
  }: {
    autoSave?: { debounceMs: number; enabled: boolean }
    mutate: (args: M) => Promise<void>
    onConflict?: (data: ConflictData<output<S>>) => void
    onError?: ((e: unknown) => void) | false
    onSuccess?: () => void
    resetOnSuccess?: boolean
    schema: S
    transform?: (d: output<S>) => M
    values?: Widen<output<S>>
  }) =>
    useForm({
      autoSave,
      onConflict,
      onError,
      onSubmit: async (d: output<S>) => {
        const args = transform ? transform(d) : (d as unknown as M)
        await mutate(args)
        return d
      },
      onSuccess,
      resetOnSuccess,
      schema,
      values
    })

export type { Api, ConflictData, FieldKind, FieldMeta, FieldMetaMap, FormReturn, Widen }
export { buildMeta, getMeta, useForm, useFormMutation }
