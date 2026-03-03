const idx = <T>(fn: (ib: T) => T): never => fn as never,
  flt = <T>(fn: (fb: T) => unknown): never => fn as never,
  sch = <T>(fn: (sb: T) => unknown): never => fn as never,
  typed = <T>(value: T): never => value as never,
  indexFields = (...fields: string[]): never => fields as never

export { flt, idx, indexFields, sch, typed }
