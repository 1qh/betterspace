const __defProp = Object.defineProperty;
const __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
const __export = (target, all) => {
  for (const name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};

// Packages/betterspace/src/server/reducer-utils.ts
const makeError = (code, message) => new Error(`${code}: ${message}`);
const identityEquals = (a, b) => {
  const left = a;
  if (typeof left.isEqual === "function")
    return left.isEqual(b);
  const right = b;
  if (typeof left.toHexString === "function" && typeof right.toHexString === "function")
    return left.toHexString() === right.toHexString();
  return Object.is(a, b);
};
const timestampEquals = (a, b) => {
  const left = a;
  if (typeof left.isEqual === "function")
    return left.isEqual(b);
  const right = b;
  if (typeof left.toJSON === "function" && typeof right.toJSON === "function")
    return left.toJSON() === right.toJSON();
  return Object.is(a, b);
};
const makeOptionalFields = (fields) => {
  const params = {}, keys = Object.keys(fields);
  for (const key of keys) {
    const field = fields[key];
    params[key] = field.optional();
  }
  return params;
};
const pickPatch = (args, fieldNames) => {
  const patchRecord = {};
  for (const key of fieldNames) {
    const value = args[key];
    if (value !== undefined)
      patchRecord[key] = value;
  }
  return patchRecord;
};
const applyPatch = (row, patch, timestamp) => {
  const nextRecord = { ...row }, patchKeys = Object.keys(patch);
  for (const key of patchKeys)
    nextRecord[key] = patch[key];
  nextRecord.updatedAt = timestamp;
  return nextRecord;
};
const getOwnedRow = ({
  ctxSender,
  id,
  operation,
  pkAccessor,
  table,
  tableName
}) => {
  const pk = pkAccessor(table), row = pk.find(id);
  if (!row)
    throw makeError("NOT_FOUND", `${tableName}:${operation}`);
  if (!identityEquals(row.userId, ctxSender))
    throw makeError("FORBIDDEN", `${tableName}:${operation}`);
  return { pk, row };
};

// Packages/betterspace/src/server/cache-crud.ts
const DAYS_PER_WEEK = 7;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLIS_PER_SECOND = 1000;
const DEFAULT_TTL_MS = DAYS_PER_WEEK * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLIS_PER_SECOND;
const parseTimestampText = (value) => {
  const parsedNumber = Number(value);
  if (Number.isFinite(parsedNumber))
    return parsedNumber;
  const parsedDate = Date.parse(value);
  if (Number.isFinite(parsedDate))
    return parsedDate;
  return null;
};
const parseTimestampValue = (value) => {
  if (typeof value === "number" && Number.isFinite(value))
    return value;
  if (typeof value === "string")
    return parseTimestampText(value);
  return null;
};
const timestampToMs = (value) => {
  const timestamp = value, fromValue = typeof timestamp.valueOf === "function" ? parseTimestampValue(timestamp.valueOf()) : null;
  if (fromValue !== null)
    return fromValue;
  const fromJson = typeof timestamp.toJSON === "function" ? parseTimestampValue(timestamp.toJSON()) : null;
  if (fromJson !== null)
    return fromJson;
  const fromString = typeof timestamp.toString === "function" ? parseTimestampValue(timestamp.toString()) : null;
  if (fromString !== null)
    return fromString;
  throw makeError("INVALID_TIMESTAMP", "cache:timestamp");
};
const isExpired = (cachedAt, now, ttl) => timestampToMs(cachedAt) + ttl < timestampToMs(now);
const makeCacheCrud = (spacetimedb, config) => {
  const { fields, keyField, keyName, options, pk: pkAccessor, table: tableAccessor, tableName } = config, ttl = options?.ttl ?? DEFAULT_TTL_MS, fieldNames = Object.keys(fields), createName = `create_${tableName}`, updateName = `update_${tableName}`, rmName = `rm_${tableName}`, invalidateName = `invalidate_${tableName}`, purgeName = `purge_${tableName}`, createParams = {
    [keyName]: keyField
  }, updateParams = {
    [keyName]: keyField
  }, optionalFields = makeOptionalFields(fields), createKeys = Object.keys(fields), optionalKeys = Object.keys(optionalFields);
  for (const key of createKeys) {
    const field = fields[key];
    if (field)
      createParams[key] = field;
  }
  for (const key of optionalKeys) {
    const field = optionalFields[key];
    if (field)
      updateParams[key] = field;
  }
  const createReducer = spacetimedb.reducer({ name: createName }, createParams, (ctx, args) => {
    const table = tableAccessor(ctx.db), argsRecord = args, keyValue = argsRecord[keyName], payload = {
      ...argsRecord,
      cachedAt: ctx.timestamp,
      id: 0,
      invalidatedAt: null,
      [keyName]: keyValue,
      updatedAt: ctx.timestamp
    };
    table.insert(payload);
  }), updateReducer = spacetimedb.reducer({ name: updateName }, updateParams, (ctx, args) => {
    const table = tableAccessor(ctx.db), argsRecord = args, keyValue = argsRecord[keyName], pk = pkAccessor(table), row = pk.find(keyValue);
    if (!row)
      throw makeError("NOT_FOUND", `${tableName}:update`);
    const patch = pickPatch(args, fieldNames), nextRecord = {
      ...row,
      invalidatedAt: null,
      updatedAt: ctx.timestamp
    }, patchKeys = Object.keys(patch);
    for (const key of patchKeys) {
      const value = patch[key];
      if (value !== undefined)
        nextRecord[key] = value;
    }
    pk.update(nextRecord);
  }), rmReducer = spacetimedb.reducer({ name: rmName }, { [keyName]: keyField }, (ctx, args) => {
    const table = tableAccessor(ctx.db), argsRecord = args, keyValue = argsRecord[keyName], pk = pkAccessor(table), row = pk.find(keyValue);
    if (!row)
      throw makeError("NOT_FOUND", `${tableName}:rm`);
    const removed = pk.delete(keyValue);
    if (!removed)
      throw makeError("NOT_FOUND", `${tableName}:rm`);
  }), invalidateReducer = spacetimedb.reducer({ name: invalidateName }, { [keyName]: keyField }, (ctx, args) => {
    const table = tableAccessor(ctx.db), argsRecord = args, keyValue = argsRecord[keyName], pk = pkAccessor(table), row = pk.find(keyValue);
    if (!row)
      throw makeError("NOT_FOUND", `${tableName}:invalidate`);
    const nextRecord = {
      ...row,
      invalidatedAt: ctx.timestamp,
      updatedAt: ctx.timestamp
    };
    pk.update(nextRecord);
  }), purgeReducer = spacetimedb.reducer({ name: purgeName }, {}, (ctx) => {
    const table = tableAccessor(ctx.db), pk = pkAccessor(table), keysToDelete = [];
    for (const row of table) {
      const rowRecord = row, {cachedAt} = rowRecord;
      if (isExpired(cachedAt, ctx.timestamp, ttl)) {
        const keyValue = rowRecord[keyName];
        keysToDelete.push(keyValue);
      }
    }
    for (const key of keysToDelete)
      pk.delete(key);
  });
  return {
    exports: {
      [createName]: createReducer,
      [invalidateName]: invalidateReducer,
      [purgeName]: purgeReducer,
      [rmName]: rmReducer,
      [updateName]: updateReducer
    }
  };
};
// Packages/betterspace/src/server/child.ts
const makeChildCrud = (spacetimedb, config) => {
  const {
    expectedUpdatedAtField,
    fields,
    foreignKeyField,
    foreignKeyName,
    idField,
    options,
    parentPk: parentPkAccessor,
    parentTable: parentTableAccessor,
    pk: pkAccessor,
    table: tableAccessor,
    tableName
  } = config, hooks = options?.hooks, fieldNames = Object.keys(fields), createName = `create_${tableName}`, updateName = `update_${tableName}`, rmName = `rm_${tableName}`, createParams = {
    [foreignKeyName]: foreignKeyField
  }, createFieldKeys = Object.keys(fields), updateParams = {
    id: idField
  }, optionalFields = makeOptionalFields(fields), optionalKeys = Object.keys(optionalFields);
  for (const key of createFieldKeys) {
    const field = fields[key];
    if (field)
      createParams[key] = field;
  }
  for (const key of optionalKeys) {
    const field = optionalFields[key];
    if (field)
      updateParams[key] = field;
  }
  if (expectedUpdatedAtField)
    updateParams.expectedUpdatedAt = expectedUpdatedAtField.optional();
  const createReducer = spacetimedb.reducer({ name: createName }, createParams, (ctx, args) => {
    const hookCtx = { db: ctx.db, sender: ctx.sender, timestamp: ctx.timestamp }, table = tableAccessor(ctx.db), argsRecord = args, parentId = argsRecord[foreignKeyName], parent = parentPkAccessor(parentTableAccessor(ctx.db)).find(parentId);
    if (!parent)
      throw makeError("NOT_FOUND", `${tableName}:create`);
    let data = args;
    if (hooks?.beforeCreate)
      data = hooks.beforeCreate(hookCtx, { data });
    const payload = data;
    table.insert({
      ...payload,
      [foreignKeyName]: parentId,
      id: 0,
      updatedAt: ctx.timestamp,
      userId: ctx.sender
    });
  }), updateReducer = spacetimedb.reducer({ name: updateName }, updateParams, (ctx, args) => {
    const hookCtx = { db: ctx.db, sender: ctx.sender, timestamp: ctx.timestamp }, table = tableAccessor(ctx.db), { pk, row } = getOwnedRow({
      ctxSender: ctx.sender,
      id: args.id,
      operation: "update",
      pkAccessor,
      table,
      tableName
    });
    if (args.expectedUpdatedAt !== undefined && !timestampEquals(row.updatedAt, args.expectedUpdatedAt))
      throw makeError("CONFLICT", `${tableName}:update`);
    let patch = pickPatch(args, fieldNames);
    if (hooks?.beforeUpdate)
      patch = hooks.beforeUpdate(hookCtx, { patch, prev: row });
    const next = pk.update(applyPatch(row, patch, ctx.timestamp));
    if (hooks?.afterUpdate)
      hooks.afterUpdate(hookCtx, { next, patch, prev: row });
  }), rmReducer = spacetimedb.reducer({ name: rmName }, { id: idField }, (ctx, { id }) => {
    const hookCtx = { db: ctx.db, sender: ctx.sender, timestamp: ctx.timestamp }, table = tableAccessor(ctx.db), { pk, row } = getOwnedRow({
      ctxSender: ctx.sender,
      id,
      operation: "rm",
      pkAccessor,
      table,
      tableName
    });
    if (hooks?.beforeDelete)
      hooks.beforeDelete(hookCtx, { row });
    if (options?.softDelete) {
      const nextRecord = {
        ...row,
        deletedAt: ctx.timestamp,
        updatedAt: ctx.timestamp
      };
      pk.update(nextRecord);
    } else {
      const deleted = pk.delete(id);
      if (!deleted)
        throw makeError("NOT_FOUND", `${tableName}:rm`);
    }
    if (hooks?.afterDelete)
      hooks.afterDelete(hookCtx, { row });
  });
  return {
    exports: {
      [createName]: createReducer,
      [rmName]: rmReducer,
      [updateName]: updateReducer
    }
  };
};
// Packages/betterspace/src/server/crud.ts
const makeCrud = (spacetimedb, config) => {
  const { expectedUpdatedAtField, fields, idField, options, pk: pkAccessor, table: tableAccessor, tableName } = config, hooks = options?.hooks, fieldNames = Object.keys(fields), createName = `create_${tableName}`, updateName = `update_${tableName}`, rmName = `rm_${tableName}`, updateParams = {
    id: idField
  }, optionalFields = makeOptionalFields(fields), optionalKeys = Object.keys(optionalFields);
  for (const key of optionalKeys) {
    const field = optionalFields[key];
    if (field)
      updateParams[key] = field;
  }
  if (expectedUpdatedAtField)
    updateParams.expectedUpdatedAt = expectedUpdatedAtField.optional();
  const createReducer = spacetimedb.reducer({ name: createName }, fields, (ctx, args) => {
    const hookCtx = { db: ctx.db, sender: ctx.sender, timestamp: ctx.timestamp }, table = tableAccessor(ctx.db);
    let data = args;
    if (hooks?.beforeCreate)
      data = hooks.beforeCreate(hookCtx, { data });
    const payload = data, row = table.insert({
      ...payload,
      id: 0,
      updatedAt: ctx.timestamp,
      userId: ctx.sender
    });
    if (hooks?.afterCreate)
      hooks.afterCreate(hookCtx, { data, row });
  }), updateReducer = spacetimedb.reducer({ name: updateName }, updateParams, (ctx, args) => {
    const hookCtx = { db: ctx.db, sender: ctx.sender, timestamp: ctx.timestamp }, table = tableAccessor(ctx.db), { pk, row } = getOwnedRow({
      ctxSender: ctx.sender,
      id: args.id,
      operation: "update",
      pkAccessor,
      table,
      tableName
    });
    if (args.expectedUpdatedAt !== undefined && !timestampEquals(row.updatedAt, args.expectedUpdatedAt))
      throw makeError("CONFLICT", `${tableName}:update`);
    let patch = pickPatch(args, fieldNames);
    if (hooks?.beforeUpdate)
      patch = hooks.beforeUpdate(hookCtx, { patch, prev: row });
    const next = pk.update(applyPatch(row, patch, ctx.timestamp));
    if (hooks?.afterUpdate)
      hooks.afterUpdate(hookCtx, { next, patch, prev: row });
  }), rmReducer = spacetimedb.reducer({ name: rmName }, { id: idField }, (ctx, { id }) => {
    const hookCtx = { db: ctx.db, sender: ctx.sender, timestamp: ctx.timestamp }, table = tableAccessor(ctx.db), { pk, row } = getOwnedRow({
      ctxSender: ctx.sender,
      id,
      operation: "rm",
      pkAccessor,
      table,
      tableName
    });
    if (hooks?.beforeDelete)
      hooks.beforeDelete(hookCtx, { row });
    if (options?.softDelete) {
      const nextRecord = {
        ...row,
        deletedAt: ctx.timestamp,
        updatedAt: ctx.timestamp
      };
      pk.update(nextRecord);
    } else {
      const deleted = pk.delete(id);
      if (!deleted)
        throw makeError("NOT_FOUND", `${tableName}:rm`);
    }
    if (hooks?.afterDelete)
      hooks.afterDelete(hookCtx, { row });
  });
  return {
    exports: {
      [createName]: createReducer,
      [rmName]: rmReducer,
      [updateName]: updateReducer
    }
  };
};
const ownedCascade = (_schema, config) => config;
// Packages/betterspace/src/constants.ts
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// Packages/betterspace/src/server/file.ts
const DEFAULT_ALLOWED_TYPES = new Set([
  "application/json",
  "application/msword",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
  "text/csv",
  "text/plain"
]);
const DEFAULT_MAX_FILE_SIZE_MB = 10;
const CHUNK_SIZE_MB = 5;
const HEX_RADIX = 16;
const YEAR_LENGTH = 4;
const SECONDS_IN_MILLISECOND = 1000;
const MAX_PRESIGN_EXPIRY_SECONDS = 604_800;
const DEFAULT_MAX_FILE_SIZE = DEFAULT_MAX_FILE_SIZE_MB * BYTES_PER_MB;
const CHUNK_SIZE = CHUNK_SIZE_MB * BYTES_PER_MB;
const DEFAULT_PRESIGN_EXPIRY_SECONDS = 900;
const ZERO_PREFIX_REGEX = /^0x/u;
const TRAILING_SLASH_REGEX = /\/$/u;
const URI_EXTRA_REGEX = /[!'()*]/gu;
const normalizeHexIdentity = (sender) => {
  const senderLike = sender, raw = typeof senderLike.toHexString === "function" ? senderLike.toHexString() : senderLike.toString?.() ?? "";
  return raw.trim().toLowerCase().replace(ZERO_PREFIX_REGEX, "");
};
const isAuthenticatedSender = (sender) => {
  const normalized = normalizeHexIdentity(sender);
  if (!normalized)
    return false;
  for (const ch of normalized)
    if (ch !== "0")
      return true;
  return false;
};
const encodeUriSegment = (value) => encodeURIComponent(value).replace(URI_EXTRA_REGEX, (c) => `%${c.codePointAt(0).toString(HEX_RADIX).toUpperCase()}`);
const encodeCanonicalPath = (value) => {
  const segments = value.split("/"), out = [];
  for (const segment of segments)
    out.push(encodeUriSegment(segment));
  if (value.startsWith("/"))
    return `/${out.join("/")}`;
  return out.join("/");
};
const toHex = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (const byte of bytes)
    hex += byte.toString(HEX_RADIX).padStart(2, "0");
  return hex;
};
const toDateParts = (date) => {
  const year = date.getUTCFullYear().toString().padStart(YEAR_LENGTH, "0"), month = (date.getUTCMonth() + 1).toString().padStart(2, "0"), day = date.getUTCDate().toString().padStart(2, "0"), hours = date.getUTCHours().toString().padStart(2, "0"), minutes = date.getUTCMinutes().toString().padStart(2, "0"), seconds = date.getUTCSeconds().toString().padStart(2, "0");
  return {
    amzDate: `${year}${month}${day}T${hours}${minutes}${seconds}Z`,
    dateStamp: `${year}${month}${day}`
  };
};
const toCanonicalQuery = (params) => {
  const keys = Object.keys(params).toSorted(), pairs = [];
  for (const key of keys)
    pairs.push(`${encodeUriSegment(key)}=${encodeUriSegment(params[key] ?? "")}`);
  return pairs.join("&");
};
const hmac = async (key, message) => {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { hash: "SHA-256", name: "HMAC" }, false, ["sign"]), data = new TextEncoder().encode(message);
  return crypto.subtle.sign("HMAC", cryptoKey, data);
};
const sha256Hex = async (value) => {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toHex(hash);
};
const signingKey = async (secretAccessKey, dateStamp, region) => {
  const kDate = await hmac(new TextEncoder().encode(`AWS4${secretAccessKey}`), dateStamp), kRegion = await hmac(kDate, region), kService = await hmac(kRegion, "s3");
  return hmac(kService, "aws4_request");
};
const toHost = (endpoint) => endpoint.port ? `${endpoint.hostname}:${endpoint.port}` : endpoint.hostname;
const makePresignedRequest = async ({
  accessKeyId,
  bucket,
  contentType,
  endpoint,
  expiresInSeconds,
  key,
  method,
  region,
  secretAccessKey,
  sessionToken
}) => {
  const now = new Date, { amzDate, dateStamp } = toDateParts(now), normalizedExpiry = Math.max(1, Math.min(expiresInSeconds ?? DEFAULT_PRESIGN_EXPIRY_SECONDS, MAX_PRESIGN_EXPIRY_SECONDS)), endpointUrl = new URL(endpoint), host = toHost(endpointUrl), pathPrefix = endpointUrl.pathname === "/" ? "" : endpointUrl.pathname.replace(TRAILING_SLASH_REGEX, ""), canonicalObjectPath = `${pathPrefix}/${encodeUriSegment(bucket)}/${key.split("/").map(encodeUriSegment).join("/")}`, canonicalUri = encodeCanonicalPath(canonicalObjectPath), credentialScope = `${dateStamp}/${region}/s3/aws4_request`, headers = {
    host
  }, signedHeaderNames = ["host"];
  if (contentType) {
    headers["content-type"] = contentType;
    signedHeaderNames.push("content-type");
  }
  const canonicalHeaders = `${signedHeaderNames.map((name) => `${name}:${headers[name]}`).join(`
`)}
`, signedHeaders = signedHeaderNames.join(";"), queryParams = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(normalizedExpiry),
    "X-Amz-SignedHeaders": signedHeaders
  };
  if (sessionToken)
    queryParams["X-Amz-Security-Token"] = sessionToken;
  const canonicalQuery = toCanonicalQuery(queryParams), canonicalRequest = `${method}
${canonicalUri}
${canonicalQuery}
${canonicalHeaders}
${signedHeaders}
UNSIGNED-PAYLOAD`, canonicalRequestHash = await sha256Hex(canonicalRequest), stringToSign = `AWS4-HMAC-SHA256
${amzDate}
${credentialScope}
${canonicalRequestHash}`, keyBytes = await signingKey(secretAccessKey, dateStamp, region), signature = toHex(await hmac(keyBytes, stringToSign)), finalQuery = `${canonicalQuery}&X-Amz-Signature=${signature}`, url = `${endpointUrl.protocol}//${host}${canonicalUri}?${finalQuery}`, clientHeaders = {};
  if (contentType)
    clientHeaders["content-type"] = contentType;
  return {
    expiresAt: now.getTime() + normalizedExpiry * SECONDS_IN_MILLISECOND,
    headers: clientHeaders,
    key,
    method,
    url
  };
};
const createS3UploadPresignedUrl = async (options) => makePresignedRequest({ ...options, method: "PUT" });
const createS3DownloadPresignedUrl = async (options) => makePresignedRequest({ ...options, method: "GET" });
const makeFileUpload = (spacetimedb, config) => {
  const {
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    fields,
    idField,
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    namespace,
    pk: pkAccessor,
    table: tableAccessor
  } = config, registerName = `register_upload_${namespace}`, deleteName = `delete_file_${namespace}`, registerReducer = spacetimedb.reducer({ name: registerName }, {
    contentType: fields.contentType,
    filename: fields.filename,
    size: fields.size,
    storageKey: fields.storageKey
  }, (ctx, args) => {
    if (!isAuthenticatedSender(ctx.sender))
      throw makeError("NOT_AUTHENTICATED", `${namespace}:register`);
    if (!allowedTypes.has(args.contentType))
      throw makeError("INVALID_FILE_TYPE", `File type ${args.contentType} not allowed`);
    if (args.size > maxFileSize)
      throw makeError("FILE_TOO_LARGE", `File size ${args.size} exceeds ${maxFileSize} bytes`);
    const table = tableAccessor(ctx.db);
    table.insert({
      contentType: args.contentType,
      filename: args.filename,
      id: 0,
      size: args.size,
      storageKey: args.storageKey,
      uploadedAt: ctx.timestamp,
      userId: ctx.sender
    });
  }), deleteReducer = spacetimedb.reducer({ name: deleteName }, {
    fileId: idField
  }, (ctx, { fileId }) => {
    if (!isAuthenticatedSender(ctx.sender))
      throw makeError("NOT_AUTHENTICATED", `${namespace}:delete`);
    const table = tableAccessor(ctx.db), pk = pkAccessor(table), row = pk.find(fileId);
    if (!row)
      throw makeError("NOT_FOUND", `${namespace}:delete`);
    if (!identityEquals(row.userId, ctx.sender))
      throw makeError("FORBIDDEN", `${namespace}:delete`);
    const removed = pk.delete(fileId);
    if (!removed)
      throw makeError("NOT_FOUND", `${namespace}:delete`);
  });
  return {
    exports: {
      [deleteName]: deleteReducer,
      [registerName]: registerReducer
    }
  };
};
// Packages/betterspace/src/server/helpers.ts
import { Identity } from "spacetimedb";

// Node_modules/zod/v4/core/core.js
const NEVER = Object.freeze({
  status: "aborted"
});
function $constructor(name, initializer, params) {
  function init(inst, def) {
    if (!inst._zod) {
      Object.defineProperty(inst, "_zod", {
        value: {
          def,
          constr: _,
          traits: new Set
        },
        enumerable: false
      });
    }
    if (inst._zod.traits.has(name)) {
      return;
    }
    inst._zod.traits.add(name);
    initializer(inst, def);
    const proto = _.prototype;
    const keys = Object.keys(proto);
    for (let i = 0;i < keys.length; i += 1) {
      const k = keys[i];
      if (!(k in inst)) {
        inst[k] = proto[k].bind(inst);
      }
    }
  }
  const Parent = params?.Parent ?? Object;

  class Definition extends Parent {}
  Object.defineProperty(Definition, "name", { value: name });
  function _(def) {
    let _a;
    const inst = params?.Parent ? new Definition : this;
    init(inst, def);
    (_a = inst._zod).deferred ?? (_a.deferred = []);
    for (const fn of inst._zod.deferred) {
      fn();
    }
    return inst;
  }
  Object.defineProperty(_, "init", { value: init });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: (inst) => {
      if (params?.Parent && inst instanceof params.Parent)
        return true;
      return inst?._zod?.traits?.has(name);
    }
  });
  Object.defineProperty(_, "name", { value: name });
  return _;
}
const $brand = Symbol("zod_brand");

class $ZodAsyncError extends Error {
  constructor() {
    super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
  }
}

class $ZodEncodeError extends Error {
  constructor(name) {
    super(`Encountered unidirectional transform during encode: ${name}`);
    this.name = "ZodEncodeError";
  }
}
const globalConfig = {};
function config(newConfig) {
  if (newConfig)
    Object.assign(globalConfig, newConfig);
  return globalConfig;
}
// Node_modules/zod/v4/core/util.js
const exports_util = {};
__export(exports_util, {
  unwrapMessage: () => unwrapMessage,
  uint8ArrayToHex: () => uint8ArrayToHex,
  uint8ArrayToBase64url: () => uint8ArrayToBase64url,
  uint8ArrayToBase64: () => uint8ArrayToBase64,
  stringifyPrimitive: () => stringifyPrimitive,
  slugify: () => slugify,
  shallowClone: () => shallowClone,
  safeExtend: () => safeExtend,
  required: () => required,
  randomString: () => randomString,
  propertyKeyTypes: () => propertyKeyTypes,
  promiseAllObject: () => promiseAllObject,
  primitiveTypes: () => primitiveTypes,
  prefixIssues: () => prefixIssues,
  pick: () => pick,
  partial: () => partial,
  parsedType: () => parsedType,
  optionalKeys: () => optionalKeys,
  omit: () => omit,
  objectClone: () => objectClone,
  numKeys: () => numKeys,
  nullish: () => nullish,
  normalizeParams: () => normalizeParams,
  mergeDefs: () => mergeDefs,
  merge: () => merge,
  jsonStringifyReplacer: () => jsonStringifyReplacer,
  joinValues: () => joinValues,
  issue: () => issue,
  isPlainObject: () => isPlainObject,
  isObject: () => isObject,
  hexToUint8Array: () => hexToUint8Array,
  getSizableOrigin: () => getSizableOrigin,
  getParsedType: () => getParsedType,
  getLengthableOrigin: () => getLengthableOrigin,
  getEnumValues: () => getEnumValues,
  getElementAtPath: () => getElementAtPath,
  floatSafeRemainder: () => floatSafeRemainder,
  finalizeIssue: () => finalizeIssue,
  extend: () => extend,
  escapeRegex: () => escapeRegex,
  esc: () => esc,
  defineLazy: () => defineLazy,
  createTransparentProxy: () => createTransparentProxy,
  cloneDef: () => cloneDef,
  clone: () => clone,
  cleanRegex: () => cleanRegex,
  cleanEnum: () => cleanEnum,
  captureStackTrace: () => captureStackTrace,
  cached: () => cached,
  base64urlToUint8Array: () => base64urlToUint8Array,
  base64ToUint8Array: () => base64ToUint8Array,
  assignProp: () => assignProp,
  assertNotEqual: () => assertNotEqual,
  assertNever: () => assertNever,
  assertIs: () => assertIs,
  assertEqual: () => assertEqual,
  assert: () => assert,
  allowsEval: () => allowsEval,
  aborted: () => aborted,
  NUMBER_FORMAT_RANGES: () => NUMBER_FORMAT_RANGES,
  Class: () => Class,
  BIGINT_FORMAT_RANGES: () => BIGINT_FORMAT_RANGES
});
function assertEqual(val) {
  return val;
}
function assertNotEqual(val) {
  return val;
}
function assertIs(_arg) {}
function assertNever(_x) {
  throw new Error("Unexpected value in exhaustive check");
}
function assert(_) {}
function getEnumValues(entries) {
  const numericValues = new Set(Object.values(entries).filter((v) => typeof v === "number"));
  const values = Object.entries(entries).filter(([k, _]) => !numericValues.has(Number(k))).map(([_, v]) => v);
  return values;
}
function joinValues(array, separator = "|") {
  return array.map((val) => stringifyPrimitive(val)).join(separator);
}
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
function cached(getter) {
  const set = false;
  return {
    get value() {
      if (!set) {
        const value = getter();
        Object.defineProperty(this, "value", { value });
        return value;
      }
      throw new Error("cached value already set");
    }
  };
}
function nullish(input) {
  return input === null || input === undefined;
}
function cleanRegex(source) {
  const start = source.startsWith("^") ? 1 : 0;
  const end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepString = step.toString();
  let stepDecCount = (stepString.split(".")[1] || "").length;
  if (stepDecCount === 0 && /\d?e-\d?/.test(stepString)) {
    const match = stepString.match(/\d?e-(\d?)/);
    if (match?.[1]) {
      stepDecCount = Number.parseInt(match[1]);
    }
  }
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
const EVALUATING = Symbol("evaluating");
function defineLazy(object, key, getter) {
  let value;
  Object.defineProperty(object, key, {
    get() {
      if (value === EVALUATING) {
        return;
      }
      if (value === undefined) {
        value = EVALUATING;
        value = getter();
      }
      return value;
    },
    set(v) {
      Object.defineProperty(object, key, {
        value: v
      });
    },
    configurable: true
  });
}
function objectClone(obj) {
  return Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj));
}
function assignProp(target, prop, value) {
  Object.defineProperty(target, prop, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}
function mergeDefs(...defs) {
  const mergedDescriptors = {};
  for (const def of defs) {
    const descriptors = Object.getOwnPropertyDescriptors(def);
    Object.assign(mergedDescriptors, descriptors);
  }
  return Object.defineProperties({}, mergedDescriptors);
}
function cloneDef(schema) {
  return mergeDefs(schema._zod.def);
}
function getElementAtPath(obj, path) {
  if (!path)
    return obj;
  return path.reduce((acc, key) => acc?.[key], obj);
}
function promiseAllObject(promisesObj) {
  const keys = Object.keys(promisesObj);
  const promises = keys.map((key) => promisesObj[key]);
  return Promise.all(promises).then((results) => {
    const resolvedObj = {};
    for (let i = 0;i < keys.length; i += 1) {
      resolvedObj[keys[i]] = results[i];
    }
    return resolvedObj;
  });
}
function randomString(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let str = "";
  for (let i = 0;i < length; i += 1) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
}
function esc(str) {
  return JSON.stringify(str);
}
function slugify(input) {
  return input.toLowerCase().trim().replaceAll(/[^\w\s-]/g, "").replaceAll(/[\s_-]+/g, "-").replaceAll(/^-+|-+$/g, "");
}
const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
const allowsEval = cached(() => {
  if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
    return false;
  }
  try {
    const F = Function;
    new F("");
    return true;
  } catch  {
    return false;
  }
});
function isPlainObject(o) {
  if (isObject(o) === false)
    return false;
  const ctor = o.constructor;
  if (ctor === undefined)
    return true;
  if (typeof ctor !== "function")
    return true;
  const prot = ctor.prototype;
  if (isObject(prot) === false)
    return false;
  if (Object.hasOwn(prot, "isPrototypeOf") === false) {
    return false;
  }
  return true;
}
function shallowClone(o) {
  if (isPlainObject(o))
    return { ...o };
  if (Array.isArray(o))
    return [...o];
  return o;
}
function numKeys(data) {
  let keyCount = 0;
  for (const key in data) {
    if (Object.hasOwn(data, key)) {
      keyCount += 1;
    }
  }
  return keyCount;
}
const getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return "undefined";
    case "string":
      return "string";
    case "number":
      return Number.isNaN(data) ? "nan" : "number";
    case "boolean":
      return "boolean";
    case "function":
      return "function";
    case "bigint":
      return "bigint";
    case "symbol":
      return "symbol";
    case "object":
      if (Array.isArray(data)) {
        return "array";
      }
      if (data === null) {
        return "null";
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return "promise";
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return "map";
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return "set";
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return "date";
      }
      if (typeof File !== "undefined" && data instanceof File) {
        return "file";
      }
      return "object";
    default:
      throw new Error(`Unknown data type: ${t}`);
  }
};
const propertyKeyTypes = new Set(["string", "number", "symbol"]);
const primitiveTypes = new Set(["string", "number", "bigint", "boolean", "symbol", "undefined"]);
function escapeRegex(str) {
  return str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || params?.parent)
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if (params?.message !== undefined) {
    if (params?.error !== undefined)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
function createTransparentProxy(getter) {
  let target;
  return new Proxy({}, {
    get(_, prop, receiver) {
      target ?? (target = getter());
      return Reflect.get(target, prop, receiver);
    },
    set(_, prop, value, receiver) {
      target ?? (target = getter());
      return Reflect.set(target, prop, value, receiver);
    },
    has(_, prop) {
      target ?? (target = getter());
      return Reflect.has(target, prop);
    },
    deleteProperty(_, prop) {
      target ?? (target = getter());
      return Reflect.deleteProperty(target, prop);
    },
    ownKeys(_) {
      target ?? (target = getter());
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(_, prop) {
      target ?? (target = getter());
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
    defineProperty(_, prop, descriptor) {
      target ?? (target = getter());
      return Reflect.defineProperty(target, prop, descriptor);
    }
  });
}
function stringifyPrimitive(value) {
  if (typeof value === "bigint")
    return value.toString() + "n";
  if (typeof value === "string")
    return `"${value}"`;
  return `${value}`;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional");
}
const NUMBER_FORMAT_RANGES = {
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2_147_483_648, 2_147_483_647],
  uint32: [0, 4_294_967_295],
  float32: [-340_282_346_638_528_860_000_000_000_000_000_000_000, 340_282_346_638_528_860_000_000_000_000_000_000_000],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
const BIGINT_FORMAT_RANGES = {
  int64: [/* @__PURE__ */ BigInt("-9223372036854775808"), /* @__PURE__ */ 9_223_372_036_854_775_807n],
  uint64: [/* @__PURE__ */ 0n, /* @__PURE__ */ 18_446_744_073_709_551_615n]
};
function pick(schema, mask) {
  const currDef = schema._zod.def;
  const {checks} = currDef;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".pick() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = {};
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        newShape[key] = currDef.shape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function omit(schema, mask) {
  const currDef = schema._zod.def;
  const {checks} = currDef;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".omit() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = { ...schema._zod.def.shape };
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        delete newShape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function extend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to extend: expected a plain object");
  }
  const {checks} = schema._zod.def;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    const existingShape = schema._zod.def.shape;
    for (const key in shape) {
      if (Object.getOwnPropertyDescriptor(existingShape, key) !== undefined) {
        throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
      }
    }
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    }
  });
  return clone(schema, def);
}
function safeExtend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to safeExtend: expected a plain object");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    }
  });
  return clone(schema, def);
}
function merge(a, b) {
  const def = mergeDefs(a._zod.def, {
    get shape() {
      const _shape = { ...a._zod.def.shape, ...b._zod.def.shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    get catchall() {
      return b._zod.def.catchall;
    },
    checks: []
  });
  return clone(a, def);
}
function partial(Class, schema, mask) {
  const currDef = schema._zod.def;
  const {checks} = currDef;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".partial() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in oldShape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = Class ? new Class({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      } else {
        for (const key in oldShape) {
          shape[key] = Class ? new Class({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    },
    checks: []
  });
  return clone(schema, def);
}
function required(Class, schema, mask) {
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in shape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = new Class({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      } else {
        for (const key in oldShape) {
          shape[key] = new Class({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    }
  });
  return clone(schema, def);
}
function aborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex;i < x.issues.length; i += 1) {
    if (x.issues[i]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path, issues) {
  return issues.map((iss) => {
    let _a;
    (_a = iss).path ?? (_a.path = []);
    iss.path.unshift(path);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config2) {
  const full = { ...iss, path: iss.path ?? [] };
  if (!iss.message) {
    const message = unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
    full.message = message;
  }
  delete full.inst;
  delete full.continue;
  if (!ctx?.reportInput) {
    delete full.input;
  }
  return full;
}
function getSizableOrigin(input) {
  if (input instanceof Set)
    return "set";
  if (input instanceof Map)
    return "map";
  if (input instanceof File)
    return "file";
  return "unknown";
}
function getLengthableOrigin(input) {
  if (Array.isArray(input))
    return "array";
  if (typeof input === "string")
    return "string";
  return "unknown";
}
function parsedType(data) {
  const t = typeof data;
  switch (t) {
    case "number": 
      return Number.isNaN(data) ? "nan" : "number";
    
    case "object": {
      if (data === null) {
        return "null";
      }
      if (Array.isArray(data)) {
        return "array";
      }
      const obj = data;
      if (obj && Object.getPrototypeOf(obj) !== Object.prototype && "constructor" in obj && obj.constructor) {
        return obj.constructor.name;
      }
    }
  }
  return t;
}
function issue(...args) {
  const [iss, input, inst] = args;
  if (typeof iss === "string") {
    return {
      message: iss,
      code: "custom",
      input,
      inst
    };
  }
  return { ...iss };
}
function cleanEnum(obj) {
  return Object.entries(obj).filter(([k, _]) => Number.isNaN(Number.parseInt(k, 10))).map((el) => el[1]);
}
function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0;i < binaryString.length; i += 1) {
    bytes[i] = binaryString.codePointAt(i);
  }
  return bytes;
}
function uint8ArrayToBase64(bytes) {
  let binaryString = "";
  for (let i = 0;i < bytes.length; i += 1) {
    binaryString += String.fromCodePoint(bytes[i]);
  }
  return btoa(binaryString);
}
function base64urlToUint8Array(base64url) {
  const base64 = base64url.replaceAll('-', "+").replaceAll('_', "/");
  const padding = "=".repeat((4 - base64.length % 4) % 4);
  return base64ToUint8Array(base64 + padding);
}
function uint8ArrayToBase64url(bytes) {
  return uint8ArrayToBase64(bytes).replaceAll('+', "-").replaceAll('/', "_").replaceAll(/[=]/g, "");
}
function hexToUint8Array(hex) {
  const cleanHex = hex.replace(/^0x/, "");
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0;i < cleanHex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes;
}
function uint8ArrayToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}



// Node_modules/zod/v4/core/errors.js
const initializer = (inst, def) => {
  inst.name = "$ZodError";
  Object.defineProperty(inst, "_zod", {
    value: inst._zod,
    enumerable: false
  });
  Object.defineProperty(inst, "issues", {
    value: def,
    enumerable: false
  });
  inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
  Object.defineProperty(inst, "toString", {
    value: () => inst.message,
    enumerable: false
  });
};
const $ZodError = $constructor("$ZodError", initializer);
const $ZodRealError = $constructor("$ZodError", initializer, { Parent: Error });
function flattenError(error, mapper = (issue2) => issue2.message) {
  const fieldErrors = {};
  const formErrors = [];
  for (const sub of error.issues) {
    if (sub.path.length > 0) {
      fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
      fieldErrors[sub.path[0]].push(mapper(sub));
    } else {
      formErrors.push(mapper(sub));
    }
  }
  return { formErrors, fieldErrors };
}
function formatError(error, mapper = (issue2) => issue2.message) {
  const fieldErrors = { _errors: [] };
  const processError = (error2) => {
    for (const issue2 of error2.issues) {
      if (issue2.code === "invalid_union" && issue2.errors.length) {
        issue2.errors.map((issues) => processError({ issues }));
      } else if (issue2.code === "invalid_key") {
        processError({ issues: issue2.issues });
      } else if (issue2.code === "invalid_element") {
        processError({ issues: issue2.issues });
      } else if (issue2.path.length === 0) {
        fieldErrors._errors.push(mapper(issue2));
      } else {
        let curr = fieldErrors;
        let i = 0;
        while (i < issue2.path.length) {
          const el = issue2.path[i];
          const terminal = i === issue2.path.length - 1;
          if (!terminal) {
            curr[el] = curr[el] || { _errors: [] };
          } else {
            curr[el] = curr[el] || { _errors: [] };
            curr[el]._errors.push(mapper(issue2));
          }
          curr = curr[el];
          i += 1;
        }
      }
    }
  };
  processError(error);
  return fieldErrors;
}

// Node_modules/zod/v4/core/parse.js
const _parse = (_Err) => (schema, value, _ctx, _params) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: false }) : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError;
  }
  if (result.issues.length) {
    const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, _params?.callee);
    throw e;
  }
  return result.value;
};
const _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  if (result.issues.length) {
    const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, params?.callee);
    throw e;
  }
  return result.value;
};
const _safeParse = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError;
  }
  return result.issues.length ? {
    success: false,
    error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
const safeParse = /* @__PURE__ */ _safeParse($ZodRealError);
const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? {
    success: false,
    error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
const safeParseAsync = /* @__PURE__ */ _safeParseAsync($ZodRealError);
const _encode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _parse(_Err)(schema, value, ctx);
};
const _decode = (_Err) => (schema, value, _ctx) => _parse(_Err)(schema, value, _ctx);
const _encodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _parseAsync(_Err)(schema, value, ctx);
};
const _decodeAsync = (_Err) => async (schema, value, _ctx) => _parseAsync(_Err)(schema, value, _ctx);
const _safeEncode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _safeParse(_Err)(schema, value, ctx);
};
const _safeDecode = (_Err) => (schema, value, _ctx) => _safeParse(_Err)(schema, value, _ctx);
const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _safeParseAsync(_Err)(schema, value, ctx);
};
const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => _safeParseAsync(_Err)(schema, value, _ctx);
// Node_modules/zod/v4/core/regexes.js
const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
const date = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
const integer = /^-?\d+$/;
const number = /^-?\d+(?:\.\d+)?$/;

// Node_modules/zod/v4/core/checks.js
const $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
  let _a;
  inst._zod ?? (inst._zod = {});
  inst._zod.def = def;
  (_a = inst._zod).onattach ?? (_a.onattach = []);
});
const numericOriginMap = {
  number: "number",
  bigint: "bigint",
  object: "date"
};
const $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const {bag} = inst2._zod;
    const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
    if (def.value < curr) {
      if (def.inclusive)
        bag.maximum = def.value;
      else
        bag.exclusiveMaximum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const {bag} = inst2._zod;
    const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
    if (def.value > curr) {
      if (def.inclusive)
        bag.minimum = def.value;
      else
        bag.exclusiveMinimum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    let _a;
    (_a = inst2._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
  });
  inst._zod.check = (payload) => {
    if (typeof payload.value !== typeof def.value)
      throw new Error("Cannot mix number and bigint in multiple_of check.");
    const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === 0n : floatSafeRemainder(payload.value, def.value) === 0;
    if (isMultiple)
      return;
    payload.issues.push({
      origin: typeof payload.value,
      code: "not_multiple_of",
      divisor: def.value,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
  $ZodCheck.init(inst, def);
  def.format = def.format || "float64";
  const isInt = def.format?.includes("int");
  const origin = isInt ? "int" : "number";
  const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
  inst._zod.onattach.push((inst2) => {
    const {bag} = inst2._zod;
    bag.format = def.format;
    bag.minimum = minimum;
    bag.maximum = maximum;
    if (isInt)
      bag.pattern = integer;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    if (isInt) {
      if (!Number.isInteger(input)) {
        payload.issues.push({
          expected: origin,
          format: def.format,
          code: "invalid_type",
          continue: false,
          input,
          inst
        });
        return;
      }
      if (!Number.isSafeInteger(input)) {
        if (input > 0) {
          payload.issues.push({
            input,
            code: "too_big",
            maximum: Number.MAX_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        } else {
          payload.issues.push({
            input,
            code: "too_small",
            minimum: Number.MIN_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        }
        return;
      }
    }
    if (input < minimum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_small",
        minimum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
    if (input > maximum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_big",
        maximum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
  };
});
const $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
  let _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== undefined;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    if (def.maximum < curr)
      inst2._zod.bag.maximum = def.maximum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const {length} = input;
    if (length <= def.maximum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: def.maximum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
  let _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== undefined;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    if (def.minimum > curr)
      inst2._zod.bag.minimum = def.minimum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const {length} = input;
    if (length >= def.minimum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: def.minimum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
  let _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== undefined;
  });
  inst._zod.onattach.push((inst2) => {
    const {bag} = inst2._zod;
    bag.minimum = def.length;
    bag.maximum = def.length;
    bag.length = def.length;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const {length} = input;
    if (length === def.length)
      return;
    const origin = getLengthableOrigin(input);
    const tooBig = length > def.length;
    payload.issues.push({
      origin,
      ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
      inclusive: true,
      exact: true,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.check = (payload) => {
    payload.value = def.tx(payload.value);
  };
});

// Node_modules/zod/v4/core/doc.js
class Doc {
  constructor(args = []) {
    this.content = [];
    this.indent = 0;
    if (this)
      this.args = args;
  }
  indented(fn) {
    this.indent += 1;
    fn(this);
    this.indent -= 1;
  }
  write(arg) {
    if (typeof arg === "function") {
      arg(this, { execution: "sync" });
      arg(this, { execution: "async" });
      return;
    }
    const content = arg;
    const lines = content.split(`
`).filter((x) => x);
    const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
    const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
    for (const line of dedented) {
      this.content.push(line);
    }
  }
  compile() {
    const F = Function;
    const args = this?.args;
    const content = this?.content ?? [``];
    const lines = content.map((x) => `  ${x}`);
    return new F(...args, lines.join(`
`));
  }
}

// Node_modules/zod/v4/core/versions.js
const version = {
  major: 4,
  minor: 3,
  patch: 6
};

// Node_modules/zod/v4/core/schemas.js
const $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
  let _a;
  inst ?? (inst = {});
  inst._zod.def = def;
  inst._zod.bag = inst._zod.bag || {};
  inst._zod.version = version;
  const checks = [...inst._zod.def.checks ?? []];
  if (inst._zod.traits.has("$ZodCheck")) {
    checks.unshift(inst);
  }
  for (const ch of checks) {
    for (const fn of ch._zod.onattach) {
      fn(inst);
    }
  }
  if (checks.length === 0) {
    (_a = inst._zod).deferred ?? (_a.deferred = []);
    inst._zod.deferred?.push(() => {
      inst._zod.run = inst._zod.parse;
    });
  } else {
    const runChecks = (payload, checks2, ctx) => {
      let isAborted = aborted(payload);
      let asyncResult;
      for (const ch of checks2) {
        if (ch._zod.def.when) {
          const shouldRun = ch._zod.def.when(payload);
          if (!shouldRun)
            continue;
        } else if (isAborted) {
          continue;
        }
        const currLen = payload.issues.length;
        const _ = ch._zod.check(payload);
        if (_ instanceof Promise && ctx?.async === false) {
          throw new $ZodAsyncError;
        }
        if (asyncResult || _ instanceof Promise) {
          asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
            await _;
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              return;
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          });
        } else {
          const nextLen = payload.issues.length;
          if (nextLen === currLen)
            continue;
          if (!isAborted)
            isAborted = aborted(payload, currLen);
        }
      }
      if (asyncResult) {
        return asyncResult.then(() => payload);
      }
      return payload;
    };
    const handleCanaryResult = (canary, payload, ctx) => {
      if (aborted(canary)) {
        canary.aborted = true;
        return canary;
      }
      const checkResult = runChecks(payload, checks, ctx);
      if (checkResult instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError;
        return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
      }
      return inst._zod.parse(checkResult, ctx);
    };
    inst._zod.run = (payload, ctx) => {
      if (ctx.skipChecks) {
        return inst._zod.parse(payload, ctx);
      }
      if (ctx.direction === "backward") {
        const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
        if (canary instanceof Promise) {
          return canary.then((canary2) => handleCanaryResult(canary2, payload, ctx));
        }
        return handleCanaryResult(canary, payload, ctx);
      }
      const result = inst._zod.parse(payload, ctx);
      if (result instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError;
        return result.then((result2) => runChecks(result2, checks, ctx));
      }
      return runChecks(result, checks, ctx);
    };
  }
  defineLazy(inst, "~standard", () => ({
    validate: (value) => {
      try {
        const r = safeParse(inst, value);
        return r.success ? { value: r.data } : { issues: r.error?.issues };
      } catch  {
        return safeParseAsync(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
      }
    },
    vendor: "zod",
    version: 1
  }));
});
const $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = inst._zod.bag.pattern ?? number;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Number(payload.value);
      } catch  {}
    const input = payload.value;
    if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
      return payload;
    }
    const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : undefined : undefined;
    payload.issues.push({
      expected: "number",
      code: "invalid_type",
      input,
      inst,
      ...received ? { received } : {}
    });
    return payload;
  };
});
const $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumberFormat", (inst, def) => {
  $ZodCheckNumberFormat.init(inst, def);
  $ZodNumber.init(inst, def);
});
const $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
const $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    payload.issues.push({
      expected: "never",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
function handleArrayResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
const $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!Array.isArray(input)) {
      payload.issues.push({
        expected: "array",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = Array(input.length);
    const proms = [];
    for (let i = 0;i < input.length; i += 1) {
      const item = input[i];
      const result = def.element._zod.run({
        value: item,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
      } else {
        handleArrayResult(result, payload, i);
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
function handlePropertyResult(result, final, key, input, isOptionalOut) {
  if (result.issues.length) {
    if (isOptionalOut && !(key in input)) {
      return;
    }
    final.issues.push(...prefixIssues(key, result.issues));
  }
  if (result.value === undefined) {
    if (key in input) {
      final.value[key] = undefined;
    }
  } else {
    final.value[key] = result.value;
  }
}
function normalizeDef(def) {
  const keys = Object.keys(def.shape);
  for (const k of keys) {
    if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
      throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
    }
  }
  const okeys = optionalKeys(def.shape);
  return {
    ...def,
    keys,
    keySet: new Set(keys),
    numKeys: keys.length,
    optionalKeys: new Set(okeys)
  };
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
  const unrecognized = [];
  const {keySet} = def;
  const _catchall = def.catchall._zod;
  const t = _catchall.def.type;
  const isOptionalOut = _catchall.optout === "optional";
  for (const key in input) {
    if (keySet.has(key))
      continue;
    if (t === "never") {
      unrecognized.push(key);
      continue;
    }
    const r = _catchall.run({ value: input[key], issues: [] }, ctx);
    if (r instanceof Promise) {
      proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalOut)));
    } else {
      handlePropertyResult(r, payload, key, input, isOptionalOut);
    }
  }
  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst
    });
  }
  if (!proms.length)
    return payload;
  return Promise.all(proms).then(() => payload);
}
const $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
  $ZodType.init(inst, def);
  const desc = Object.getOwnPropertyDescriptor(def, "shape");
  if (!desc?.get) {
    const sh = def.shape;
    Object.defineProperty(def, "shape", {
      get: () => {
        const newSh = { ...sh };
        Object.defineProperty(def, "shape", {
          value: newSh
        });
        return newSh;
      }
    });
  }
  const _normalized = cached(() => normalizeDef(def));
  defineLazy(inst._zod, "propValues", () => {
    const {shape} = def;
    const propValues = {};
    for (const key in shape) {
      const field = shape[key]._zod;
      if (field.values) {
        propValues[key] ?? (propValues[key] = new Set);
        for (const v of field.values)
          propValues[key].add(v);
      }
    }
    return propValues;
  });
  const isObject2 = isObject;
  const {catchall} = def;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (({ value } = _normalized));
    const input = payload.value;
    if (!isObject2(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = {};
    const proms = [];
    const {shape} = value;
    for (const key of value.keys) {
      const el = shape[key];
      const isOptionalOut = el._zod.optout === "optional";
      const r = el._zod.run({ value: input[key], issues: [] }, ctx);
      if (r instanceof Promise) {
        proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalOut)));
      } else {
        handlePropertyResult(r, payload, key, input, isOptionalOut);
      }
    }
    if (!catchall) {
      return proms.length ? Promise.all(proms).then(() => payload) : payload;
    }
    return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
  };
});
const $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
  $ZodObject.init(inst, def);
  const superParse = inst._zod.parse;
  const _normalized = cached(() => normalizeDef(def));
  const generateFastpass = (shape) => {
    const doc = new Doc(["shape", "payload", "ctx"]);
    const normalized = _normalized.value;
    const parseStr = (key) => {
      const k = esc(key);
      return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
    };
    doc.write(`const input = payload.value;`);
    const ids = Object.create(null);
    let counter = 0;
    for (const key of normalized.keys) {
      ids[key] = `key_${counter += 1}`;
    }
    doc.write(`const newResult = {};`);
    for (const key of normalized.keys) {
      const id = ids[key];
      const k = esc(key);
      const schema = shape[key];
      const isOptionalOut = schema?._zod?.optout === "optional";
      doc.write(`const ${id} = ${parseStr(key)};`);
      if (isOptionalOut) {
        doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
      } else {
        doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
      }
    }
    doc.write(`payload.value = newResult;`);
    doc.write(`return payload;`);
    const fn = doc.compile();
    return (payload, ctx) => fn(shape, payload, ctx);
  };
  let fastpass;
  const isObject2 = isObject;
  const jit = !globalConfig.jitless;
  const allowsEval2 = allowsEval;
  const fastEnabled = jit && allowsEval2.value;
  const {catchall} = def;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (({ value } = _normalized));
    const input = payload.value;
    if (!isObject2(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
      if (!fastpass)
        fastpass = generateFastpass(def.shape);
      payload = fastpass(payload, ctx);
      if (!catchall)
        return payload;
      return handleCatchall([], input, payload, ctx, value, inst);
    }
    return superParse(payload, ctx);
  };
});
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  const nonaborted = results.filter((r) => !aborted(r));
  if (nonaborted.length === 1) {
    final.value = nonaborted[0].value;
    return nonaborted[0];
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  });
  return final;
}
const $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : undefined);
  defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : undefined);
  defineLazy(inst._zod, "values", () => {
    if (def.options.every((o) => o._zod.values)) {
      return new Set(def.options.flatMap((option) => [...option._zod.values]));
    }
    return;
  });
  defineLazy(inst._zod, "pattern", () => {
    if (def.options.every((o) => o._zod.pattern)) {
      const patterns = def.options.map((o) => o._zod.pattern);
      return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
    }
    return;
  });
  const single = def.options.length === 1;
  const first = def.options[0]._zod.run;
  inst._zod.parse = (payload, ctx) => {
    if (single) {
      return first(payload, ctx);
    }
    let async = false;
    const results = [];
    for (const option of def.options) {
      const result = option._zod.run({
        value: payload.value,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        results.push(result);
        async = true;
      } else {
        if (result.issues.length === 0)
          return result;
        results.push(result);
      }
    }
    if (!async)
      return handleUnionResults(results, payload, inst, ctx);
    return Promise.all(results).then((results2) => handleUnionResults(results2, payload, inst, ctx));
  };
});
const $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    const left = def.left._zod.run({ value: input, issues: [] }, ctx);
    const right = def.right._zod.run({ value: input, issues: [] }, ctx);
    const async = left instanceof Promise || right instanceof Promise;
    if (async) {
      return Promise.all([left, right]).then(([left2, right2]) => handleIntersectionResults(payload, left2, right2));
    }
    return handleIntersectionResults(payload, left, right);
  };
});
function mergeValues(a, b) {
  if (a === b) {
    return { valid: true, data: a };
  }
  if (a instanceof Date && b instanceof Date && Number(a) === Number(b)) {
    return { valid: true, data: a };
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const bKeys = Object.keys(b);
    const sharedKeys = Object.keys(a).filter((key) => bKeys.includes(key));
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
        };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return { valid: false, mergeErrorPath: [] };
    }
    const newArray = [];
    for (let index = 0;index < a.length; index += 1) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
        };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  }
  return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(result, left, right) {
  const unrecKeys = new Map;
  let unrecIssue;
  for (const iss of left.issues) {
    if (iss.code === "unrecognized_keys") {
      unrecIssue ?? (unrecIssue = iss);
      for (const k of iss.keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k).l = true;
      }
    } else {
      result.issues.push(iss);
    }
  }
  for (const iss of right.issues) {
    if (iss.code === "unrecognized_keys") {
      for (const k of iss.keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k).r = true;
      }
    } else {
      result.issues.push(iss);
    }
  }
  const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
  if (bothKeys.length && unrecIssue) {
    result.issues.push({ ...unrecIssue, keys: bothKeys });
  }
  if (aborted(result))
    return result;
  const merged = mergeValues(left.value, right.value);
  if (!merged.valid) {
    throw new Error(`Unmergable intersection. Error path: ` + `${JSON.stringify(merged.mergeErrorPath)}`);
  }
  result.value = merged.data;
  return result;
}
const $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
  $ZodType.init(inst, def);
  const values = getEnumValues(def.entries);
  const valuesSet = new Set(values);
  inst._zod.values = valuesSet;
  inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (valuesSet.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values,
      input,
      inst
    });
    return payload;
  };
});
const $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    const _out = def.transform(payload.value, payload);
    if (ctx.async) {
      const output = _out instanceof Promise ? _out : Promise.resolve(_out);
      return output.then((output2) => {
        payload.value = output2;
        return payload;
      });
    }
    if (_out instanceof Promise) {
      throw new $ZodAsyncError;
    }
    payload.value = _out;
    return payload;
  };
});
function handleOptionalResult(result, input) {
  if (result.issues.length && input === undefined) {
    return { issues: [], value: undefined };
  }
  return result;
}
const $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  inst._zod.optout = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values ? new Set([...def.innerType._zod.values, undefined]) : undefined);
  defineLazy(inst._zod, "pattern", () => {
    const {pattern} = def.innerType._zod;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : undefined;
  });
  inst._zod.parse = (payload, ctx) => {
    if (def.innerType._zod.optin === "optional") {
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise)
        return result.then((r) => handleOptionalResult(r, payload.value));
      return handleOptionalResult(result, payload.value);
    }
    if (payload.value === undefined) {
      return payload;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodExactOptional = /* @__PURE__ */ $constructor("$ZodExactOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
  inst._zod.parse = (payload, ctx) => def.innerType._zod.run(payload, ctx);
});
const $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "pattern", () => {
    const {pattern} = def.innerType._zod;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : undefined;
  });
  defineLazy(inst._zod, "values", () => def.innerType._zod.values ? new Set([...def.innerType._zod.values, null]) : undefined);
  inst._zod.parse = (payload, ctx) => {
    if (payload.value === null)
      return payload;
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === undefined) {
      payload.value = def.defaultValue;
      return payload;
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleDefaultResult(result2, def));
    }
    return handleDefaultResult(result, def);
  };
});
function handleDefaultResult(payload, def) {
  if (payload.value === undefined) {
    payload.value = def.defaultValue;
  }
  return payload;
}
const $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === undefined) {
      payload.value = def.defaultValue;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => {
    const v = def.innerType._zod.values;
    return v ? new Set([...v].filter((x) => x !== undefined)) : undefined;
  });
  inst._zod.parse = (payload, ctx) => {
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleNonOptionalResult(result2, inst));
    }
    return handleNonOptionalResult(result, inst);
  };
});
function handleNonOptionalResult(payload, inst) {
  if (!payload.issues.length && payload.value === undefined) {
    payload.issues.push({
      code: "invalid_type",
      expected: "nonoptional",
      input: payload.value,
      inst
    });
  }
  return payload;
}
const $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => {
        payload.value = result2.value;
        if (result2.issues.length) {
          payload.value = def.catchValue({
            ...payload,
            error: {
              issues: result2.issues.map((iss) => finalizeIssue(iss, ctx, config()))
            },
            input: payload.value
          });
          payload.issues = [];
        }
        return payload;
      });
    }
    payload.value = result.value;
    if (result.issues.length) {
      payload.value = def.catchValue({
        ...payload,
        error: {
          issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
        },
        input: payload.value
      });
      payload.issues = [];
    }
    return payload;
  };
});
const $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => def.in._zod.values);
  defineLazy(inst._zod, "optin", () => def.in._zod.optin);
  defineLazy(inst._zod, "optout", () => def.out._zod.optout);
  defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      const right = def.out._zod.run(payload, ctx);
      if (right instanceof Promise) {
        return right.then((right2) => handlePipeResult(right2, def.in, ctx));
      }
      return handlePipeResult(right, def.in, ctx);
    }
    const left = def.in._zod.run(payload, ctx);
    if (left instanceof Promise) {
      return left.then((left2) => handlePipeResult(left2, def.out, ctx));
    }
    return handlePipeResult(left, def.out, ctx);
  };
});
function handlePipeResult(left, next, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return next._zod.run({ value: left.value, issues: left.issues }, ctx);
}
const $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
  defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then(handleReadonlyResult);
    }
    return handleReadonlyResult(result);
  };
});
function handleReadonlyResult(payload) {
  payload.value = Object.freeze(payload.value);
  return payload;
}
const $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
  $ZodCheck.init(inst, def);
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _) => payload;
  inst._zod.check = (payload) => {
    const input = payload.value;
    const r = def.fn(input);
    if (r instanceof Promise) {
      return r.then((r2) => handleRefineResult(r2, payload, input, inst));
    }
    handleRefineResult(r, payload, input, inst);
    return;
  };
});
function handleRefineResult(result, payload, input, inst) {
  if (!result) {
    const _iss = {
      code: "custom",
      input,
      inst,
      path: [...inst._zod.def.path ?? []],
      continue: !inst._zod.def.abort
    };
    if (inst._zod.def.params)
      _iss.params = inst._zod.def.params;
    payload.issues.push(issue(_iss));
  }
}
// Node_modules/zod/v4/core/registries.js
let _a;
const $output = Symbol("ZodOutput");
const $input = Symbol("ZodInput");

class $ZodRegistry {
  constructor() {
    this._map = new WeakMap;
    this._idmap = new Map;
  }
  add(schema, ..._meta) {
    const meta = _meta[0];
    this._map.set(schema, meta);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.set(meta.id, schema);
    }
    return this;
  }
  clear() {
    this._map = new WeakMap;
    this._idmap = new Map;
    return this;
  }
  remove(schema) {
    const meta = this._map.get(schema);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.delete(meta.id);
    }
    this._map.delete(schema);
    return this;
  }
  get(schema) {
    const p = schema._zod.parent;
    if (p) {
      const pm = { ...this.get(p) };
      delete pm.id;
      const f = { ...pm, ...this._map.get(schema) };
      return Object.keys(f).length ? f : undefined;
    }
    return this._map.get(schema);
  }
  has(schema) {
    return this._map.has(schema);
  }
}
function registry() {
  return new $ZodRegistry;
}
(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
const globalRegistry = globalThis.__zod_globalRegistry;
// Node_modules/zod/v4/core/api.js
function _number(Class2, params) {
  return new Class2({
    type: "number",
    checks: [],
    ...normalizeParams(params)
  });
}
function _int(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "safeint",
    ...normalizeParams(params)
  });
}
function _unknown(Class2) {
  return new Class2({
    type: "unknown"
  });
}
function _never(Class2, params) {
  return new Class2({
    type: "never",
    ...normalizeParams(params)
  });
}
function _lt(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
function _lte(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
function _gt(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
function _gte(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
function _multipleOf(value, params) {
  return new $ZodCheckMultipleOf({
    check: "multiple_of",
    ...normalizeParams(params),
    value
  });
}
function _maxLength(maximum, params) {
  const ch = new $ZodCheckMaxLength({
    check: "max_length",
    ...normalizeParams(params),
    maximum
  });
  return ch;
}
function _minLength(minimum, params) {
  return new $ZodCheckMinLength({
    check: "min_length",
    ...normalizeParams(params),
    minimum
  });
}
function _length(length, params) {
  return new $ZodCheckLengthEquals({
    check: "length_equals",
    ...normalizeParams(params),
    length
  });
}
function _overwrite(tx) {
  return new $ZodCheckOverwrite({
    check: "overwrite",
    tx
  });
}
function _array(Class2, element, params) {
  return new Class2({
    type: "array",
    element,
    ...normalizeParams(params)
  });
}
function _refine(Class2, fn, _params) {
  const schema = new Class2({
    type: "custom",
    check: "custom",
    fn,
    ...normalizeParams(_params)
  });
  return schema;
}
function _superRefine(fn) {
  const ch = _check((payload) => {
    payload.addIssue = (issue2) => {
      if (typeof issue2 === "string") {
        payload.issues.push(issue(issue2, payload.value, ch._zod.def));
      } else {
        const _issue = issue2;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = ch);
        _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
        payload.issues.push(issue(_issue));
      }
    };
    return fn(payload.value, payload);
  });
  return ch;
}
function _check(fn, params) {
  const ch = new $ZodCheck({
    check: "custom",
    ...normalizeParams(params)
  });
  ch._zod.check = fn;
  return ch;
}
// Node_modules/zod/v4/core/to-json-schema.js
function initializeContext(params) {
  let target = params?.target ?? "draft-2020-12";
  if (target === "draft-4")
    target = "draft-04";
  if (target === "draft-7")
    target = "draft-07";
  return {
    processors: params.processors ?? {},
    metadataRegistry: params?.metadata ?? globalRegistry,
    target,
    unrepresentable: params?.unrepresentable ?? "throw",
    override: params?.override ?? (() => {}),
    io: params?.io ?? "output",
    counter: 0,
    seen: new Map,
    cycles: params?.cycles ?? "ref",
    reused: params?.reused ?? "inline",
    external: params?.external ?? undefined
  };
}
function process2(schema, ctx, _params = { path: [], schemaPath: [] }) {
  let _a2;
  const {def} = schema._zod;
  const seen = ctx.seen.get(schema);
  if (seen) {
    seen.count += 1;
    const isCycle = _params.schemaPath.includes(schema);
    if (isCycle) {
      seen.cycle = _params.path;
    }
    return seen.schema;
  }
  const result = { schema: {}, count: 1, cycle: undefined, path: _params.path };
  ctx.seen.set(schema, result);
  const overrideSchema = schema._zod.toJSONSchema?.();
  if (overrideSchema) {
    result.schema = overrideSchema;
  } else {
    const params = {
      ..._params,
      schemaPath: [..._params.schemaPath, schema],
      path: _params.path
    };
    if (schema._zod.processJSONSchema) {
      schema._zod.processJSONSchema(ctx, result.schema, params);
    } else {
      const _json = result.schema;
      const processor = ctx.processors[def.type];
      if (!processor) {
        throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
      }
      processor(schema, ctx, _json, params);
    }
    const {parent} = schema._zod;
    if (parent) {
      if (!result.ref)
        result.ref = parent;
      process2(parent, ctx, params);
      ctx.seen.get(parent).isParent = true;
    }
  }
  const meta = ctx.metadataRegistry.get(schema);
  if (meta)
    Object.assign(result.schema, meta);
  if (ctx.io === "input" && isTransforming(schema)) {
    delete result.schema.examples;
    delete result.schema.default;
  }
  if (ctx.io === "input" && result.schema._prefault)
    (_a2 = result.schema).default ?? (_a2.default = result.schema._prefault);
  delete result.schema._prefault;
  const _result = ctx.seen.get(schema);
  return _result.schema;
}
function extractDefs(ctx, schema) {
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const idToSchema = new Map;
  for (const entry of ctx.seen.entries()) {
    const id = ctx.metadataRegistry.get(entry[0])?.id;
    if (id) {
      const existing = idToSchema.get(id);
      if (existing && existing !== entry[0]) {
        throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
      }
      idToSchema.set(id, entry[0]);
    }
  }
  const makeURI = (entry) => {
    const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
    if (ctx.external) {
      const externalId = ctx.external.registry.get(entry[0])?.id;
      const uriGenerator = ctx.external.uri ?? ((id2) => id2);
      if (externalId) {
        return { ref: uriGenerator(externalId) };
      }
      const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter += 1}`;
      entry[1].defId = id;
      return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}` };
    }
    if (entry[1] === root) {
      return { ref: "#" };
    }
    const uriPrefix = `#`;
    const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
    const defId = entry[1].schema.id ?? `__schema${ctx.counter += 1}`;
    return { defId, ref: defUriPrefix + defId };
  };
  const extractToDef = (entry) => {
    if (entry[1].schema.$ref) {
      return;
    }
    const seen = entry[1];
    const { ref, defId } = makeURI(entry);
    seen.def = { ...seen.schema };
    if (defId)
      seen.defId = defId;
    const schema2 = seen.schema;
    for (const key in schema2) {
      delete schema2[key];
    }
    schema2.$ref = ref;
  };
  if (ctx.cycles === "throw") {
    for (const entry of ctx.seen.entries()) {
      const seen = entry[1];
      if (seen.cycle) {
        throw new Error("Cycle detected: " + `#/${seen.cycle?.join("/")}/<root>` + '\n\nSet the `cycles` parameter to `"ref"` to resolve cyclical schemas with defs.');
      }
    }
  }
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (schema === entry[0]) {
      extractToDef(entry);
      continue;
    }
    if (ctx.external) {
      const ext = ctx.external.registry.get(entry[0])?.id;
      if (schema !== entry[0] && ext) {
        extractToDef(entry);
        continue;
      }
    }
    const id = ctx.metadataRegistry.get(entry[0])?.id;
    if (id) {
      extractToDef(entry);
      continue;
    }
    if (seen.cycle) {
      extractToDef(entry);
      continue;
    }
    if (seen.count > 1) {
      if (ctx.reused === "ref") {
        extractToDef(entry);
        continue;
      }
    }
  }
}
function finalize(ctx, schema) {
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const flattenRef = (zodSchema) => {
    const seen = ctx.seen.get(zodSchema);
    if (seen.ref === null)
      return;
    const schema2 = seen.def ?? seen.schema;
    const _cached = { ...schema2 };
    const {ref} = seen;
    seen.ref = null;
    if (ref) {
      flattenRef(ref);
      const refSeen = ctx.seen.get(ref);
      const refSchema = refSeen.schema;
      if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
        schema2.allOf = schema2.allOf ?? [];
        schema2.allOf.push(refSchema);
      } else {
        Object.assign(schema2, refSchema);
      }
      Object.assign(schema2, _cached);
      const isParentRef = zodSchema._zod.parent === ref;
      if (isParentRef) {
        for (const key in schema2) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (!(key in _cached)) {
            delete schema2[key];
          }
        }
      }
      if (refSchema.$ref && refSeen.def) {
        for (const key in schema2) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (key in refSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(refSeen.def[key])) {
            delete schema2[key];
          }
        }
      }
    }
    const {parent} = zodSchema._zod;
    if (parent && parent !== ref) {
      flattenRef(parent);
      const parentSeen = ctx.seen.get(parent);
      if (parentSeen?.schema.$ref) {
        schema2.$ref = parentSeen.schema.$ref;
        if (parentSeen.def) {
          for (const key in schema2) {
            if (key === "$ref" || key === "allOf")
              continue;
            if (key in parentSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(parentSeen.def[key])) {
              delete schema2[key];
            }
          }
        }
      }
    }
    ctx.override({
      zodSchema,
      jsonSchema: schema2,
      path: seen.path ?? []
    });
  };
  for (const entry of [...ctx.seen.entries()].toReversed()) {
    flattenRef(entry[0]);
  }
  const result = {};
  if (ctx.target === "draft-2020-12") {
    result.$schema = "https://json-schema.org/draft/2020-12/schema";
  } else if (ctx.target === "draft-07") {
    result.$schema = "http://json-schema.org/draft-07/schema#";
  } else if (ctx.target === "draft-04") {
    result.$schema = "http://json-schema.org/draft-04/schema#";
  } else 
  if (ctx.external?.uri) {
    const id = ctx.external.registry.get(schema)?.id;
    if (!id)
      throw new Error("Schema is missing an `id` property");
    result.$id = ctx.external.uri(id);
  }
  Object.assign(result, root.def ?? root.schema);
  const defs = ctx.external?.defs ?? {};
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (seen.def && seen.defId) {
      defs[seen.defId] = seen.def;
    }
  }
  
  try {
    const finalized = structuredClone(result);
    Object.defineProperty(finalized, "~standard", {
      value: {
        ...schema["~standard"],
        jsonSchema: {
          input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
          output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
        }
      },
      enumerable: false,
      writable: false
    });
    return finalized;
  } catch  {
    throw new Error("Error converting schema to JSON.", { cause: _err });
  }
}
function isTransforming(_schema, _ctx) {
  const ctx = _ctx ?? { seen: new Set };
  if (ctx.seen.has(_schema))
    return false;
  ctx.seen.add(_schema);
  const {def} = _schema._zod;
  if (def.type === "transform")
    return true;
  if (def.type === "array")
    return isTransforming(def.element, ctx);
  if (def.type === "set")
    return isTransforming(def.valueType, ctx);
  if (def.type === "lazy")
    return isTransforming(def.getter(), ctx);
  if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") {
    return isTransforming(def.innerType, ctx);
  }
  if (def.type === "intersection") {
    return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
  }
  if (def.type === "record" || def.type === "map") {
    return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
  }
  if (def.type === "pipe") {
    return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
  }
  if (def.type === "object") {
    for (const key in def.shape) {
      if (isTransforming(def.shape[key], ctx))
        return true;
    }
    return false;
  }
  if (def.type === "union") {
    for (const option of def.options) {
      if (isTransforming(option, ctx))
        return true;
    }
    return false;
  }
  if (def.type === "tuple") {
    for (const item of def.items) {
      if (isTransforming(item, ctx))
        return true;
    }
    if (def.rest && isTransforming(def.rest, ctx))
      return true;
    return false;
  }
  return false;
}
const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
  const ctx = initializeContext({ ...params, processors });
  process2(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
};
const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
  const { libraryOptions, target } = params ?? {};
  const ctx = initializeContext({ ...libraryOptions, target, io, processors });
  process2(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
};
// Node_modules/zod/v4/core/json-schema-processors.js
const numberProcessor = (schema, ctx, _json, _params) => {
  const json = _json;
  const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
  if (typeof format === "string" && format.includes("int"))
    json.type = "integer";
  else
    json.type = "number";
  if (typeof exclusiveMinimum === "number") {
    if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
      json.minimum = exclusiveMinimum;
      json.exclusiveMinimum = true;
    } else {
      json.exclusiveMinimum = exclusiveMinimum;
    }
  }
  if (typeof minimum === "number") {
    json.minimum = minimum;
    if (typeof exclusiveMinimum === "number" && ctx.target !== "draft-04") {
      if (exclusiveMinimum >= minimum)
        delete json.minimum;
      else
        delete json.exclusiveMinimum;
    }
  }
  if (typeof exclusiveMaximum === "number") {
    if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
      json.maximum = exclusiveMaximum;
      json.exclusiveMaximum = true;
    } else {
      json.exclusiveMaximum = exclusiveMaximum;
    }
  }
  if (typeof maximum === "number") {
    json.maximum = maximum;
    if (typeof exclusiveMaximum === "number" && ctx.target !== "draft-04") {
      if (exclusiveMaximum <= maximum)
        delete json.maximum;
      else
        delete json.exclusiveMaximum;
    }
  }
  if (typeof multipleOf === "number")
    json.multipleOf = multipleOf;
};
const neverProcessor = (_schema, _ctx, json, _params) => {
  json.not = {};
};
const unknownProcessor = (_schema, _ctx, _json, _params) => {};
const enumProcessor = (schema, _ctx, json, _params) => {
  const {def} = schema._zod;
  const values = getEnumValues(def.entries);
  if (values.every((v) => typeof v === "number"))
    json.type = "number";
  if (values.every((v) => typeof v === "string"))
    json.type = "string";
  json.enum = values;
};
const customProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Custom types cannot be represented in JSON Schema");
  }
};
const transformProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Transforms cannot be represented in JSON Schema");
  }
};
const arrayProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const {def} = schema._zod;
  const { minimum, maximum } = schema._zod.bag;
  if (typeof minimum === "number")
    json.minItems = minimum;
  if (typeof maximum === "number")
    json.maxItems = maximum;
  json.type = "array";
  json.items = process2(def.element, ctx, { ...params, path: [...params.path, "items"] });
};
const objectProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const {def} = schema._zod;
  json.type = "object";
  json.properties = {};
  const {shape} = def;
  for (const key in shape) {
    json.properties[key] = process2(shape[key], ctx, {
      ...params,
      path: [...params.path, "properties", key]
    });
  }
  const allKeys = new Set(Object.keys(shape));
  const requiredKeys = new Set([...allKeys].filter((key) => {
    const v = def.shape[key]._zod;
    if (ctx.io === "input") {
      return v.optin === undefined;
    }
      return v.optout === undefined;
    
  }));
  if (requiredKeys.size > 0) {
    json.required = [...requiredKeys];
  }
  if (def.catchall?._zod.def.type === "never") {
    json.additionalProperties = false;
  } else if (!def.catchall) {
    if (ctx.io === "output")
      json.additionalProperties = false;
  } else if (def.catchall) {
    json.additionalProperties = process2(def.catchall, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"]
    });
  }
};
const unionProcessor = (schema, ctx, json, params) => {
  const {def} = schema._zod;
  const isExclusive = def.inclusive === false;
  const options = def.options.map((x, i) => process2(x, ctx, {
    ...params,
    path: [...params.path, isExclusive ? "oneOf" : "anyOf", i]
  }));
  if (isExclusive) {
    json.oneOf = options;
  } else {
    json.anyOf = options;
  }
};
const intersectionProcessor = (schema, ctx, json, params) => {
  const {def} = schema._zod;
  const a = process2(def.left, ctx, {
    ...params,
    path: [...params.path, "allOf", 0]
  });
  const b = process2(def.right, ctx, {
    ...params,
    path: [...params.path, "allOf", 1]
  });
  const isSimpleIntersection = (val) => ("allOf" in val) && Object.keys(val).length === 1;
  const allOf = [
    ...isSimpleIntersection(a) ? a.allOf : [a],
    ...isSimpleIntersection(b) ? b.allOf : [b]
  ];
  json.allOf = allOf;
};
const nullableProcessor = (schema, ctx, json, params) => {
  const {def} = schema._zod;
  const inner = process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  if (ctx.target === "openapi-3.0") {
    seen.ref = def.innerType;
    json.nullable = true;
  } else {
    json.anyOf = [inner, { type: "null" }];
  }
};
const nonoptionalProcessor = (schema, ctx, _json, params) => {
  const {def} = schema._zod;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
const defaultProcessor = (schema, ctx, json, params) => {
  const {def} = schema._zod;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json.default = structuredClone(def.defaultValue);
};
const prefaultProcessor = (schema, ctx, json, params) => {
  const {def} = schema._zod;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  if (ctx.io === "input")
    json._prefault = structuredClone(def.defaultValue);
};
const catchProcessor = (schema, ctx, json, params) => {
  const {def} = schema._zod;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  let catchValue;
  try {
    catchValue = def.catchValue();
  } catch {
    throw new Error("Dynamic catch values are not supported in JSON Schema");
  }
  json.default = catchValue;
};
const pipeProcessor = (schema, ctx, _json, params) => {
  const {def} = schema._zod;
  const innerType = ctx.io === "input" ? def.in._zod.def.type === "transform" ? def.out : def.in : def.out;
  process2(innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = innerType;
};
const readonlyProcessor = (schema, ctx, json, params) => {
  const {def} = schema._zod;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json.readOnly = true;
};
const optionalProcessor = (schema, ctx, _json, params) => {
  const {def} = schema._zod;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
// Node_modules/zod/v4/classic/errors.js
const initializer2 = (inst, issues) => {
  $ZodError.init(inst, issues);
  inst.name = "ZodError";
  Object.defineProperties(inst, {
    format: {
      value: (mapper) => formatError(inst, mapper)
    },
    flatten: {
      value: (mapper) => flattenError(inst, mapper)
    },
    addIssue: {
      value: (issue2) => {
        inst.issues.push(issue2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
    },
    addIssues: {
      value: (issues2) => {
        inst.issues.push(...issues2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
    },
    isEmpty: {
      get() {
        return inst.issues.length === 0;
      }
    }
  });
};
const ZodError = $constructor("ZodError", initializer2);
const ZodRealError = $constructor("ZodError", initializer2, {
  Parent: Error
});

// Node_modules/zod/v4/classic/parse.js
const parse3 = /* @__PURE__ */ _parse(ZodRealError);
const parseAsync2 = /* @__PURE__ */ _parseAsync(ZodRealError);
const safeParse2 = /* @__PURE__ */ _safeParse(ZodRealError);
const safeParseAsync2 = /* @__PURE__ */ _safeParseAsync(ZodRealError);
const encode = /* @__PURE__ */ _encode(ZodRealError);
const decode = /* @__PURE__ */ _decode(ZodRealError);
const encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
const decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
const safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
const safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
const safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
const safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);

// Node_modules/zod/v4/classic/schemas.js
const ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
  $ZodType.init(inst, def);
  Object.assign(inst["~standard"], {
    jsonSchema: {
      input: createStandardJSONSchemaMethod(inst, "input"),
      output: createStandardJSONSchemaMethod(inst, "output")
    }
  });
  inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
  inst.def = def;
  inst.type = def.type;
  Object.defineProperty(inst, "_def", { value: def });
  inst.check = (...checks2) => inst.clone(exports_util.mergeDefs(def, {
      checks: [
        ...def.checks ?? [],
        ...checks2.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
      ]
    }), {
      parent: true
    });
  inst.with = inst.check;
  inst.clone = (def2, params) => clone(inst, def2, params);
  inst.brand = () => inst;
  inst.register = (reg, meta2) => {
    reg.add(inst, meta2);
    return inst;
  };
  inst.parse = (data, params) => parse3(inst, data, params, { callee: inst.parse });
  inst.safeParse = (data, params) => safeParse2(inst, data, params);
  inst.parseAsync = async (data, params) => parseAsync2(inst, data, params, { callee: inst.parseAsync });
  inst.safeParseAsync = async (data, params) => safeParseAsync2(inst, data, params);
  inst.spa = inst.safeParseAsync;
  inst.encode = (data, params) => encode(inst, data, params);
  inst.decode = (data, params) => decode(inst, data, params);
  inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
  inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
  inst.safeEncode = (data, params) => safeEncode(inst, data, params);
  inst.safeDecode = (data, params) => safeDecode(inst, data, params);
  inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
  inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
  inst.refine = (check, params) => inst.check(refine(check, params));
  inst.superRefine = (refinement) => inst.check(superRefine(refinement));
  inst.overwrite = (fn) => inst.check(_overwrite(fn));
  inst.optional = () => optional(inst);
  inst.exactOptional = () => exactOptional(inst);
  inst.nullable = () => nullable(inst);
  inst.nullish = () => optional(nullable(inst));
  inst.nonoptional = (params) => nonoptional(inst, params);
  inst.array = () => array(inst);
  inst.or = (arg) => union([inst, arg]);
  inst.and = (arg) => intersection(inst, arg);
  inst.transform = (tx) => pipe(inst, transform(tx));
  inst.default = (def2) => _default(inst, def2);
  inst.prefault = (def2) => prefault(inst, def2);
  inst.catch = (params) => _catch(inst, params);
  inst.pipe = (target) => pipe(inst, target);
  inst.readonly = () => readonly(inst);
  inst.describe = (description) => {
    const cl = inst.clone();
    globalRegistry.add(cl, { description });
    return cl;
  };
  Object.defineProperty(inst, "description", {
    get() {
      return globalRegistry.get(inst)?.description;
    },
    configurable: true
  });
  inst.meta = (...args) => {
    if (args.length === 0) {
      return globalRegistry.get(inst);
    }
    const cl = inst.clone();
    globalRegistry.add(cl, args[0]);
    return cl;
  };
  inst.isOptional = () => inst.safeParse().success;
  inst.isNullable = () => inst.safeParse(null).success;
  inst.apply = (fn) => fn(inst);
  return inst;
});
const ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
  $ZodNumber.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
  inst.gt = (value, params) => inst.check(_gt(value, params));
  inst.gte = (value, params) => inst.check(_gte(value, params));
  inst.min = (value, params) => inst.check(_gte(value, params));
  inst.lt = (value, params) => inst.check(_lt(value, params));
  inst.lte = (value, params) => inst.check(_lte(value, params));
  inst.max = (value, params) => inst.check(_lte(value, params));
  inst.int = (params) => inst.check(int(params));
  inst.safe = (params) => inst.check(int(params));
  inst.positive = (params) => inst.check(_gt(0, params));
  inst.nonnegative = (params) => inst.check(_gte(0, params));
  inst.negative = (params) => inst.check(_lt(0, params));
  inst.nonpositive = (params) => inst.check(_lte(0, params));
  inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
  inst.step = (value, params) => inst.check(_multipleOf(value, params));
  inst.finite = () => inst;
  const {bag} = inst._zod;
  inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
  inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
  inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? 0.5);
  inst.isFinite = true;
  inst.format = bag.format ?? null;
});
function number2(params) {
  return _number(ZodNumber, params);
}
const ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
  $ZodNumberFormat.init(inst, def);
  ZodNumber.init(inst, def);
});
function int(params) {
  return _int(ZodNumberFormat, params);
}
const ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
  $ZodUnknown.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => unknownProcessor(inst, ctx, json, params);
});
function unknown() {
  return _unknown(ZodUnknown);
}
const ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
  $ZodNever.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
});
function never(params) {
  return _never(ZodNever, params);
}
const ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
  $ZodArray.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
  inst.element = def.element;
  inst.min = (minLength, params) => inst.check(_minLength(minLength, params));
  inst.nonempty = (params) => inst.check(_minLength(1, params));
  inst.max = (maxLength, params) => inst.check(_maxLength(maxLength, params));
  inst.length = (len, params) => inst.check(_length(len, params));
  inst.unwrap = () => inst.element;
});
function array(element, params) {
  return _array(ZodArray, element, params);
}
const ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
  $ZodObjectJIT.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
  exports_util.defineLazy(inst, "shape", () => def.shape);
  inst.keyof = () => _enum(Object.keys(inst._zod.def.shape));
  inst.catchall = (catchall) => inst.clone({ ...inst._zod.def, catchall });
  inst.passthrough = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
  inst.loose = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
  inst.strict = () => inst.clone({ ...inst._zod.def, catchall: never() });
  inst.strip = () => inst.clone({ ...inst._zod.def, catchall: undefined });
  inst.extend = (incoming) => exports_util.extend(inst, incoming);
  inst.safeExtend = (incoming) => exports_util.safeExtend(inst, incoming);
  inst.merge = (other) => exports_util.merge(inst, other);
  inst.pick = (mask) => exports_util.pick(inst, mask);
  inst.omit = (mask) => exports_util.omit(inst, mask);
  inst.partial = (...args) => exports_util.partial(ZodOptional, inst, args[0]);
  inst.required = (...args) => exports_util.required(ZodNonOptional, inst, args[0]);
});
function object(shape, params) {
  const def = {
    type: "object",
    shape: shape ?? {},
    ...exports_util.normalizeParams(params)
  };
  return new ZodObject(def);
}
const ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
  $ZodUnion.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
  inst.options = def.options;
});
function union(options, params) {
  return new ZodUnion({
    type: "union",
    options,
    ...exports_util.normalizeParams(params)
  });
}
const ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
  $ZodIntersection.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
});
function intersection(left, right) {
  return new ZodIntersection({
    type: "intersection",
    left,
    right
  });
}
const ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
  $ZodEnum.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
  inst.enum = def.entries;
  inst.options = Object.values(def.entries);
  const keys = new Set(Object.keys(def.entries));
  inst.extract = (values, params) => {
    const newEntries = {};
    for (const value of values) {
      if (keys.has(value)) {
        newEntries[value] = def.entries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...exports_util.normalizeParams(params),
      entries: newEntries
    });
  };
  inst.exclude = (values, params) => {
    const newEntries = { ...def.entries };
    for (const value of values) {
      if (keys.has(value)) {
        delete newEntries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...exports_util.normalizeParams(params),
      entries: newEntries
    });
  };
});
function _enum(values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new ZodEnum({
    type: "enum",
    entries,
    ...exports_util.normalizeParams(params)
  });
}
const ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
  $ZodTransform.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
  inst._zod.parse = (payload, _ctx) => {
    if (_ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    payload.addIssue = (issue2) => {
      if (typeof issue2 === "string") {
        payload.issues.push(exports_util.issue(issue2, payload.value, def));
      } else {
        const _issue = issue2;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = inst);
        payload.issues.push(exports_util.issue(_issue));
      }
    };
    const output = def.transform(payload.value, payload);
    if (output instanceof Promise) {
      return output.then((output2) => {
        payload.value = output2;
        return payload;
      });
    }
    payload.value = output;
    return payload;
  };
});
function transform(fn) {
  return new ZodTransform({
    type: "transform",
    transform: fn
  });
}
const ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
  return new ZodOptional({
    type: "optional",
    innerType
  });
}
const ZodExactOptional = /* @__PURE__ */ $constructor("ZodExactOptional", (inst, def) => {
  $ZodExactOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function exactOptional(innerType) {
  return new ZodExactOptional({
    type: "optional",
    innerType
  });
}
const ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
  $ZodNullable.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
  return new ZodNullable({
    type: "nullable",
    innerType
  });
}
const ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
  $ZodDefault.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeDefault = inst.unwrap;
});
function _default(innerType, defaultValue) {
  return new ZodDefault({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : exports_util.shallowClone(defaultValue);
    }
  });
}
const ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
  $ZodPrefault.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
  return new ZodPrefault({
    type: "prefault",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : exports_util.shallowClone(defaultValue);
    }
  });
}
const ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
  $ZodNonOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
  return new ZodNonOptional({
    type: "nonoptional",
    innerType,
    ...exports_util.normalizeParams(params)
  });
}
const ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
  $ZodCatch.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeCatch = inst.unwrap;
});
function _catch(innerType, catchValue) {
  return new ZodCatch({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
  });
}
const ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
  $ZodPipe.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
  inst.in = def.in;
  inst.out = def.out;
});
function pipe(in_, out) {
  return new ZodPipe({
    type: "pipe",
    in: in_,
    out
  });
}
const ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
  $ZodReadonly.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
  return new ZodReadonly({
    type: "readonly",
    innerType
  });
}
const ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
  $ZodCustom.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
});
function refine(fn, _params = {}) {
  return _refine(ZodCustom, fn, _params);
}
function superRefine(fn) {
  return _superRefine(fn);
}

// Packages/betterspace/src/zod.ts
const WRAPPERS = new Set([
  "catch",
  "default",
  "nullable",
  "optional",
  "prefault",
  "readonly"
]);
const unwrapZod = (schema) => {
  let cur = schema;
  while (cur && typeof cur === "object" && "type" in cur) {
    if (!WRAPPERS.has(cur.type))
      return { def: cur.def, schema: cur, type: cur.type };
    cur = cur.def.innerType;
  }
  return { def: undefined, schema: undefined, type: "" };
};
const elementOf = (s) => s?.def?.element;
const isArrayType = (t) => t === "array";

// Packages/betterspace/src/server/bridge.ts
const idx = (fn) => fn;

// Packages/betterspace/src/server/types/common.ts
const ERROR_MESSAGES = {
  ALREADY_ORG_MEMBER: "Already a member of this organization",
  CANNOT_MODIFY_ADMIN: "Admins cannot modify other admins",
  CANNOT_MODIFY_OWNER: "Cannot modify the owner",
  CHUNK_ALREADY_UPLOADED: "Chunk already uploaded",
  CHUNK_NOT_FOUND: "Chunk not found",
  CONFLICT: "Conflict detected",
  EDITOR_REQUIRED: "Editor permission required",
  FILE_NOT_FOUND: "File not found",
  FILE_TOO_LARGE: "File too large",
  FORBIDDEN: "Forbidden",
  INCOMPLETE_UPLOAD: "Incomplete upload",
  INSUFFICIENT_ORG_ROLE: "Insufficient permissions",
  INVALID_FILE_TYPE: "Invalid file type",
  INVALID_INVITE: "Invalid invite",
  INVALID_MESSAGE: "Invalid message",
  INVALID_SESSION_STATE: "Invalid session state",
  INVALID_TOOL_ARGS: "Invalid tool arguments",
  INVALID_WHERE: "Invalid filters",
  INVITE_EXPIRED: "Invite has expired",
  JOIN_REQUEST_EXISTS: "Join request already exists",
  LIMIT_EXCEEDED: "Limit exceeded",
  MESSAGE_NOT_SAVED: "Message not saved",
  MUST_TRANSFER_OWNERSHIP: "Must transfer ownership before leaving",
  NO_FETCHER: "No fetcher configured",
  NO_PRECEDING_USER_MESSAGE: "No preceding user message",
  NOT_AUTHENTICATED: "Please log in",
  NOT_AUTHORIZED: "Not authorized",
  NOT_FOUND: "Not found",
  NOT_ORG_MEMBER: "Not a member of this organization",
  ORG_SLUG_TAKEN: "Organization slug already taken",
  RATE_LIMITED: "Too many requests",
  SESSION_NOT_FOUND: "Session not found",
  TARGET_MUST_BE_ADMIN: "Can only transfer ownership to an admin",
  UNAUTHORIZED: "Unauthorized",
  USER_NOT_FOUND: "User not found",
  VALIDATION_FAILED: "Validation failed"
};
// Packages/betterspace/src/server/helpers.ts
class SenderError extends Error {
  constructor(message) {
    super(message);
    this.name = "SenderError";
  }
}
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const log = (level, msg, data) => {
  console[level](JSON.stringify({ level, msg, ts: Date.now(), ...data }));
};
const isRecord = (v) => Boolean(v) && typeof v === "object";
const pgOpts = object({
  limit: number2().optional(),
  numItems: number2().optional(),
  offset: number2().optional()
});
const serializeError = (data) => `${data.code}:${JSON.stringify(data)}`;
const err = (code, opts) => {
  if (!opts)
    throw new SenderError(serializeError({ code }));
  if (typeof opts !== "string")
    throw new SenderError(serializeError({ code, ...opts }));
  const sep = opts.indexOf(":"), data = sep > 0 ? { code, debug: opts, op: opts.slice(sep + 1), table: opts.slice(0, sep) } : { code, debug: opts };
  throw new SenderError(serializeError(data));
};
const time2 = (timestamp) => ({ updatedAt: timestamp ?? Date.now() });
const errValidation = (code, zodError) => {
  const { fieldErrors: raw } = zodError.flatten(), fields = [], fieldErrors = {};
  for (const k of Object.keys(raw)) {
    const first = raw[k]?.[0];
    if (first) {
      fields.push(k);
      fieldErrors[k] = first;
    }
  }
  throw new SenderError(serializeError({
    code,
    fieldErrors,
    fields,
    message: fields.length ? `Invalid: ${fields.join(", ")}` : "Validation failed"
  }));
};
const checkRateLimit = async (db, opts) => {
  const { config: config2, key, table } = opts, now = opts.timestamp ?? Date.now(), existing = await db.query("rateLimit").withIndex("by_table_key", idx((q) => q.eq("table", table).eq("key", key))).first();
  if (!existing) {
    await db.insert("rateLimit", { count: 1, key, table, windowStart: now });
    return;
  }
  const windowExpired = now - existing.windowStart >= config2.window;
  if (windowExpired) {
    await db.patch(existing._id, { count: 1, windowStart: now });
    return;
  }
  if (existing.count >= config2.max) {
    const {windowStart} = existing, retryAfter = config2.window - (now - windowStart);
    return err("RATE_LIMITED", {
      debug: `${table}:create`,
      limit: { max: config2.max, remaining: 0, window: config2.window },
      op: "create",
      retryAfter,
      table
    });
  }
  await db.patch(existing._id, { count: existing.count + 1 });
};
const parseSenderMessage = (message) => {
  const sep = message.indexOf(":");
  if (sep <= 0)
    return;
  const code = message.slice(0, sep);
  if (!(code in ERROR_MESSAGES))
    return;
  const rest = message.slice(sep + 1).trim(), data = { code };
  if (rest.startsWith("{") && rest.endsWith("}")) {
    try {
      const parsed = JSON.parse(rest);
      return {
        code,
        debug: typeof parsed.debug === "string" ? parsed.debug : undefined,
        fieldErrors: isRecord(parsed.fieldErrors) ? parsed.fieldErrors : undefined,
        fields: Array.isArray(parsed.fields) ? parsed.fields : undefined,
        limit: isRecord(parsed.limit) ? parsed.limit : undefined,
        message: typeof parsed.message === "string" ? parsed.message : undefined,
        op: typeof parsed.op === "string" ? parsed.op : undefined,
        retryAfter: typeof parsed.retryAfter === "number" ? parsed.retryAfter : undefined,
        table: typeof parsed.table === "string" ? parsed.table : undefined
      };
    } catch {
      return { ...data, message: rest };
    }
  }
  return { ...data, message: rest };
};
const extractErrorData = (e) => {
  if (isRecord(e)) {
    const { data } = e;
    if (isRecord(data)) {
      const { code } = data;
      if (typeof code === "string" && code in ERROR_MESSAGES) {
        return {
          code,
          debug: typeof data.debug === "string" ? data.debug : undefined,
          fieldErrors: isRecord(data.fieldErrors) ? data.fieldErrors : undefined,
          fields: Array.isArray(data.fields) ? data.fields : undefined,
          limit: isRecord(data.limit) ? data.limit : undefined,
          message: typeof data.message === "string" ? data.message : undefined,
          op: typeof data.op === "string" ? data.op : undefined,
          retryAfter: typeof data.retryAfter === "number" ? data.retryAfter : undefined,
          table: typeof data.table === "string" ? data.table : undefined
        };
      }
    }
  }
  if (e instanceof Error)
    return parseSenderMessage(e.message);
};
const getErrorCode = (e) => extractErrorData(e)?.code;
const getErrorMessage = (e) => {
  const d = extractErrorData(e);
  if (d)
    return d.message ?? ERROR_MESSAGES[d.code];
  if (e instanceof Error)
    return e.message;
  return "Unknown error";
};
const getErrorDetail = (e) => {
  const d = extractErrorData(e);
  if (!d)
    return e instanceof Error ? e.message : "Unknown error";
  const base = d.message ?? ERROR_MESSAGES[d.code];
  let detail = d.table ? `${base} [${d.table}${d.op ? `:${d.op}` : ""}]` : base;
  if (d.retryAfter !== undefined)
    detail += ` (retry after ${d.retryAfter}ms)`;
  return detail;
};
const handleError = (e, handlers) => {
  const d = extractErrorData(e);
  if (d) {
    const handler = handlers[d.code];
    if (handler) {
      handler(d);
      return;
    }
  }
  handlers.default?.(e);
};
const ok = (value) => ({ ok: true, value });
const fail = (code, detail) => ({
  error: { code, message: ERROR_MESSAGES[code], ...detail },
  ok: false
});
const isMutationError = (e) => extractErrorData(e) !== undefined;
const isErrorCode = (e, code) => {
  const d = extractErrorData(e);
  return d?.code === code;
};
const matchError = (e, handlers) => {
  const d = extractErrorData(e);
  if (d) {
    const handler = handlers[d.code];
    if (handler)
      return handler(d);
  }
  return handlers._?.(e);
};
// Packages/betterspace/src/server/middleware.ts
const withOp = (ctx, op) => ({ ...ctx, operation: op });
const composeMiddleware = (...middlewares) => {
  const hooks = {}, hasBeforeCreate = middlewares.some((mw) => mw.beforeCreate), hasAfterCreate = middlewares.some((mw) => mw.afterCreate), hasBeforeUpdate = middlewares.some((mw) => mw.beforeUpdate), hasAfterUpdate = middlewares.some((mw) => mw.afterUpdate), hasBeforeDelete = middlewares.some((mw) => mw.beforeDelete), hasAfterDelete = middlewares.some((mw) => mw.afterDelete);
  if (hasBeforeCreate)
    hooks.beforeCreate = async (ctx, args) => {
      let { data } = args;
      const mCtx = withOp(ctx, "create");
      for (const mw of middlewares)
        if (mw.beforeCreate)
          data = await mw.beforeCreate(mCtx, { data });
      return data;
    };
  if (hasAfterCreate)
    hooks.afterCreate = async (ctx, args) => {
      const mCtx = withOp(ctx, "create");
      for (const mw of middlewares)
        if (mw.afterCreate)
          await mw.afterCreate(mCtx, args);
    };
  if (hasBeforeUpdate)
    hooks.beforeUpdate = async (ctx, args) => {
      let { patch } = args;
      const mCtx = withOp(ctx, "update");
      for (const mw of middlewares)
        if (mw.beforeUpdate)
          patch = await mw.beforeUpdate(mCtx, { patch, prev: args.prev });
      return patch;
    };
  if (hasAfterUpdate)
    hooks.afterUpdate = async (ctx, args) => {
      const mCtx = withOp(ctx, "update");
      for (const mw of middlewares)
        if (mw.afterUpdate)
          await mw.afterUpdate(mCtx, args);
    };
  if (hasBeforeDelete)
    hooks.beforeDelete = async (ctx, args) => {
      const mCtx = withOp(ctx, "delete");
      for (const mw of middlewares)
        if (mw.beforeDelete)
          await mw.beforeDelete(mCtx, args);
    };
  if (hasAfterDelete)
    hooks.afterDelete = async (ctx, args) => {
      const mCtx = withOp(ctx, "delete");
      for (const mw of middlewares)
        if (mw.afterDelete)
          await mw.afterDelete(mCtx, args);
    };
  return hooks;
};
const auditLog = (opts) => {
  const level = opts?.logLevel ?? "info", verbose = opts?.verbose ?? false;
  return {
    afterCreate: (ctx, { data, row }) => {
      const entry = { op: "create", row, sender: ctx.sender.toString(), table: ctx.table };
      if (verbose)
        entry.data = data;
      log(level, "audit:create", entry);
    },
    afterDelete: (ctx, { row }) => {
      log(level, "audit:delete", { op: "delete", row, sender: ctx.sender.toString(), table: ctx.table });
    },
    afterUpdate: (ctx, { patch, prev }) => {
      const entry = { op: "update", prev, sender: ctx.sender.toString(), table: ctx.table };
      if (verbose)
        entry.fields = Object.keys(patch);
      log(level, "audit:update", entry);
    },
    name: "auditLog"
  };
};
const DEFAULT_SLOW_THRESHOLD_MS = 500;
const slowQueryWarn = (opts) => {
  const threshold = opts?.threshold ?? DEFAULT_SLOW_THRESHOLD_MS;
  return {
    afterCreate: (ctx, { row }) => {
      const dur = Date.now() - (ctx._mwStart ?? Date.now());
      if (dur > threshold)
        log("warn", "slow:create", { durationMs: dur, row, table: ctx.table, threshold });
    },
    afterDelete: (ctx, { row }) => {
      const dur = Date.now() - (ctx._mwStart ?? Date.now());
      if (dur > threshold)
        log("warn", "slow:delete", { durationMs: dur, row, table: ctx.table, threshold });
    },
    afterUpdate: (ctx, { prev }) => {
      const dur = Date.now() - (ctx._mwStart ?? Date.now());
      if (dur > threshold)
        log("warn", "slow:update", { durationMs: dur, prev, table: ctx.table, threshold });
    },
    beforeCreate: (ctx, { data }) => {
      ctx._mwStart = Date.now();
      return data;
    },
    beforeDelete: (ctx) => {
      ctx._mwStart = Date.now();
    },
    beforeUpdate: (ctx, { patch }) => {
      ctx._mwStart = Date.now();
      return patch;
    },
    name: "slowQueryWarn"
  };
};
const SCRIPT_TAG_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/giu;
const EVENT_HANDLER_PATTERN = /\bon\w+\s*=/giu;
const sanitizeString = (val) => val.replace(SCRIPT_TAG_PATTERN, "").replace(EVENT_HANDLER_PATTERN, "");
const sanitizeRec = (data) => {
  const result = {};
  for (const key of Object.keys(data)) {
    const v = data[key];
    result[key] = typeof v === "string" ? sanitizeString(v) : v;
  }
  return result;
};
const inputSanitize = (opts) => {
  const targetFields = opts?.fields ? new Set(opts.fields) : undefined;
  return {
    beforeCreate: (_ctx, { data }) => {
      if (targetFields) {
        const result = { ...data };
        for (const f of targetFields)
          if (typeof result[f] === "string")
            result[f] = sanitizeString(result[f]);
        return result;
      }
      return sanitizeRec(data);
    },
    beforeUpdate: (_ctx, { patch }) => {
      if (targetFields) {
        const result = { ...patch };
        for (const f of targetFields)
          if (typeof result[f] === "string")
            result[f] = sanitizeString(result[f]);
        return result;
      }
      return sanitizeRec(patch);
    },
    name: "inputSanitize"
  };
};
// Packages/betterspace/src/server/org-invites.ts
const DAY_HOURS = 24;
const DAYS_PER_WEEK2 = 7;
const MILLIS_PER_SECOND2 = 1000;
const MINUTES_PER_HOUR2 = 60;
const SECONDS_PER_MINUTE2 = 60;
const SEVEN_DAYS_MS2 = DAYS_PER_WEEK2 * DAY_HOURS * MINUTES_PER_HOUR2 * SECONDS_PER_MINUTE2 * MILLIS_PER_SECOND2;
const TOKEN_BASE = 36;
const makeInviteToken = () => {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function")
    return cryptoApi.randomUUID();
  const part = Date.now().toString(TOKEN_BASE);
  return `${part}${part}${part}${part}`.slice(0, 32);
};
const findOrgMember = (orgMemberTable, orgId, userId) => {
  for (const member of orgMemberTable)
    if (Object.is(member.orgId, orgId) && identityEquals(member.userId, userId))
      return member;
  return null;
};
const getRole = (org, member, sender) => {
  if (identityEquals(org.userId, sender))
    return "owner";
  if (!member)
    return null;
  if (member.isAdmin)
    return "admin";
  return "member";
};
const requireAdminRole = ({
  operation,
  org,
  orgMemberTable,
  sender
}) => {
  const member = findOrgMember(orgMemberTable, org.id, sender), role = getRole(org, member, sender);
  if (!role)
    throw makeError("NOT_ORG_MEMBER", `org:${operation}`);
  if (role === "member")
    throw makeError("FORBIDDEN", `org:${operation}`);
};
const findInviteByToken = (inviteByTokenIndex, token) => {
  if (inviteByTokenIndex && typeof inviteByTokenIndex.find === "function") {
    const found = inviteByTokenIndex.find(token);
    return found ?? null;
  }
  if (inviteByTokenIndex && typeof inviteByTokenIndex[Symbol.iterator] === "function") {
    for (const invite of inviteByTokenIndex)
      if (invite.token === token)
        return invite;
  }
  return null;
};
const findPendingJoinRequest = (byOrgStatusIndex, orgId, userId) => {
  const pendingRows = byOrgStatusIndex.filterByOrgStatus(orgId, "pending");
  for (const request of pendingRows)
    if (identityEquals(request.userId, userId))
      return request;
  return null;
};
const resolveAcceptedInvite = ({
  inviteByTokenIndex,
  orgMemberTable,
  orgPk,
  sender,
  token
}) => {
  const invite = findInviteByToken(inviteByTokenIndex, token);
  if (!invite)
    throw makeError("INVALID_INVITE", "org:accept_invite");
  if (invite.expiresAt < Date.now())
    throw makeError("INVITE_EXPIRED", "org:accept_invite");
  const org = orgPk.find(invite.orgId);
  if (!org)
    throw makeError("NOT_FOUND", "org:accept_invite");
  if (identityEquals(org.userId, sender))
    throw makeError("ALREADY_ORG_MEMBER", "org:accept_invite");
  const existingMember = findOrgMember(orgMemberTable, invite.orgId, sender);
  if (existingMember)
    throw makeError("ALREADY_ORG_MEMBER", "org:accept_invite");
  return { invite, org };
};
const completeInviteAcceptance = ({
  invite,
  orgInvitePk,
  orgMemberTable,
  requestByOrgStatus,
  requestPk,
  sender,
  timestamp
}) => {
  const pendingRequest = findPendingJoinRequest(requestByOrgStatus, invite.orgId, sender);
  if (pendingRequest)
    requestPk.update({ ...pendingRequest, status: "approved" });
  orgMemberTable.insert({
    id: 0,
    isAdmin: invite.isAdmin,
    orgId: invite.orgId,
    updatedAt: timestamp,
    userId: sender
  });
  const removed = orgInvitePk.delete(invite.id);
  if (!removed)
    throw makeError("NOT_FOUND", "org:accept_invite");
};
const acceptInvite = ({
  ctx,
  inviteByTokenIndex,
  orgInvitePk,
  orgMemberTable,
  orgPk,
  requestByOrgStatus,
  requestPk,
  token
}) => {
  const { invite } = resolveAcceptedInvite({ inviteByTokenIndex, orgMemberTable, orgPk, sender: ctx.sender, token });
  completeInviteAcceptance({
    invite,
    orgInvitePk,
    orgMemberTable,
    requestByOrgStatus,
    requestPk,
    sender: ctx.sender,
    timestamp: ctx.timestamp
  });
};
const makeInviteReducers = (spacetimedb, config2) => {
  const inviteReducer = spacetimedb.reducer({ name: "org_send_invite" }, {
    email: config2.builders.email,
    isAdmin: config2.builders.isAdmin,
    orgId: config2.builders.orgId
  }, (ctx, args) => {
    const orgTable = config2.orgTable(ctx.db), orgPk = config2.orgPk(orgTable), orgMemberTable = config2.orgMemberTable(ctx.db), orgInviteTable = config2.orgInviteTable(ctx.db), org = orgPk.find(args.orgId);
    if (!org)
      throw makeError("NOT_FOUND", "org:invite");
    requireAdminRole({ operation: "invite", org, orgMemberTable, sender: ctx.sender });
    orgInviteTable.insert({
      email: args.email,
      expiresAt: Date.now() + SEVEN_DAYS_MS2,
      id: 0,
      isAdmin: args.isAdmin,
      orgId: args.orgId,
      token: makeInviteToken()
    });
  }), acceptInviteReducer = spacetimedb.reducer({ name: "org_accept_invite" }, { token: config2.builders.token }, (ctx, args) => {
    const orgTable = config2.orgTable(ctx.db), orgInviteTable = config2.orgInviteTable(ctx.db), orgJoinRequestTable = config2.orgJoinRequestTable(ctx.db);
    acceptInvite({
      ctx,
      inviteByTokenIndex: config2.orgInviteByTokenIndex(orgInviteTable),
      orgInvitePk: config2.orgInvitePk(orgInviteTable),
      orgMemberTable: config2.orgMemberTable(ctx.db),
      orgPk: config2.orgPk(orgTable),
      requestByOrgStatus: config2.orgJoinRequestByOrgStatusIndex(orgJoinRequestTable),
      requestPk: config2.orgJoinRequestPk(orgJoinRequestTable),
      token: args.token
    });
  }), revokeInviteReducer = spacetimedb.reducer({ name: "org_revoke_invite" }, { inviteId: config2.builders.inviteId }, (ctx, args) => {
    const orgTable = config2.orgTable(ctx.db), orgPk = config2.orgPk(orgTable), orgMemberTable = config2.orgMemberTable(ctx.db), orgInviteTable = config2.orgInviteTable(ctx.db), orgInvitePk = config2.orgInvitePk(orgInviteTable), invite = orgInvitePk.find(args.inviteId);
    if (!invite)
      throw makeError("NOT_FOUND", "org:revoke_invite");
    const org = orgPk.find(invite.orgId);
    if (!org)
      throw makeError("NOT_FOUND", "org:revoke_invite");
    requireAdminRole({ operation: "revoke_invite", org, orgMemberTable, sender: ctx.sender });
    const removed = orgInvitePk.delete(args.inviteId);
    if (!removed)
      throw makeError("NOT_FOUND", "org:revoke_invite");
  });
  return {
    exports: {
      org_accept_invite: acceptInviteReducer,
      org_send_invite: inviteReducer,
      org_revoke_invite: revokeInviteReducer
    }
  };
};

// Packages/betterspace/src/server/org-join.ts
const findOrgMember2 = (orgMemberTable, orgId, userId) => {
  for (const member of orgMemberTable)
    if (Object.is(member.orgId, orgId) && identityEquals(member.userId, userId))
      return member;
  return null;
};
const getRole2 = (org, member, sender) => {
  if (identityEquals(org.userId, sender))
    return "owner";
  if (!member)
    return null;
  if (member.isAdmin)
    return "admin";
  return "member";
};
const requireAdminRole2 = ({
  operation,
  org,
  orgMemberTable,
  sender
}) => {
  const member = findOrgMember2(orgMemberTable, org.id, sender), role = getRole2(org, member, sender);
  if (!role)
    throw makeError("NOT_ORG_MEMBER", `org:${operation}`);
  if (role === "member")
    throw makeError("FORBIDDEN", `org:${operation}`);
};
const findPendingJoinRequestByUser = (byOrgStatusIndex, orgId, userId) => {
  const pendingRequests = byOrgStatusIndex.filterByOrgStatus(orgId, "pending");
  for (const request of pendingRequests)
    if (identityEquals(request.userId, userId))
      return request;
  return null;
};
const makeJoinReducers = (spacetimedb, config2) => {
  const requestJoinReducer = spacetimedb.reducer({ name: "org_request_join" }, {
    message: config2.builders.message.optional(),
    orgId: config2.builders.orgId
  }, (ctx, args) => {
    const orgTable = config2.orgTable(ctx.db), orgPk = config2.orgPk(orgTable), orgMemberTable = config2.orgMemberTable(ctx.db), orgJoinRequestTable = config2.orgJoinRequestTable(ctx.db), joinByOrgStatusIndex = config2.orgJoinRequestByOrgStatusIndex(orgJoinRequestTable), org = orgPk.find(args.orgId);
    if (!org)
      throw makeError("NOT_FOUND", "org:request_join");
    if (identityEquals(org.userId, ctx.sender))
      throw makeError("ALREADY_ORG_MEMBER", "org:request_join");
    const existingMember = findOrgMember2(orgMemberTable, args.orgId, ctx.sender);
    if (existingMember)
      throw makeError("ALREADY_ORG_MEMBER", "org:request_join");
    const existingRequest = findPendingJoinRequestByUser(joinByOrgStatusIndex, args.orgId, ctx.sender);
    if (existingRequest)
      throw makeError("JOIN_REQUEST_EXISTS", "org:request_join");
    orgJoinRequestTable.insert({
      id: 0,
      message: args.message,
      orgId: args.orgId,
      status: "pending",
      userId: ctx.sender
    });
  }), approveJoinReducer = spacetimedb.reducer({ name: "org_approve_join" }, {
    isAdmin: config2.builders.isAdmin.optional(),
    requestId: config2.builders.requestId
  }, (ctx, args) => {
    const orgTable = config2.orgTable(ctx.db), orgPk = config2.orgPk(orgTable), orgMemberTable = config2.orgMemberTable(ctx.db), orgJoinRequestTable = config2.orgJoinRequestTable(ctx.db), orgJoinRequestPk = config2.orgJoinRequestPk(orgJoinRequestTable), request = orgJoinRequestPk.find(args.requestId);
    if (!request)
      throw makeError("NOT_FOUND", "org:approve_join");
    if (request.status !== "pending")
      throw makeError("NOT_FOUND", "org:approve_join");
    const org = orgPk.find(request.orgId);
    if (!org)
      throw makeError("NOT_FOUND", "org:approve_join");
    requireAdminRole2({ operation: "approve_join", org, orgMemberTable, sender: ctx.sender });
    orgJoinRequestPk.update({
      ...request,
      status: "approved"
    });
    orgMemberTable.insert({
      id: 0,
      isAdmin: args.isAdmin ?? false,
      orgId: request.orgId,
      userId: request.userId
    });
  }), rejectJoinReducer = spacetimedb.reducer({ name: "org_reject_join" }, { requestId: config2.builders.requestId }, (ctx, args) => {
    const orgTable = config2.orgTable(ctx.db), orgPk = config2.orgPk(orgTable), orgMemberTable = config2.orgMemberTable(ctx.db), orgJoinRequestTable = config2.orgJoinRequestTable(ctx.db), orgJoinRequestPk = config2.orgJoinRequestPk(orgJoinRequestTable), request = orgJoinRequestPk.find(args.requestId);
    if (!request)
      throw makeError("NOT_FOUND", "org:reject_join");
    if (request.status !== "pending")
      throw makeError("NOT_FOUND", "org:reject_join");
    const org = orgPk.find(request.orgId);
    if (!org)
      throw makeError("NOT_FOUND", "org:reject_join");
    requireAdminRole2({ operation: "reject_join", org, orgMemberTable, sender: ctx.sender });
    orgJoinRequestPk.update({
      ...request,
      status: "rejected"
    });
  }), cancelJoinReducer = spacetimedb.reducer({ name: "org_cancel_join" }, { requestId: config2.builders.requestId }, (ctx, args) => {
    const orgJoinRequestTable = config2.orgJoinRequestTable(ctx.db), orgJoinRequestPk = config2.orgJoinRequestPk(orgJoinRequestTable), request = orgJoinRequestPk.find(args.requestId);
    if (!request)
      throw makeError("NOT_FOUND", "org:cancel_join");
    if (!identityEquals(request.userId, ctx.sender))
      throw makeError("FORBIDDEN", "org:cancel_join");
    if (request.status !== "pending")
      throw makeError("NOT_FOUND", "org:cancel_join");
    const removed = orgJoinRequestPk.delete(args.requestId);
    if (!removed)
      throw makeError("NOT_FOUND", "org:cancel_join");
  });
  return {
    exports: {
      org_approve_join: approveJoinReducer,
      org_cancel_join: cancelJoinReducer,
      org_reject_join: rejectJoinReducer,
      org_request_join: requestJoinReducer
    }
  };
};

// Packages/betterspace/src/server/org-members.ts
const findOrgMember3 = (orgMemberTable, orgId, userId) => {
  for (const member of orgMemberTable)
    if (Object.is(member.orgId, orgId) && identityEquals(member.userId, userId))
      return member;
  return null;
};
const getRole3 = (org, member, sender) => {
  if (identityEquals(org.userId, sender))
    return "owner";
  if (!member)
    return null;
  if (member.isAdmin)
    return "admin";
  return "member";
};
const requireRole = ({
  minRole,
  operation,
  org,
  orgMemberTable,
  sender,
  tableName
}) => {
  const member = findOrgMember3(orgMemberTable, org.id, sender), role = getRole3(org, member, sender);
  if (!role)
    throw makeError("NOT_ORG_MEMBER", `${tableName}:${operation}`);
  if (minRole === "owner" && role !== "owner")
    throw makeError("FORBIDDEN", `${tableName}:${operation}`);
  if (minRole === "admin" && role === "member")
    throw makeError("FORBIDDEN", `${tableName}:${operation}`);
  return role;
};
const makeMemberReducers = (spacetimedb, config2) => {
  const setAdminReducer = spacetimedb.reducer({ name: "org_set_admin" }, { isAdmin: config2.builders.isAdmin, memberId: config2.builders.memberId }, (ctx, args) => {
    const orgTable = config2.orgTable(ctx.db), orgPk = config2.orgPk(orgTable), orgMemberTable = config2.orgMemberTable(ctx.db), orgMemberPk = config2.orgMemberPk(orgMemberTable), member = orgMemberPk.find(args.memberId);
    if (!member)
      throw makeError("NOT_FOUND", "org:set_admin");
    const org = orgPk.find(member.orgId);
    if (!org)
      throw makeError("NOT_FOUND", "org:set_admin");
    requireRole({
      minRole: "owner",
      operation: "set_admin",
      org,
      orgMemberTable,
      sender: ctx.sender,
      tableName: "org"
    });
    if (identityEquals(member.userId, org.userId))
      throw makeError("CANNOT_MODIFY_OWNER", "org:set_admin");
    orgMemberPk.update({
      ...member,
      isAdmin: args.isAdmin,
      updatedAt: ctx.timestamp
    });
  }), removeMemberReducer = spacetimedb.reducer({ name: "org_remove_member" }, { memberId: config2.builders.memberId }, (ctx, args) => {
    const orgTable = config2.orgTable(ctx.db), orgPk = config2.orgPk(orgTable), orgMemberTable = config2.orgMemberTable(ctx.db), orgMemberPk = config2.orgMemberPk(orgMemberTable), member = orgMemberPk.find(args.memberId);
    if (!member)
      throw makeError("NOT_FOUND", "org:remove_member");
    const org = orgPk.find(member.orgId);
    if (!org)
      throw makeError("NOT_FOUND", "org:remove_member");
    if (identityEquals(member.userId, org.userId))
      throw makeError("CANNOT_MODIFY_OWNER", "org:remove_member");
    const actorRole = requireRole({
      minRole: "admin",
      operation: "remove_member",
      org,
      orgMemberTable,
      sender: ctx.sender,
      tableName: "org"
    });
    if (actorRole === "admin" && member.isAdmin)
      throw makeError("CANNOT_MODIFY_ADMIN", "org:remove_member");
    const removed = orgMemberPk.delete(args.memberId);
    if (!removed)
      throw makeError("NOT_FOUND", "org:remove_member");
  }), leaveReducer = spacetimedb.reducer({ name: "org_leave" }, { orgId: config2.builders.orgId }, (ctx, args) => {
    const orgTable = config2.orgTable(ctx.db), orgPk = config2.orgPk(orgTable), orgMemberTable = config2.orgMemberTable(ctx.db), orgMemberPk = config2.orgMemberPk(orgMemberTable), org = orgPk.find(args.orgId);
    if (!org)
      throw makeError("NOT_FOUND", "org:leave");
    if (identityEquals(org.userId, ctx.sender))
      throw makeError("MUST_TRANSFER_OWNERSHIP", "org:leave");
    const member = findOrgMember3(orgMemberTable, args.orgId, ctx.sender);
    if (!member)
      throw makeError("NOT_ORG_MEMBER", "org:leave");
    const removed = orgMemberPk.delete(member.id);
    if (!removed)
      throw makeError("NOT_FOUND", "org:leave");
  }), transferOwnershipReducer = spacetimedb.reducer({ name: "org_transfer_ownership" }, {
    newOwnerId: config2.builders.newOwnerId,
    orgId: config2.builders.orgId
  }, (ctx, args) => {
    const orgTable = config2.orgTable(ctx.db), orgPk = config2.orgPk(orgTable), orgMemberTable = config2.orgMemberTable(ctx.db), orgMemberPk = config2.orgMemberPk(orgMemberTable), org = orgPk.find(args.orgId);
    if (!org)
      throw makeError("NOT_FOUND", "org:transfer_ownership");
    requireRole({
      minRole: "owner",
      operation: "transfer_ownership",
      org,
      orgMemberTable,
      sender: ctx.sender,
      tableName: "org"
    });
    const targetMember = findOrgMember3(orgMemberTable, args.orgId, args.newOwnerId);
    if (!targetMember)
      throw makeError("NOT_ORG_MEMBER", "org:transfer_ownership");
    if (!targetMember.isAdmin)
      throw makeError("TARGET_MUST_BE_ADMIN", "org:transfer_ownership");
    orgPk.update({
      ...org,
      updatedAt: ctx.timestamp,
      userId: args.newOwnerId
    });
    const removed = orgMemberPk.delete(targetMember.id);
    if (!removed)
      throw makeError("NOT_FOUND", "org:transfer_ownership");
    orgMemberTable.insert({
      id: 0,
      isAdmin: true,
      orgId: args.orgId,
      updatedAt: ctx.timestamp,
      userId: ctx.sender
    });
  });
  return {
    exports: {
      org_leave: leaveReducer,
      org_remove_member: removeMemberReducer,
      org_set_admin: setAdminReducer,
      org_transfer_ownership: transferOwnershipReducer
    }
  };
};

// Packages/betterspace/src/server/org.ts
const makeOptionalFields2 = (fields) => {
  const optionalFields = {}, keys = Object.keys(fields);
  for (const key of keys) {
    const field = fields[key];
    if (typeof field.optional === "function")
      optionalFields[key] = field.optional();
  }
  return optionalFields;
};
const findOrgBySlug = (slugIndex, slug) => {
  if (slugIndex && typeof slugIndex.find === "function") {
    const found = slugIndex.find(slug);
    return found ?? null;
  }
  if (slugIndex && typeof slugIndex[Symbol.iterator] === "function") {
    for (const org of slugIndex)
      if (org.slug === slug)
        return org;
  }
  return null;
};
const findOrgMember4 = (orgMemberTable, orgId, userId) => {
  for (const member of orgMemberTable)
    if (Object.is(member.orgId, orgId) && identityEquals(member.userId, userId))
      return member;
  return null;
};
const getRole4 = (org, member, sender) => {
  if (identityEquals(org.userId, sender))
    return "owner";
  if (!member)
    return null;
  if (member.isAdmin)
    return "admin";
  return "member";
};
const requireRole2 = ({
  minRole,
  operation,
  org,
  orgMemberTable,
  sender
}) => {
  const member = findOrgMember4(orgMemberTable, org.id, sender), role = getRole4(org, member, sender);
  if (!role)
    throw makeError("NOT_ORG_MEMBER", `org:${operation}`);
  if (minRole === "owner" && role !== "owner")
    throw makeError("FORBIDDEN", `org:${operation}`);
  if (minRole === "admin" && role === "member")
    throw makeError("FORBIDDEN", `org:${operation}`);
};
const applyOrgUpdate = (opts) => {
  requireRole2({
    minRole: "admin",
    operation: "update",
    org: opts.org,
    orgMemberTable: opts.orgMemberTable,
    sender: opts.sender
  });
  const nextSlugValue = opts.args.slug;
  if (typeof nextSlugValue === "string" && nextSlugValue !== opts.org.slug) {
    const existing = findOrgBySlug(opts.orgSlugIndex, nextSlugValue);
    if (existing && !Object.is(existing.id, opts.org.id))
      throw makeError("ORG_SLUG_TAKEN", "org:update");
  }
  const nextRecord = { ...opts.org, updatedAt: opts.timestamp }, argKeys = Object.keys(opts.args);
  for (const key of argKeys)
    if (key !== "orgId") {
      const value = opts.args[key];
      if (value !== undefined)
        nextRecord[key] = value;
    }
  opts.orgPk.update(nextRecord);
};
const removeByPk = (rows, pk, message) => {
  for (const row of rows) {
    const removed = pk.delete(row.id);
    if (!removed)
      throw makeError("NOT_FOUND", message);
  }
};
const removeCascadeRows = (cascadeTables, db, orgId) => {
  if (!cascadeTables)
    return;
  for (const cascadeTable of cascadeTables)
    for (const row of cascadeTable.rowsByOrg(db, orgId)) {
      const removed = cascadeTable.deleteById(db, row.id);
      if (!removed)
        throw makeError("NOT_FOUND", "org:remove_cascade");
    }
};
const removeMembersByOrg = (memberByOrgIndex, orgId, orgMemberTable) => {
  for (const member of memberByOrgIndex.filterByOrg(orgId)) {
    const removed = orgMemberTable.delete(member);
    if (!removed)
      throw makeError("NOT_FOUND", "org:remove_member");
  }
};
const mergeReducerExports = (...parts) => {
  const exportsRecord = {};
  for (const part of parts) {
    const names = Object.keys(part.exports);
    for (const name of names) {
      const reducer = part.exports[name];
      if (reducer)
        exportsRecord[name] = reducer;
    }
  }
  return { exports: exportsRecord };
};
const makeOrg = (spacetimedb, config2) => {
  const orgFields = config2.fields, optionalOrgFields = makeOptionalFields2(orgFields), updateParams = {
    orgId: config2.builders.orgId
  }, optionalKeys2 = Object.keys(optionalOrgFields);
  for (const key of optionalKeys2) {
    const field = optionalOrgFields[key];
    if (field)
      updateParams[key] = field;
  }
  const createReducer = spacetimedb.reducer({ name: "org_create" }, orgFields, (ctx, args) => {
    const orgTable = config2.orgTable(ctx.db), orgMemberTable = config2.orgMemberTable(ctx.db), orgSlugIndex = config2.orgSlugIndex(orgTable), { slug } = args;
    if (typeof slug !== "string")
      throw makeError("VALIDATION_FAILED", "org:create_slug");
    const existing = findOrgBySlug(orgSlugIndex, slug);
    if (existing)
      throw makeError("ORG_SLUG_TAKEN", "org:create");
    const payload = {
      ...args,
      id: 0,
      updatedAt: ctx.timestamp,
      userId: ctx.sender
    };
    orgTable.insert(payload);
    const createdOrg = findOrgBySlug(orgSlugIndex, slug);
    const createdOrgId = createdOrg ? createdOrg.id : payload.id;
    orgMemberTable.insert({
      id: 0,
      isAdmin: true,
      orgId: createdOrgId,
      updatedAt: ctx.timestamp,
      userId: ctx.sender
    });
  }), updateReducer = spacetimedb.reducer({ name: "org_update" }, updateParams, (ctx, args) => {
    const orgTable = config2.orgTable(ctx.db), orgPk = config2.orgPk(orgTable), orgMemberTable = config2.orgMemberTable(ctx.db), orgSlugIndex = config2.orgSlugIndex(orgTable), org = orgPk.find(args.orgId);
    if (!org)
      throw makeError("NOT_FOUND", "org:update");
    applyOrgUpdate({ args, org, orgMemberTable, orgPk, orgSlugIndex, sender: ctx.sender, timestamp: ctx.timestamp });
  }), removeReducer = spacetimedb.reducer({ name: "org_remove" }, { orgId: config2.builders.orgId }, (ctx, args) => {
    const orgTable = config2.orgTable(ctx.db), orgPk = config2.orgPk(orgTable), orgMemberTable = config2.orgMemberTable(ctx.db), orgInviteTable = config2.orgInviteTable(ctx.db), orgInvitePk = config2.orgInvitePk(orgInviteTable), orgJoinRequestTable = config2.orgJoinRequestTable(ctx.db), orgJoinRequestPk = config2.orgJoinRequestPk(orgJoinRequestTable), org = orgPk.find(args.orgId);
    if (!org)
      throw makeError("NOT_FOUND", "org:remove");
    requireRole2({ minRole: "owner", operation: "remove", org, orgMemberTable, sender: ctx.sender });
    removeCascadeRows(config2.cascadeTables, ctx.db, args.orgId);
    const joinByOrg = config2.orgJoinRequestByOrgIndex(orgJoinRequestTable), inviteByOrg = config2.orgInviteByOrgIndex(orgInviteTable), memberByOrg = config2.orgMemberByOrgIndex(orgMemberTable);
    removeByPk(joinByOrg.filterByOrg(args.orgId), orgJoinRequestPk, "org:remove_join_request");
    removeByPk(inviteByOrg.filterByOrg(args.orgId), orgInvitePk, "org:remove_invite");
    removeMembersByOrg(memberByOrg, args.orgId, orgMemberTable);
    if (!orgPk.delete(args.orgId))
      throw makeError("NOT_FOUND", "org:remove");
  }), memberReducers = makeMemberReducers(spacetimedb, {
    builders: {
      isAdmin: config2.builders.isAdmin,
      memberId: config2.builders.memberId,
      newOwnerId: config2.builders.newOwnerId,
      orgId: config2.builders.orgId
    },
    orgMemberPk: config2.orgMemberPk,
    orgMemberTable: config2.orgMemberTable,
    orgPk: config2.orgPk,
    orgTable: config2.orgTable
  }), inviteReducers = makeInviteReducers(spacetimedb, {
    builders: {
      email: config2.builders.email,
      inviteId: config2.builders.inviteId,
      isAdmin: config2.builders.isAdmin,
      orgId: config2.builders.orgId,
      token: config2.builders.token
    },
    orgInviteByTokenIndex: config2.orgInviteByTokenIndex,
    orgInvitePk: config2.orgInvitePk,
    orgInviteTable: config2.orgInviteTable,
    orgJoinRequestByOrgStatusIndex: config2.orgJoinRequestByOrgStatusIndex,
    orgJoinRequestPk: config2.orgJoinRequestPk,
    orgJoinRequestTable: config2.orgJoinRequestTable,
    orgMemberTable: config2.orgMemberTable,
    orgPk: config2.orgPk,
    orgTable: config2.orgTable
  }), joinReducers = makeJoinReducers(spacetimedb, {
    builders: {
      isAdmin: config2.builders.isAdmin,
      message: config2.builders.message,
      orgId: config2.builders.orgId,
      requestId: config2.builders.requestId
    },
    orgJoinRequestByOrgStatusIndex: config2.orgJoinRequestByOrgStatusIndex,
    orgJoinRequestPk: config2.orgJoinRequestPk,
    orgJoinRequestTable: config2.orgJoinRequestTable,
    orgMemberTable: config2.orgMemberTable,
    orgPk: config2.orgPk,
    orgTable: config2.orgTable
  }), lifecycleReducers = {
    exports: {
      org_create: createReducer,
      org_remove: removeReducer,
      org_update: updateReducer
    }
  };
  return mergeReducerExports(lifecycleReducers, memberReducers, inviteReducers, joinReducers);
};
// Packages/betterspace/src/server/org-crud.ts
const applyOrgPatch = (row, patch, timestamp) => {
  const nextRecord = { ...row }, patchKeys = Object.keys(patch);
  for (const key of patchKeys)
    nextRecord[key] = patch[key];
  nextRecord.updatedAt = timestamp;
  return nextRecord;
};
const checkMembership = (orgMemberTable, orgId, sender) => {
  for (const member of orgMemberTable)
    if (Object.is(member.orgId, orgId) && identityEquals(member.userId, sender))
      return member;
  return null;
};
const requireMembership = ({
  operation,
  orgId,
  orgMemberTable,
  sender,
  tableName
}) => {
  const member = checkMembership(orgMemberTable, orgId, sender);
  if (!member)
    throw makeError("NOT_ORG_MEMBER", `${tableName}:${operation}`);
  return member;
};
const requireCanMutate = ({
  member,
  operation,
  row,
  sender,
  tableName
}) => {
  if (member.isAdmin)
    return;
  if (!identityEquals(row.userId, sender))
    throw makeError("FORBIDDEN", `${tableName}:${operation}`);
};
const getOrgOwnedRow = ({
  id,
  operation,
  orgMemberTable,
  pkAccessor,
  sender,
  table,
  tableName
}) => {
  const pk = pkAccessor(table), row = pk.find(id);
  if (!row)
    throw makeError("NOT_FOUND", `${tableName}:${operation}`);
  const member = requireMembership({ operation, orgId: row.orgId, orgMemberTable, sender, tableName });
  requireCanMutate({ member, operation, row, sender, tableName });
  return { member, pk, row };
};
const makeOrgCrud = (spacetimedb, config2) => {
  const {
    expectedUpdatedAtField,
    fields,
    idField,
    options,
    orgIdField,
    orgMemberTable: orgMemberTableAccessor,
    pk: pkAccessor,
    table: tableAccessor,
    tableName
  } = config2, hooks = options?.hooks, fieldNames = Object.keys(fields), createName = `create_${tableName}`, updateName = `update_${tableName}`, rmName = `rm_${tableName}`, updateParams = {
    id: idField
  }, optionalFields = makeOptionalFields(fields), optionalKeys2 = Object.keys(optionalFields);
  for (const key of optionalKeys2) {
    const field = optionalFields[key];
    if (field)
      updateParams[key] = field;
  }
  if (expectedUpdatedAtField)
    updateParams.expectedUpdatedAt = expectedUpdatedAtField.optional();
  const createParams = { orgId: orgIdField }, fieldKeys = Object.keys(fields);
  for (const key of fieldKeys)
    createParams[key] = fields[key];
  const createReducer = spacetimedb.reducer({ name: createName }, createParams, (ctx, args) => {
    const hookCtx = { db: ctx.db, sender: ctx.sender, timestamp: ctx.timestamp }, table = tableAccessor(ctx.db), orgMemberTable = orgMemberTableAccessor(ctx.db);
    requireMembership({
      operation: "create",
      orgId: args.orgId,
      orgMemberTable,
      sender: ctx.sender,
      tableName
    });
    let data = args;
    if (hooks?.beforeCreate)
      data = hooks.beforeCreate(hookCtx, { data });
    const { orgId, ...payload } = data, row = table.insert({
      ...payload,
      id: 0,
      orgId,
      updatedAt: ctx.timestamp,
      userId: ctx.sender
    });
    if (hooks?.afterCreate)
      hooks.afterCreate(hookCtx, { data, row });
  }), updateReducer = spacetimedb.reducer({ name: updateName }, updateParams, (ctx, args) => {
    const hookCtx = { db: ctx.db, sender: ctx.sender, timestamp: ctx.timestamp }, table = tableAccessor(ctx.db), orgMemberTable = orgMemberTableAccessor(ctx.db), { pk, row } = getOrgOwnedRow({
      id: args.id,
      operation: "update",
      orgMemberTable,
      pkAccessor,
      sender: ctx.sender,
      table,
      tableName
    });
    if (args.expectedUpdatedAt !== undefined && !timestampEquals(row.updatedAt, args.expectedUpdatedAt))
      throw makeError("CONFLICT", `${tableName}:update`);
    let patch = pickPatch(args, fieldNames);
    if (hooks?.beforeUpdate)
      patch = hooks.beforeUpdate(hookCtx, { patch, prev: row });
    const next = pk.update(applyOrgPatch(row, patch, ctx.timestamp));
    if (hooks?.afterUpdate)
      hooks.afterUpdate(hookCtx, { next, patch, prev: row });
  }), rmReducer = spacetimedb.reducer({ name: rmName }, { id: idField }, (ctx, { id }) => {
    const hookCtx = { db: ctx.db, sender: ctx.sender, timestamp: ctx.timestamp }, table = tableAccessor(ctx.db), orgMemberTable = orgMemberTableAccessor(ctx.db), { pk, row } = getOrgOwnedRow({
      id,
      operation: "rm",
      orgMemberTable,
      pkAccessor,
      sender: ctx.sender,
      table,
      tableName
    });
    if (hooks?.beforeDelete)
      hooks.beforeDelete(hookCtx, { row });
    if (options?.softDelete) {
      const nextRecord = {
        ...row,
        deletedAt: ctx.timestamp,
        updatedAt: ctx.timestamp
      };
      pk.update(nextRecord);
    } else {
      const deleted = pk.delete(id);
      if (!deleted)
        throw makeError("NOT_FOUND", `${tableName}:rm`);
    }
    if (hooks?.afterDelete)
      hooks.afterDelete(hookCtx, { row });
  });
  return {
    exports: {
      [createName]: createReducer,
      [rmName]: rmReducer,
      [updateName]: updateReducer
    }
  };
};
const orgCascade = (_schema, config2) => config2;
// Packages/betterspace/src/server/presence.ts
const HEARTBEAT_INTERVAL_MS = 15_000;
const PRESENCE_TTL_MS = 30_000;
const MICROS_PER_MILLISECOND = 1000n;
const ZERO_PREFIX_REGEX2 = /^0x/u;
const isAuthenticated = (sender) => {
  const senderLike = sender, raw = typeof senderLike.toHexString === "function" ? senderLike.toHexString() : senderLike.toString?.() ?? "", normalized = raw.trim().toLowerCase().replace(ZERO_PREFIX_REGEX2, "");
  if (!normalized)
    return false;
  for (const ch of normalized)
    if (ch !== "0")
      return true;
  return false;
};
const toMicros = (timestamp) => {
  const value = timestamp;
  return value.microsSinceUnixEpoch ?? 0n;
};
const findPresenceRow = (rows, roomId, sender) => {
  for (const row of rows)
    if (row.roomId === roomId && identityEquals(row.userId, sender))
      return row;
  return null;
};
const upsertPresence = ({
  args,
  ctx,
  pk,
  table
}) => {
  const found = findPresenceRow(table.iter(), args.roomId, ctx.sender);
  if (found) {
    pk.update({ ...found, data: args.data ?? found.data, lastSeen: ctx.timestamp });
    return;
  }
  table.insert({
    data: args.data ?? "{}",
    id: 0,
    lastSeen: ctx.timestamp,
    roomId: args.roomId,
    userId: ctx.sender
  });
};
const presenceTable = (presence) => ({ presence });
const makePresence = (spacetimedb, config2) => {
  const { dataField, pk: pkAccessor, roomIdField, table: tableAccessor, tableName = "presence" } = config2, heartbeatName = `presence_heartbeat_${tableName}`, leaveName = `presence_leave_${tableName}`, cleanupName = `presence_cleanup_${tableName}`, heartbeat = spacetimedb.reducer({ name: heartbeatName }, { data: dataField.optional(), roomId: roomIdField }, (ctx, args) => {
    if (!isAuthenticated(ctx.sender))
      throw makeError("NOT_AUTHENTICATED", `${tableName}:heartbeat`);
    const table = tableAccessor(ctx.db), pk = pkAccessor(table);
    upsertPresence({ args, ctx, pk, table });
  }), leave = spacetimedb.reducer({ name: leaveName }, { roomId: roomIdField }, (ctx, args) => {
    if (!isAuthenticated(ctx.sender))
      throw makeError("NOT_AUTHENTICATED", `${tableName}:leave`);
    const table = tableAccessor(ctx.db), pk = pkAccessor(table);
    for (const row of table.iter()) {
      if (row.roomId === args.roomId && identityEquals(row.userId, ctx.sender)) {
        const removed = pk.delete(row.id);
        if (!removed)
          throw makeError("NOT_FOUND", `${tableName}:leave`);
        break;
      }
    }
  }), cleanup = spacetimedb.reducer({ name: cleanupName }, {}, (ctx) => {
    const table = tableAccessor(ctx.db), pk = pkAccessor(table), cutoffMicros = toMicros(ctx.timestamp) - BigInt(PRESENCE_TTL_MS) * MICROS_PER_MILLISECOND;
    for (const row of table.iter())
      if (toMicros(row.lastSeen) < cutoffMicros && !pk.delete(row.id))
        throw makeError("NOT_FOUND", `${tableName}:cleanup`);
  });
  return {
    exports: {
      [cleanupName]: cleanup,
      [heartbeatName]: heartbeat,
      [leaveName]: leave
    }
  };
};
// Packages/betterspace/src/server/schema-helpers.ts
const tableDef = (kind, fields) => {
  const indexes = [], searchIndexes = [];
  const table = {
    fields,
    index: (name, fs) => {
      indexes.push({ fields: [...fs], name });
      return table;
    },
    indexes,
    kind,
    searchIndex: (name, config2) => {
      searchIndexes.push({ name, searchField: config2.searchField });
      return table;
    },
    searchIndexes
  };
  return table;
};
const asNever = (v) => v;
const zodShapeToFields = (shape) => {
  const out = {}, keys = Object.keys(shape);
  for (const k of keys) {
    const field = shape[k], { type } = unwrapZod(field);
    out[k] = type || "unknown";
  }
  return out;
};
const baseTable = (s) => asNever(tableDef("base", {
  ...zodShapeToFields(s.shape),
  updatedAt: "number"
}));
const ownedTable = (s) => asNever(tableDef("owned", {
  ...zodShapeToFields(s.shape),
  updatedAt: "number",
  userId: "identity"
}).index("by_user", ["userId"]));
const singletonTable = (s) => asNever(tableDef("singleton", {
  ...zodShapeToFields(s.shape),
  updatedAt: "number",
  userId: "identity"
}).index("by_user", ["userId"]));
const orgTable = (s) => asNever(tableDef("org", {
  ...zodShapeToFields(s.shape),
  orgId: "u32",
  updatedAt: "number",
  userId: "identity"
}).index("by_org", ["orgId"]).index("by_org_user", ["orgId", "userId"]));
const orgChildTable = (s, parent) => asNever(tableDef("org-child", {
  ...zodShapeToFields(s.shape),
  orgId: "u32",
  updatedAt: "number",
  userId: "identity"
}).index("by_org", ["orgId"]).index("by_parent", [parent.foreignKey]));
const childTable = (s, indexField, indexName) => asNever(tableDef("child", {
  ...zodShapeToFields(s.shape),
  updatedAt: "number"
}).index(indexName ?? `by_${indexField}`, [indexField]));
const orgTables = () => ({
  org: asNever(tableDef("system", {
    avatarId: "string?",
    name: "string",
    slug: "string",
    updatedAt: "number",
    userId: "identity"
  }).index("by_slug", ["slug"]).index("by_user", ["userId"])),
  orgInvite: asNever(tableDef("system", {
    email: "string",
    expiresAt: "number",
    isAdmin: "boolean",
    orgId: "u32",
    token: "string"
  }).index("by_org", ["orgId"]).index("by_token", ["token"])),
  orgJoinRequest: asNever(tableDef("system", {
    message: "string?",
    orgId: "u32",
    status: "pending|approved|rejected",
    userId: "identity"
  }).index("by_org", ["orgId"]).index("by_org_status", ["orgId", "status"]).index("by_user", ["userId"])),
  orgMember: asNever(tableDef("system", {
    isAdmin: "boolean",
    orgId: "u32",
    updatedAt: "number",
    userId: "identity"
  }).index("by_org", ["orgId"]).index("by_org_user", ["orgId", "userId"]).index("by_user", ["userId"]))
});
const rateLimitTable = () => ({
  rateLimit: asNever(tableDef("system", {
    count: "number",
    key: "string",
    table: "string",
    windowStart: "number"
  }).index("by_table_key", ["table", "key"]))
});
const uploadTables = () => ({
  uploadChunk: asNever(tableDef("system", {
    chunkIndex: "number",
    storageId: "string",
    totalChunks: "number",
    uploadId: "string",
    userId: "identity"
  }).index("by_upload", ["uploadId"]).index("by_user", ["userId"])),
  uploadRateLimit: asNever(tableDef("system", {
    count: "number",
    userId: "identity",
    windowStart: "number"
  }).index("by_user", ["userId"])),
  uploadSession: asNever(tableDef("system", {
    completedChunks: "number",
    contentType: "string",
    fileName: "string",
    finalStorageId: "string?",
    status: "pending|assembling|completed|failed",
    totalChunks: "number",
    totalSize: "number",
    uploadId: "string",
    userId: "identity"
  }).index("by_upload_id", ["uploadId"]).index("by_user", ["userId"]))
});
const unsupportedTypes = new Set(["pipe", "transform"]);
const scanSchema = (schema, path, out) => {
  const b = unwrapZod(schema);
  if (b.type && unsupportedTypes.has(b.type))
    out.push({ path, zodType: b.type });
  if (isArrayType(b.type))
    return scanSchema(elementOf(b.schema), `${path}[]`, out);
  if (b.type === "object" && b.schema && isRecord(b.schema.shape)) {
    for (const [k, vl] of Object.entries(b.schema.shape)) {
      scanSchema(vl, path ? `${path}.${k}` : k, out);
    }
  }
};
const checkSchema = (schemas2) => {
  const res = [];
  for (const [table, schema] of Object.entries(schemas2))
    scanSchema(schema, table, res);
  if (res.length > 0) {
    for (const f of res)
      process.stderr.write(`${f.path}: unsupported zod type "${f.zodType}"
`);
    process.exitCode = 1;
  }
};
// Packages/betterspace/src/server/singleton.ts
const findByUser = (table, sender) => {
  for (const row of table)
    if (identityEquals(row.userId, sender))
      return row;
  return null;
};
const applyPatch2 = (row, patch, opts) => {
  const nextRecord = { ...row };
  for (const key of opts.fieldNames) {
    const value = patch[key];
    if (value !== undefined)
      nextRecord[key] = value;
  }
  nextRecord.updatedAt = opts.timestamp;
  return nextRecord;
};
const makeSingletonCrud = (spacetimedb, config2) => {
  const { fields, options, table: tableAccessor, tableName } = config2, hooks = options?.hooks, fieldNames = Object.keys(fields), getName = `get_${tableName}`, upsertName = `upsert_${tableName}`, upsertParams = {}, optionalFields = makeOptionalFields(fields), optionalKeys2 = Object.keys(optionalFields);
  for (const key of optionalKeys2) {
    const field = optionalFields[key];
    if (field)
      upsertParams[key] = field;
  }
  const getReducer = spacetimedb.reducer({ name: getName }, {}, (ctx) => {
    const table = tableAccessor(ctx.db), row = findByUser(table, ctx.sender);
    if (!row)
      throw makeError("NOT_FOUND", `${tableName}:get`);
    if (hooks?.beforeRead)
      hooks.beforeRead({ db: ctx.db, sender: ctx.sender, timestamp: ctx.timestamp }, { row });
  }), upsertReducer = spacetimedb.reducer({ name: upsertName }, upsertParams, (ctx, args) => {
    const hookCtx = { db: ctx.db, sender: ctx.sender, timestamp: ctx.timestamp }, table = tableAccessor(ctx.db), existing = findByUser(table, ctx.sender), patchRecord = args;
    if (existing) {
      if (hooks?.beforeUpdate)
        hooks.beforeUpdate(hookCtx, { patch: patchRecord, prev: existing });
      const nextRecord = applyPatch2(existing, patchRecord, { fieldNames, timestamp: ctx.timestamp });
      table.delete(existing);
      table.insert(nextRecord);
      if (hooks?.afterUpdate)
        hooks.afterUpdate(hookCtx, { next: nextRecord, patch: patchRecord, prev: existing });
    } else {
      if (hooks?.beforeCreate)
        hooks.beforeCreate(hookCtx, { data: patchRecord });
      const newRow = { ...patchRecord, updatedAt: ctx.timestamp, userId: ctx.sender };
      table.insert(newRow);
      if (hooks?.afterCreate)
        hooks.afterCreate(hookCtx, { data: patchRecord, row: newRow });
    }
  });
  return {
    exports: {
      [getName]: getReducer,
      [upsertName]: upsertReducer
    }
  };
};
// Packages/betterspace/src/server/setup.ts
const isPromiseLike = (value) => {
  if (!value || typeof value !== "object")
    return false;
  const { then } = value;
  return typeof then === "function";
};
const requireSync = (value, hookName) => {
  if (isPromiseLike(value))
    throw new Error(`Hook "${hookName}" must be synchronous in SpacetimeDB reducers`);
  return value;
};
const toGlobalCtx = (table, { db, sender, timestamp }) => ({ db, sender, table, timestamp });
const hasGlobalHooks = (hooks) => Boolean(hooks.beforeCreate ?? hooks.afterCreate ?? hooks.beforeUpdate ?? hooks.afterUpdate ?? hooks.beforeDelete ?? hooks.afterDelete);
const mergeGlobalBeforeCreate = (left, right) => {
  if (!(left.beforeCreate || right.beforeCreate))
    return;
  return (ctx, { data: initialData }) => {
    let data = initialData;
    if (left.beforeCreate)
      data = requireSync(left.beforeCreate(ctx, { data }), "global.beforeCreate:left");
    if (right.beforeCreate)
      data = requireSync(right.beforeCreate(ctx, { data }), "global.beforeCreate:right");
    return data;
  };
};
const mergeGlobalAfterCreate = (left, right) => {
  if (!(left.afterCreate || right.afterCreate))
    return;
  return (ctx, args) => {
    if (left.afterCreate)
      requireSync(left.afterCreate(ctx, args), "global.afterCreate:left");
    if (right.afterCreate)
      requireSync(right.afterCreate(ctx, args), "global.afterCreate:right");
  };
};
const mergeGlobalBeforeUpdate = (left, right) => {
  if (!(left.beforeUpdate || right.beforeUpdate))
    return;
  return (ctx, { patch: initialPatch, prev }) => {
    let patch = initialPatch;
    if (left.beforeUpdate)
      patch = requireSync(left.beforeUpdate(ctx, { patch, prev }), "global.beforeUpdate:left");
    if (right.beforeUpdate)
      patch = requireSync(right.beforeUpdate(ctx, { patch, prev }), "global.beforeUpdate:right");
    return patch;
  };
};
const mergeGlobalAfterUpdate = (left, right) => {
  if (!(left.afterUpdate || right.afterUpdate))
    return;
  return (ctx, args) => {
    if (left.afterUpdate)
      requireSync(left.afterUpdate(ctx, args), "global.afterUpdate:left");
    if (right.afterUpdate)
      requireSync(right.afterUpdate(ctx, args), "global.afterUpdate:right");
  };
};
const mergeGlobalBeforeDelete = (left, right) => {
  if (!(left.beforeDelete || right.beforeDelete))
    return;
  return (ctx, args) => {
    if (left.beforeDelete)
      requireSync(left.beforeDelete(ctx, args), "global.beforeDelete:left");
    if (right.beforeDelete)
      requireSync(right.beforeDelete(ctx, args), "global.beforeDelete:right");
  };
};
const mergeGlobalAfterDelete = (left, right) => {
  if (!(left.afterDelete || right.afterDelete))
    return;
  return (ctx, args) => {
    if (left.afterDelete)
      requireSync(left.afterDelete(ctx, args), "global.afterDelete:left");
    if (right.afterDelete)
      requireSync(right.afterDelete(ctx, args), "global.afterDelete:right");
  };
};
const mergeGlobalHooks = (left, right) => {
  if (!(left || right))
    return;
  if (!left)
    return right;
  if (!right)
    return left;
  const merged = {
    afterCreate: mergeGlobalAfterCreate(left, right),
    afterDelete: mergeGlobalAfterDelete(left, right),
    afterUpdate: mergeGlobalAfterUpdate(left, right),
    beforeCreate: mergeGlobalBeforeCreate(left, right),
    beforeDelete: mergeGlobalBeforeDelete(left, right),
    beforeUpdate: mergeGlobalBeforeUpdate(left, right)
  };
  if (!hasGlobalHooks(merged))
    return;
  return merged;
};
const hasCrudHooks = (hooks) => Boolean(hooks.beforeCreate ?? hooks.afterCreate ?? hooks.beforeUpdate ?? hooks.afterUpdate ?? hooks.beforeDelete ?? hooks.afterDelete);
const mergeCrudBeforeCreate = (table, globalHooks, localHooks) => {
  if (!(globalHooks?.beforeCreate || localHooks?.beforeCreate))
    return;
  return (ctx, { data: initialData }) => {
    let data = initialData;
    if (globalHooks?.beforeCreate)
      data = requireSync(globalHooks.beforeCreate(toGlobalCtx(table, ctx), { data }), "crud.beforeCreate:global");
    if (localHooks?.beforeCreate)
      data = requireSync(localHooks.beforeCreate(ctx, { data }), "crud.beforeCreate:local");
    return data;
  };
};
const mergeCrudAfterCreate = (table, globalHooks, localHooks) => {
  if (!(globalHooks?.afterCreate || localHooks?.afterCreate))
    return;
  return (ctx, { data, row }) => {
    if (globalHooks?.afterCreate)
      requireSync(globalHooks.afterCreate(toGlobalCtx(table, ctx), { data, row }), "crud.afterCreate:global");
    if (localHooks?.afterCreate)
      requireSync(localHooks.afterCreate(ctx, { data, row }), "crud.afterCreate:local");
  };
};
const mergeCrudBeforeUpdate = (table, globalHooks, localHooks) => {
  if (!(globalHooks?.beforeUpdate || localHooks?.beforeUpdate))
    return;
  return (ctx, { patch: initialPatch, prev }) => {
    let patch = initialPatch;
    if (globalHooks?.beforeUpdate)
      patch = requireSync(globalHooks.beforeUpdate(toGlobalCtx(table, ctx), { patch, prev }), "crud.beforeUpdate:global");
    if (localHooks?.beforeUpdate)
      patch = requireSync(localHooks.beforeUpdate(ctx, { patch, prev }), "crud.beforeUpdate:local");
    return patch;
  };
};
const mergeCrudAfterUpdate = (table, globalHooks, localHooks) => {
  if (!(globalHooks?.afterUpdate || localHooks?.afterUpdate))
    return;
  return (ctx, { next, patch, prev }) => {
    if (globalHooks?.afterUpdate)
      requireSync(globalHooks.afterUpdate(toGlobalCtx(table, ctx), {
        next,
        patch,
        prev
      }), "crud.afterUpdate:global");
    if (localHooks?.afterUpdate)
      requireSync(localHooks.afterUpdate(ctx, { next, patch, prev }), "crud.afterUpdate:local");
  };
};
const mergeCrudBeforeDelete = (table, globalHooks, localHooks) => {
  if (!(globalHooks?.beforeDelete || localHooks?.beforeDelete))
    return;
  return (ctx, { row }) => {
    if (globalHooks?.beforeDelete)
      requireSync(globalHooks.beforeDelete(toGlobalCtx(table, ctx), { row }), "crud.beforeDelete:global");
    if (localHooks?.beforeDelete)
      requireSync(localHooks.beforeDelete(ctx, { row }), "crud.beforeDelete:local");
  };
};
const mergeCrudAfterDelete = (table, globalHooks, localHooks) => {
  if (!(globalHooks?.afterDelete || localHooks?.afterDelete))
    return;
  return (ctx, { row }) => {
    if (globalHooks?.afterDelete)
      requireSync(globalHooks.afterDelete(toGlobalCtx(table, ctx), { row }), "crud.afterDelete:global");
    if (localHooks?.afterDelete)
      requireSync(localHooks.afterDelete(ctx, { row }), "crud.afterDelete:local");
  };
};
const mergeCrudHooks = (table, globalHooks, localHooks) => {
  if (!(globalHooks || localHooks))
    return;
  const merged = {
    afterCreate: mergeCrudAfterCreate(table, globalHooks, localHooks),
    afterDelete: mergeCrudAfterDelete(table, globalHooks, localHooks),
    afterUpdate: mergeCrudAfterUpdate(table, globalHooks, localHooks),
    beforeCreate: mergeCrudBeforeCreate(table, globalHooks, localHooks),
    beforeDelete: mergeCrudBeforeDelete(table, globalHooks, localHooks),
    beforeUpdate: mergeCrudBeforeUpdate(table, globalHooks, localHooks)
  };
  if (!hasCrudHooks(merged))
    return;
  return merged;
};
const hasSingletonHooks = (hooks) => Boolean(hooks.beforeCreate ?? hooks.afterCreate ?? hooks.beforeUpdate ?? hooks.afterUpdate ?? hooks.beforeRead);
const mergeSingletonBeforeCreate = (table, globalHooks, localHooks) => {
  if (!(globalHooks?.beforeCreate || localHooks?.beforeCreate))
    return;
  return (ctx, { data: initialData }) => {
    let data = initialData;
    if (globalHooks?.beforeCreate)
      data = requireSync(globalHooks.beforeCreate(toGlobalCtx(table, ctx), { data }), "singleton.beforeCreate:global");
    if (localHooks?.beforeCreate)
      data = requireSync(localHooks.beforeCreate(ctx, { data }), "singleton.beforeCreate:local");
    return data;
  };
};
const mergeSingletonAfterCreate = (table, globalHooks, localHooks) => {
  if (!(globalHooks?.afterCreate || localHooks?.afterCreate))
    return;
  return (ctx, { data, row }) => {
    if (globalHooks?.afterCreate)
      requireSync(globalHooks.afterCreate(toGlobalCtx(table, ctx), { data, row }), "singleton.afterCreate:global");
    if (localHooks?.afterCreate)
      requireSync(localHooks.afterCreate(ctx, { data, row }), "singleton.afterCreate:local");
  };
};
const mergeSingletonBeforeUpdate = (table, globalHooks, localHooks) => {
  if (!(globalHooks?.beforeUpdate || localHooks?.beforeUpdate))
    return;
  return (ctx, { patch: initialPatch, prev }) => {
    let patch = initialPatch;
    if (globalHooks?.beforeUpdate)
      patch = requireSync(globalHooks.beforeUpdate(toGlobalCtx(table, ctx), { patch, prev }), "singleton.beforeUpdate:global");
    if (localHooks?.beforeUpdate)
      patch = requireSync(localHooks.beforeUpdate(ctx, { patch, prev }), "singleton.beforeUpdate:local");
    return patch;
  };
};
const mergeSingletonAfterUpdate = (table, globalHooks, localHooks) => {
  if (!(globalHooks?.afterUpdate || localHooks?.afterUpdate))
    return;
  return (ctx, { next, patch, prev }) => {
    if (globalHooks?.afterUpdate)
      requireSync(globalHooks.afterUpdate(toGlobalCtx(table, ctx), {
        next,
        patch,
        prev
      }), "singleton.afterUpdate:global");
    if (localHooks?.afterUpdate)
      requireSync(localHooks.afterUpdate(ctx, { next, patch, prev }), "singleton.afterUpdate:local");
  };
};
const mergeSingletonHooks = (table, globalHooks, localHooks) => {
  if (!(globalHooks || localHooks))
    return;
  const merged = {
    afterCreate: mergeSingletonAfterCreate(table, globalHooks, localHooks),
    afterUpdate: mergeSingletonAfterUpdate(table, globalHooks, localHooks),
    beforeCreate: mergeSingletonBeforeCreate(table, globalHooks, localHooks),
    beforeRead: localHooks?.beforeRead,
    beforeUpdate: mergeSingletonBeforeUpdate(table, globalHooks, localHooks)
  };
  if (!hasSingletonHooks(merged))
    return;
  return merged;
};
const registerExports = (target, next) => {
  const names = Object.keys(next);
  for (const name of names) {
    const reducer = next[name];
    if (reducer)
      target[name] = reducer;
  }
};
const setup = (spacetimedb, config2 = {}) => {
  const middlewareHooks = config2.middleware?.length ? composeMiddleware(...config2.middleware) : undefined, globalHooks = mergeGlobalHooks(config2.hooks, middlewareHooks), accumulatedExports = {}, crud = (factoryConfig) => {
    const mergedHooks = mergeCrudHooks(factoryConfig.tableName, globalHooks, factoryConfig.options?.hooks), nextConfig = mergedHooks ? {
      ...factoryConfig,
      options: {
        ...factoryConfig.options,
        hooks: mergedHooks
      }
    } : factoryConfig, result = makeCrud(spacetimedb, nextConfig);
    registerExports(accumulatedExports, result.exports);
    return result;
  }, orgCrud = (factoryConfig) => {
    const mergedHooks = mergeCrudHooks(factoryConfig.tableName, globalHooks, factoryConfig.options?.hooks), nextConfig = mergedHooks ? {
      ...factoryConfig,
      options: {
        ...factoryConfig.options,
        hooks: mergedHooks
      }
    } : factoryConfig, result = makeOrgCrud(spacetimedb, nextConfig);
    registerExports(accumulatedExports, result.exports);
    return result;
  }, childCrud = (factoryConfig) => {
    const mergedHooks = mergeCrudHooks(factoryConfig.tableName, globalHooks, factoryConfig.options?.hooks), nextConfig = mergedHooks ? {
      ...factoryConfig,
      options: {
        ...factoryConfig.options,
        hooks: mergedHooks
      }
    } : factoryConfig, result = makeChildCrud(spacetimedb, nextConfig);
    registerExports(accumulatedExports, result.exports);
    return result;
  }, singletonCrud = (factoryConfig) => {
    const mergedHooks = mergeSingletonHooks(factoryConfig.tableName, globalHooks, factoryConfig.options?.hooks), nextConfig = mergedHooks ? {
      ...factoryConfig,
      options: {
        ...factoryConfig.options,
        hooks: mergedHooks
      }
    } : factoryConfig, result = makeSingletonCrud(spacetimedb, nextConfig);
    registerExports(accumulatedExports, result.exports);
    return result;
  }, cacheCrud = (factoryConfig) => {
    const result = makeCacheCrud(spacetimedb, factoryConfig);
    registerExports(accumulatedExports, result.exports);
    return result;
  }, org = (factoryConfig) => {
    const result = makeOrg(spacetimedb, factoryConfig);
    registerExports(accumulatedExports, result.exports);
    return result;
  }, allExports = () => ({ ...accumulatedExports });
  return {
    allExports,
    cacheCrud,
    childCrud,
    crud,
    exports: accumulatedExports,
    org,
    orgCrud,
    singletonCrud
  };
};
// Packages/betterspace/src/server/test.ts
import { DbConnectionBuilder, DbConnectionImpl } from "spacetimedb/sdk";

// Packages/betterspace/src/server/env.ts
const isTestMode = () => process.env.SPACETIMEDB_TEST_MODE === "true";

// Packages/betterspace/src/server/test.ts
const DEFAULT_HTTP_URL = "http://localhost:3000";
const DEFAULT_MODULE_NAME = "betterspace";
const DEFAULT_WS_URL = "ws://localhost:3000";
const CONNECT_TIMEOUT_MS = 1e4;
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/u;
const REMOTE_MODULE = {
  procedures: [],
  reducers: [],
  tables: {},
  versionInfo: { cliVersion: "2.0.0" }
};
const toHttpUrl = (wsUrl) => {
  if (wsUrl.startsWith("ws://"))
    return `http://${wsUrl.slice("ws://".length)}`;
  if (wsUrl.startsWith("wss://"))
    return `https://${wsUrl.slice("wss://".length)}`;
  return wsUrl;
};
const parseJsonResponse = async (response) => {
  const text = await response.text();
  if (!response.ok) {
    const message = text.trim().length > 0 ? text : response.statusText;
    throw new Error(`HTTP_${String(response.status)}: ${message}`);
  }
  if (text.trim().length === 0)
    return null;
  return JSON.parse(text);
};
const getReducerParamMap = (schema) => {
  const map = new Map, reducers = schema.reducers ?? [];
  for (const reducer of reducers) {
    const reducerName = reducer.name;
    if (reducerName) {
      const params = [], elements = reducer.params?.elements ?? [];
      for (const el of elements) {
        const paramName = el.name?.some;
        if (paramName)
          params.push(paramName);
      }
      map.set(reducerName, params);
    }
  }
  return map;
};
const getSchema = async (ctx) => {
  const response = await fetch(`${ctx.baseHttpUrl}/v1/database/${ctx.moduleName}/schema?version=9`);
  return parseJsonResponse(response);
};
const createConnectedUser = async (ctx) => {
  const builder = new DbConnectionBuilder(REMOTE_MODULE, (config2) => new DbConnectionImpl(config2));
  return new Promise((resolve, reject) => {
    let finished = false;
    const timeout = setTimeout(() => {
      if (finished)
        return;
      finished = true;
      reject(new Error("CONNECT_TIMEOUT: failed to connect to SpacetimeDB"));
    }, CONNECT_TIMEOUT_MS);
    builder.withUri(ctx.baseWsUrl).withDatabaseName(ctx.moduleName).onConnect((connection, identity, token) => {
      if (finished)
        return;
      finished = true;
      clearTimeout(timeout);
      resolve({
        connection,
        identity: identity.toHexString(),
        token
      });
    }).onConnectError((_connection, error) => {
      if (finished)
        return;
      finished = true;
      clearTimeout(timeout);
      reject(new Error(`CONNECT_FAILED: ${error.message}`));
    }).build();
  });
};
const ensureIdentifier = (value, kind) => {
  const valid = IDENTIFIER_RE.test(value);
  if (!valid)
    throw new Error(`INVALID_${kind}: ${value}`);
  return value;
};
const normalizeReducerArgs = (ctx, reducerName, args) => {
  if (args === undefined || args === null)
    return [];
  if (Array.isArray(args))
    return args;
  if (typeof args !== "object")
    return [args];
  const reducerParams = ctx.reducerParams.get(reducerName);
  if (!reducerParams)
    throw new Error(`REDUCER_NOT_FOUND: ${reducerName}`);
  const argRecord = args, values = [];
  for (const name of reducerParams)
    values.push(argRecord[name]);
  return values;
};
const getSqlFields = (schema) => {
  if (!schema || typeof schema !== "object")
    return [];
  const schemaRecord = schema, directElements = schemaRecord.elements, productElements = schemaRecord.Product && typeof schemaRecord.Product === "object" ? schemaRecord.Product.elements : undefined, fields = [], elementsSource = Array.isArray(directElements) ? directElements : Array.isArray(productElements) ? productElements : [];
  for (const item of elementsSource)
    if (item && typeof item === "object") {
      const itemRecord = item, nameValue = itemRecord.name;
      if (nameValue && typeof nameValue === "object") {
        const { some } = nameValue;
        if (typeof some === "string")
          fields.push(some);
      }
    }
  return fields;
};
const rowToObject = (row, fields) => {
  if (!Array.isArray(row) || fields.length === 0 || fields.length !== row.length)
    return row;
  const result = {}, rowValues = row;
  for (let i = 0;i < fields.length; i += 1) {
    const fieldName = fields[i], value = rowValues[i];
    if (fieldName)
      result[fieldName] = value;
  }
  return result;
};
const postSql = async (ctx, query, token) => {
  const response = await fetch(`${ctx.baseHttpUrl}/v1/database/${ctx.moduleName}/sql`, {
    body: query,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain"
    },
    method: "POST"
  }), parsed = await parseJsonResponse(response);
  if (Array.isArray(parsed))
    return parsed;
  return [parsed];
};
const postReducer = async (ctx, request) => {
  const safeReducer = ensureIdentifier(request.reducerName, "REDUCER_NAME"), response = await fetch(`${ctx.baseHttpUrl}/v1/database/${ctx.moduleName}/call/${safeReducer}`, {
    body: JSON.stringify(request.args),
    headers: {
      Authorization: `Bearer ${request.token}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  }), text = await response.text();
  if (!response.ok) {
    const message = text.trim().length > 0 ? text : response.statusText;
    throw new Error(`REDUCER_CALL_FAILED: ${message}`);
  }
  if (text.trim().length === 0)
    return null;
  const parsed = JSON.parse(text);
  return parsed;
};
const createTestContext = async (options) => {
  const baseWsUrl = options?.wsUrl ?? DEFAULT_WS_URL, baseHttpUrl = options?.httpUrl ?? (toHttpUrl(baseWsUrl) || DEFAULT_HTTP_URL), moduleName = options?.moduleName ?? DEFAULT_MODULE_NAME, userCount = options?.userCount ?? 1, defaultUser = await createConnectedUser({ baseWsUrl, moduleName }), ctx = {
    baseHttpUrl,
    baseWsUrl,
    defaultUser,
    moduleName,
    reducerParams: new Map,
    users: [defaultUser]
  }, schema = await getSchema(ctx);
  ctx.reducerParams = getReducerParamMap(schema);
  const pendingUsers = [];
  for (let i = 1;i < userCount; i += 1)
    pendingUsers.push(createConnectedUser(ctx));
  const additionalUsers = await Promise.all(pendingUsers);
  for (const user of additionalUsers)
    ctx.users.push(user);
  return ctx;
};
const createTestUser = async (ctx) => {
  const user = await createConnectedUser(ctx);
  ctx.users.push(user);
  return user;
};
const asUser = async (_ctx, user, fn) => fn(user);
const callReducer = async (ctx, name, ...rest) => {
  const [args, user] = rest, activeUser = user ?? ctx.defaultUser, safeName = ensureIdentifier(name, "REDUCER_NAME"), callArgs = normalizeReducerArgs(ctx, safeName, args);
  return postReducer(ctx, { args: callArgs, reducerName: safeName, token: activeUser.token });
};
const queryTable = async (ctx, tableName, user) => {
  const activeUser = user ?? ctx.defaultUser, safeTableName = ensureIdentifier(tableName, "TABLE_NAME"), sql = `SELECT * FROM ${safeTableName}`, results = await postSql(ctx, sql, activeUser.token);
  if (results.length === 0)
    return [];
  const [first] = results, rows = first?.rows ?? [], fields = getSqlFields(first?.schema), mapped = [];
  for (const row of rows)
    mapped.push(rowToObject(row, fields));
  return mapped;
};
const cleanup = async (ctx) => {
  if (ctx.reducerParams.has("reset_all_data"))
    await postReducer(ctx, { args: [], reducerName: "reset_all_data", token: ctx.defaultUser.token });
  for (const user of ctx.users)
    user.connection.disconnect();
  ctx.users.length = 0;
};
// Packages/betterspace/src/server/test-discover.ts
const DEFAULT_HTTP_URL2 = "http://localhost:3000";
const DEFAULT_MODULE_NAME2 = "betterspace";
const parseSchemaResponse = async (response) => {
  const text = await response.text();
  if (!response.ok) {
    const message = text.trim().length > 0 ? text : response.statusText;
    throw new Error(`DISCOVER_MODULES_FAILED: ${message}`);
  }
  return JSON.parse(text);
};
const pickNames = (rows) => {
  const names = [];
  for (const row of rows ?? []) {
    const { name } = row;
    if (name)
      names.push(name);
  }
  return names;
};
const discoverModules = async (options) => {
  const httpUrl = options?.httpUrl ?? DEFAULT_HTTP_URL2, moduleName = options?.moduleName ?? DEFAULT_MODULE_NAME2, response = await fetch(`${httpUrl}/v1/database/${moduleName}/schema?version=9`), parsed = await parseSchemaResponse(response);
  return {
    reducers: pickNames(parsed.reducers),
    tables: pickNames(parsed.tables)
  };
};
export {
  uploadTables,
  time2 as time,
  slowQueryWarn,
  singletonTable,
  setup,
  rateLimitTable,
  queryTable,
  presenceTable,
  ownedTable,
  ownedCascade,
  orgTables,
  orgTable,
  orgChildTable,
  orgCascade,
  ok,
  matchError,
  makeSingletonCrud,
  makePresence,
  makeOrgCrud,
  makeOrg,
  makeFileUpload,
  makeCrud,
  makeChildCrud,
  makeCacheCrud,
  isTestMode,
  isRecord,
  isMutationError,
  isErrorCode,
  inputSanitize,
  handleError,
  getErrorMessage,
  getErrorDetail,
  getErrorCode,
  fail,
  extractErrorData,
  errValidation,
  err,
  discoverModules,
  createTestUser,
  createTestContext,
  createS3UploadPresignedUrl,
  createS3DownloadPresignedUrl,
  composeMiddleware,
  cleanup,
  childTable,
  checkSchema,
  checkRateLimit,
  checkMembership,
  callReducer,
  baseTable,
  auditLog,
  asUser,
  PRESENCE_TTL_MS,
  HEARTBEAT_INTERVAL_MS,
  DEFAULT_MAX_FILE_SIZE,
  DEFAULT_ALLOWED_TYPES,
  CHUNK_SIZE
};
