// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: __accessProp.bind(mod, key),
        enumerable: true
      });
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};

// ../../../node_modules/safe-stable-stringify/index.js
var require_safe_stable_stringify = __commonJS((exports, module) => {
  var { hasOwnProperty } = Object.prototype;
  var stringify = configure();
  stringify.configure = configure;
  stringify.stringify = stringify;
  stringify.default = stringify;
  exports.stringify = stringify;
  exports.configure = configure;
  module.exports = stringify;
  var strEscapeSequencesRegExp = /[\u0000-\u001f\u0022\u005c\ud800-\udfff]/;
  function strEscape(str) {
    if (str.length < 5000 && !strEscapeSequencesRegExp.test(str)) {
      return `"${str}"`;
    }
    return JSON.stringify(str);
  }
  function sort(array, comparator) {
    if (array.length > 200 || comparator) {
      return array.sort(comparator);
    }
    for (let i2 = 1;i2 < array.length; i2++) {
      const currentValue = array[i2];
      let position = i2;
      while (position !== 0 && array[position - 1] > currentValue) {
        array[position] = array[position - 1];
        position--;
      }
      array[position] = currentValue;
    }
    return array;
  }
  var typedArrayPrototypeGetSymbolToStringTag = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Object.getPrototypeOf(new Int8Array)), Symbol.toStringTag).get;
  function isTypedArrayWithEntries(value) {
    return typedArrayPrototypeGetSymbolToStringTag.call(value) !== undefined && value.length !== 0;
  }
  function stringifyTypedArray(array, separator, maximumBreadth) {
    if (array.length < maximumBreadth) {
      maximumBreadth = array.length;
    }
    const whitespace = separator === "," ? "" : " ";
    let res = `"0":${whitespace}${array[0]}`;
    for (let i2 = 1;i2 < maximumBreadth; i2++) {
      res += `${separator}"${i2}":${whitespace}${array[i2]}`;
    }
    return res;
  }
  function getCircularValueOption(options) {
    if (hasOwnProperty.call(options, "circularValue")) {
      const circularValue = options.circularValue;
      if (typeof circularValue === "string") {
        return `"${circularValue}"`;
      }
      if (circularValue == null) {
        return circularValue;
      }
      if (circularValue === Error || circularValue === TypeError) {
        return {
          toString() {
            throw new TypeError("Converting circular structure to JSON");
          }
        };
      }
      throw new TypeError('The "circularValue" argument must be of type string or the value null or undefined');
    }
    return '"[Circular]"';
  }
  function getDeterministicOption(options) {
    let value;
    if (hasOwnProperty.call(options, "deterministic")) {
      value = options.deterministic;
      if (typeof value !== "boolean" && typeof value !== "function") {
        throw new TypeError('The "deterministic" argument must be of type boolean or comparator function');
      }
    }
    return value === undefined ? true : value;
  }
  function getBooleanOption(options, key) {
    let value;
    if (hasOwnProperty.call(options, key)) {
      value = options[key];
      if (typeof value !== "boolean") {
        throw new TypeError(`The "${key}" argument must be of type boolean`);
      }
    }
    return value === undefined ? true : value;
  }
  function getPositiveIntegerOption(options, key) {
    let value;
    if (hasOwnProperty.call(options, key)) {
      value = options[key];
      if (typeof value !== "number") {
        throw new TypeError(`The "${key}" argument must be of type number`);
      }
      if (!Number.isInteger(value)) {
        throw new TypeError(`The "${key}" argument must be an integer`);
      }
      if (value < 1) {
        throw new RangeError(`The "${key}" argument must be >= 1`);
      }
    }
    return value === undefined ? Infinity : value;
  }
  function getItemCount(number) {
    if (number === 1) {
      return "1 item";
    }
    return `${number} items`;
  }
  function getUniqueReplacerSet(replacerArray) {
    const replacerSet = new Set;
    for (const value of replacerArray) {
      if (typeof value === "string" || typeof value === "number") {
        replacerSet.add(String(value));
      }
    }
    return replacerSet;
  }
  function getStrictOption(options) {
    if (hasOwnProperty.call(options, "strict")) {
      const value = options.strict;
      if (typeof value !== "boolean") {
        throw new TypeError('The "strict" argument must be of type boolean');
      }
      if (value) {
        return (value2) => {
          let message = `Object can not safely be stringified. Received type ${typeof value2}`;
          if (typeof value2 !== "function")
            message += ` (${value2.toString()})`;
          throw new Error(message);
        };
      }
    }
  }
  function configure(options) {
    options = { ...options };
    const fail = getStrictOption(options);
    if (fail) {
      if (options.bigint === undefined) {
        options.bigint = false;
      }
      if (!("circularValue" in options)) {
        options.circularValue = Error;
      }
    }
    const circularValue = getCircularValueOption(options);
    const bigint = getBooleanOption(options, "bigint");
    const deterministic = getDeterministicOption(options);
    const comparator = typeof deterministic === "function" ? deterministic : undefined;
    const maximumDepth = getPositiveIntegerOption(options, "maximumDepth");
    const maximumBreadth = getPositiveIntegerOption(options, "maximumBreadth");
    function stringifyFnReplacer(key, parent, stack, replacer, spacer, indentation) {
      let value = parent[key];
      if (typeof value === "object" && value !== null && typeof value.toJSON === "function") {
        value = value.toJSON(key);
      }
      value = replacer.call(parent, key, value);
      switch (typeof value) {
        case "string":
          return strEscape(value);
        case "object": {
          if (value === null) {
            return "null";
          }
          if (stack.indexOf(value) !== -1) {
            return circularValue;
          }
          let res = "";
          let join = ",";
          const originalIndentation = indentation;
          if (Array.isArray(value)) {
            if (value.length === 0) {
              return "[]";
            }
            if (maximumDepth < stack.length + 1) {
              return '"[Array]"';
            }
            stack.push(value);
            if (spacer !== "") {
              indentation += spacer;
              res += `
${indentation}`;
              join = `,
${indentation}`;
            }
            const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
            let i2 = 0;
            for (;i2 < maximumValuesToStringify - 1; i2++) {
              const tmp2 = stringifyFnReplacer(String(i2), value, stack, replacer, spacer, indentation);
              res += tmp2 !== undefined ? tmp2 : "null";
              res += join;
            }
            const tmp = stringifyFnReplacer(String(i2), value, stack, replacer, spacer, indentation);
            res += tmp !== undefined ? tmp : "null";
            if (value.length - 1 > maximumBreadth) {
              const removedKeys = value.length - maximumBreadth - 1;
              res += `${join}"... ${getItemCount(removedKeys)} not stringified"`;
            }
            if (spacer !== "") {
              res += `
${originalIndentation}`;
            }
            stack.pop();
            return `[${res}]`;
          }
          let keys = Object.keys(value);
          const keyLength = keys.length;
          if (keyLength === 0) {
            return "{}";
          }
          if (maximumDepth < stack.length + 1) {
            return '"[Object]"';
          }
          let whitespace = "";
          let separator = "";
          if (spacer !== "") {
            indentation += spacer;
            join = `,
${indentation}`;
            whitespace = " ";
          }
          const maximumPropertiesToStringify = Math.min(keyLength, maximumBreadth);
          if (deterministic && !isTypedArrayWithEntries(value)) {
            keys = sort(keys, comparator);
          }
          stack.push(value);
          for (let i2 = 0;i2 < maximumPropertiesToStringify; i2++) {
            const key2 = keys[i2];
            const tmp = stringifyFnReplacer(key2, value, stack, replacer, spacer, indentation);
            if (tmp !== undefined) {
              res += `${separator}${strEscape(key2)}:${whitespace}${tmp}`;
              separator = join;
            }
          }
          if (keyLength > maximumBreadth) {
            const removedKeys = keyLength - maximumBreadth;
            res += `${separator}"...":${whitespace}"${getItemCount(removedKeys)} not stringified"`;
            separator = join;
          }
          if (spacer !== "" && separator.length > 1) {
            res = `
${indentation}${res}
${originalIndentation}`;
          }
          stack.pop();
          return `{${res}}`;
        }
        case "number":
          return isFinite(value) ? String(value) : fail ? fail(value) : "null";
        case "boolean":
          return value === true ? "true" : "false";
        case "undefined":
          return;
        case "bigint":
          if (bigint) {
            return String(value);
          }
        default:
          return fail ? fail(value) : undefined;
      }
    }
    function stringifyArrayReplacer(key, value, stack, replacer, spacer, indentation) {
      if (typeof value === "object" && value !== null && typeof value.toJSON === "function") {
        value = value.toJSON(key);
      }
      switch (typeof value) {
        case "string":
          return strEscape(value);
        case "object": {
          if (value === null) {
            return "null";
          }
          if (stack.indexOf(value) !== -1) {
            return circularValue;
          }
          const originalIndentation = indentation;
          let res = "";
          let join = ",";
          if (Array.isArray(value)) {
            if (value.length === 0) {
              return "[]";
            }
            if (maximumDepth < stack.length + 1) {
              return '"[Array]"';
            }
            stack.push(value);
            if (spacer !== "") {
              indentation += spacer;
              res += `
${indentation}`;
              join = `,
${indentation}`;
            }
            const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
            let i2 = 0;
            for (;i2 < maximumValuesToStringify - 1; i2++) {
              const tmp2 = stringifyArrayReplacer(String(i2), value[i2], stack, replacer, spacer, indentation);
              res += tmp2 !== undefined ? tmp2 : "null";
              res += join;
            }
            const tmp = stringifyArrayReplacer(String(i2), value[i2], stack, replacer, spacer, indentation);
            res += tmp !== undefined ? tmp : "null";
            if (value.length - 1 > maximumBreadth) {
              const removedKeys = value.length - maximumBreadth - 1;
              res += `${join}"... ${getItemCount(removedKeys)} not stringified"`;
            }
            if (spacer !== "") {
              res += `
${originalIndentation}`;
            }
            stack.pop();
            return `[${res}]`;
          }
          stack.push(value);
          let whitespace = "";
          if (spacer !== "") {
            indentation += spacer;
            join = `,
${indentation}`;
            whitespace = " ";
          }
          let separator = "";
          for (const key2 of replacer) {
            const tmp = stringifyArrayReplacer(key2, value[key2], stack, replacer, spacer, indentation);
            if (tmp !== undefined) {
              res += `${separator}${strEscape(key2)}:${whitespace}${tmp}`;
              separator = join;
            }
          }
          if (spacer !== "" && separator.length > 1) {
            res = `
${indentation}${res}
${originalIndentation}`;
          }
          stack.pop();
          return `{${res}}`;
        }
        case "number":
          return isFinite(value) ? String(value) : fail ? fail(value) : "null";
        case "boolean":
          return value === true ? "true" : "false";
        case "undefined":
          return;
        case "bigint":
          if (bigint) {
            return String(value);
          }
        default:
          return fail ? fail(value) : undefined;
      }
    }
    function stringifyIndent(key, value, stack, spacer, indentation) {
      switch (typeof value) {
        case "string":
          return strEscape(value);
        case "object": {
          if (value === null) {
            return "null";
          }
          if (typeof value.toJSON === "function") {
            value = value.toJSON(key);
            if (typeof value !== "object") {
              return stringifyIndent(key, value, stack, spacer, indentation);
            }
            if (value === null) {
              return "null";
            }
          }
          if (stack.indexOf(value) !== -1) {
            return circularValue;
          }
          const originalIndentation = indentation;
          if (Array.isArray(value)) {
            if (value.length === 0) {
              return "[]";
            }
            if (maximumDepth < stack.length + 1) {
              return '"[Array]"';
            }
            stack.push(value);
            indentation += spacer;
            let res2 = `
${indentation}`;
            const join2 = `,
${indentation}`;
            const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
            let i2 = 0;
            for (;i2 < maximumValuesToStringify - 1; i2++) {
              const tmp2 = stringifyIndent(String(i2), value[i2], stack, spacer, indentation);
              res2 += tmp2 !== undefined ? tmp2 : "null";
              res2 += join2;
            }
            const tmp = stringifyIndent(String(i2), value[i2], stack, spacer, indentation);
            res2 += tmp !== undefined ? tmp : "null";
            if (value.length - 1 > maximumBreadth) {
              const removedKeys = value.length - maximumBreadth - 1;
              res2 += `${join2}"... ${getItemCount(removedKeys)} not stringified"`;
            }
            res2 += `
${originalIndentation}`;
            stack.pop();
            return `[${res2}]`;
          }
          let keys = Object.keys(value);
          const keyLength = keys.length;
          if (keyLength === 0) {
            return "{}";
          }
          if (maximumDepth < stack.length + 1) {
            return '"[Object]"';
          }
          indentation += spacer;
          const join = `,
${indentation}`;
          let res = "";
          let separator = "";
          let maximumPropertiesToStringify = Math.min(keyLength, maximumBreadth);
          if (isTypedArrayWithEntries(value)) {
            res += stringifyTypedArray(value, join, maximumBreadth);
            keys = keys.slice(value.length);
            maximumPropertiesToStringify -= value.length;
            separator = join;
          }
          if (deterministic) {
            keys = sort(keys, comparator);
          }
          stack.push(value);
          for (let i2 = 0;i2 < maximumPropertiesToStringify; i2++) {
            const key2 = keys[i2];
            const tmp = stringifyIndent(key2, value[key2], stack, spacer, indentation);
            if (tmp !== undefined) {
              res += `${separator}${strEscape(key2)}: ${tmp}`;
              separator = join;
            }
          }
          if (keyLength > maximumBreadth) {
            const removedKeys = keyLength - maximumBreadth;
            res += `${separator}"...": "${getItemCount(removedKeys)} not stringified"`;
            separator = join;
          }
          if (separator !== "") {
            res = `
${indentation}${res}
${originalIndentation}`;
          }
          stack.pop();
          return `{${res}}`;
        }
        case "number":
          return isFinite(value) ? String(value) : fail ? fail(value) : "null";
        case "boolean":
          return value === true ? "true" : "false";
        case "undefined":
          return;
        case "bigint":
          if (bigint) {
            return String(value);
          }
        default:
          return fail ? fail(value) : undefined;
      }
    }
    function stringifySimple(key, value, stack) {
      switch (typeof value) {
        case "string":
          return strEscape(value);
        case "object": {
          if (value === null) {
            return "null";
          }
          if (typeof value.toJSON === "function") {
            value = value.toJSON(key);
            if (typeof value !== "object") {
              return stringifySimple(key, value, stack);
            }
            if (value === null) {
              return "null";
            }
          }
          if (stack.indexOf(value) !== -1) {
            return circularValue;
          }
          let res = "";
          const hasLength = value.length !== undefined;
          if (hasLength && Array.isArray(value)) {
            if (value.length === 0) {
              return "[]";
            }
            if (maximumDepth < stack.length + 1) {
              return '"[Array]"';
            }
            stack.push(value);
            const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
            let i2 = 0;
            for (;i2 < maximumValuesToStringify - 1; i2++) {
              const tmp2 = stringifySimple(String(i2), value[i2], stack);
              res += tmp2 !== undefined ? tmp2 : "null";
              res += ",";
            }
            const tmp = stringifySimple(String(i2), value[i2], stack);
            res += tmp !== undefined ? tmp : "null";
            if (value.length - 1 > maximumBreadth) {
              const removedKeys = value.length - maximumBreadth - 1;
              res += `,"... ${getItemCount(removedKeys)} not stringified"`;
            }
            stack.pop();
            return `[${res}]`;
          }
          let keys = Object.keys(value);
          const keyLength = keys.length;
          if (keyLength === 0) {
            return "{}";
          }
          if (maximumDepth < stack.length + 1) {
            return '"[Object]"';
          }
          let separator = "";
          let maximumPropertiesToStringify = Math.min(keyLength, maximumBreadth);
          if (hasLength && isTypedArrayWithEntries(value)) {
            res += stringifyTypedArray(value, ",", maximumBreadth);
            keys = keys.slice(value.length);
            maximumPropertiesToStringify -= value.length;
            separator = ",";
          }
          if (deterministic) {
            keys = sort(keys, comparator);
          }
          stack.push(value);
          for (let i2 = 0;i2 < maximumPropertiesToStringify; i2++) {
            const key2 = keys[i2];
            const tmp = stringifySimple(key2, value[key2], stack);
            if (tmp !== undefined) {
              res += `${separator}${strEscape(key2)}:${tmp}`;
              separator = ",";
            }
          }
          if (keyLength > maximumBreadth) {
            const removedKeys = keyLength - maximumBreadth;
            res += `${separator}"...":"${getItemCount(removedKeys)} not stringified"`;
          }
          stack.pop();
          return `{${res}}`;
        }
        case "number":
          return isFinite(value) ? String(value) : fail ? fail(value) : "null";
        case "boolean":
          return value === true ? "true" : "false";
        case "undefined":
          return;
        case "bigint":
          if (bigint) {
            return String(value);
          }
        default:
          return fail ? fail(value) : undefined;
      }
    }
    function stringify2(value, replacer, space) {
      if (arguments.length > 1) {
        let spacer = "";
        if (typeof space === "number") {
          spacer = " ".repeat(Math.min(space, 10));
        } else if (typeof space === "string") {
          spacer = space.slice(0, 10);
        }
        if (replacer != null) {
          if (typeof replacer === "function") {
            return stringifyFnReplacer("", { "": value }, [], replacer, spacer, "");
          }
          if (Array.isArray(replacer)) {
            return stringifyArrayReplacer("", value, [], getUniqueReplacerSet(replacer), spacer, "");
          }
        }
        if (spacer.length !== 0) {
          return stringifyIndent("", value, [], spacer, "");
        }
      }
      return stringifySimple("", value, []);
    }
    return stringify2;
  }
});

// ../../betterspace/src/server/reducer-utils.ts
var makeError = (code, message) => new Error(`${code}: ${message}`);
var identityEquals = (a, b) => {
  const left = a;
  if (typeof left.isEqual === "function")
    return left.isEqual(b);
  const right = b;
  if (typeof left.toHexString === "function" && typeof right.toHexString === "function")
    return left.toHexString() === right.toHexString();
  return Object.is(a, b);
};
var timestampEquals = (a, b) => {
  const left = a;
  if (typeof left.isEqual === "function")
    return left.isEqual(b);
  const right = b;
  if (typeof left.toJSON === "function" && typeof right.toJSON === "function")
    return left.toJSON() === right.toJSON();
  return Object.is(a, b);
};
var makeOptionalFields = (fields) => {
  const params = {}, keys = Object.keys(fields);
  for (const key of keys) {
    const field = fields[key];
    params[key] = field.optional();
  }
  return params;
};
var pickPatch = (args, fieldNames) => {
  const patchRecord = {};
  for (const key of fieldNames) {
    const value = args[key];
    if (value !== undefined)
      patchRecord[key] = value;
  }
  return patchRecord;
};
var applyPatch = (row, patch, timestamp) => {
  const nextRecord = { ...row }, patchKeys = Object.keys(patch);
  for (const key of patchKeys)
    nextRecord[key] = patch[key];
  nextRecord.updatedAt = timestamp;
  return nextRecord;
};
var getOwnedRow = ({
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

// ../../betterspace/src/server/cache-crud.ts
var DAYS_PER_WEEK = 7;
var HOURS_PER_DAY = 24;
var MINUTES_PER_HOUR = 60;
var SECONDS_PER_MINUTE = 60;
var MILLIS_PER_SECOND = 1000;
var DEFAULT_TTL_MS = DAYS_PER_WEEK * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLIS_PER_SECOND;
var parseTimestampText = (value) => {
  const parsedNumber = Number(value);
  if (Number.isFinite(parsedNumber))
    return parsedNumber;
  const parsedDate = Date.parse(value);
  if (Number.isFinite(parsedDate))
    return parsedDate;
  return null;
};
var parseTimestampValue = (value) => {
  if (typeof value === "number" && Number.isFinite(value))
    return value;
  if (typeof value === "string")
    return parseTimestampText(value);
  return null;
};
var timestampToMs = (value) => {
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
var isExpired = (cachedAt, now, ttl) => timestampToMs(cachedAt) + ttl < timestampToMs(now);
var makeCacheCrud = (spacetimedb, config) => {
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
      const rowRecord = row, cachedAt = rowRecord.cachedAt;
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
// ../../betterspace/src/server/child.ts
var makeChildCrud = (spacetimedb, config) => {
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
// ../../betterspace/src/server/crud.ts
var makeCrud = (spacetimedb, config) => {
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
var ownedCascade = (_schema, config) => config;
// ../../betterspace/src/constants.ts
var BYTES_PER_KB = 1024;
var BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
var ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// ../../betterspace/src/server/file.ts
var DEFAULT_ALLOWED_TYPES = new Set([
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
var DEFAULT_MAX_FILE_SIZE_MB = 10;
var CHUNK_SIZE_MB = 5;
var HEX_RADIX = 16;
var YEAR_LENGTH = 4;
var SECONDS_IN_MILLISECOND = 1000;
var MAX_PRESIGN_EXPIRY_SECONDS = 604800;
var DEFAULT_MAX_FILE_SIZE = DEFAULT_MAX_FILE_SIZE_MB * BYTES_PER_MB;
var CHUNK_SIZE = CHUNK_SIZE_MB * BYTES_PER_MB;
var DEFAULT_PRESIGN_EXPIRY_SECONDS = 900;
var ZERO_PREFIX_REGEX = /^0x/u;
var TRAILING_SLASH_REGEX = /\/$/u;
var URI_EXTRA_REGEX = /[!'()*]/gu;
var normalizeHexIdentity = (sender) => {
  const senderLike = sender, raw = typeof senderLike.toHexString === "function" ? senderLike.toHexString() : senderLike.toString?.() ?? "";
  return raw.trim().toLowerCase().replace(ZERO_PREFIX_REGEX, "");
};
var isAuthenticatedSender = (sender) => {
  const normalized = normalizeHexIdentity(sender);
  if (!normalized)
    return false;
  for (const ch of normalized)
    if (ch !== "0")
      return true;
  return false;
};
var encodeUriSegment = (value) => encodeURIComponent(value).replace(URI_EXTRA_REGEX, (c) => `%${c.codePointAt(0).toString(HEX_RADIX).toUpperCase()}`);
var encodeCanonicalPath = (value) => {
  const segments = value.split("/"), out = [];
  for (const segment of segments)
    out.push(encodeUriSegment(segment));
  if (value.startsWith("/"))
    return `/${out.join("/")}`;
  return out.join("/");
};
var toHex = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (const byte of bytes)
    hex += byte.toString(HEX_RADIX).padStart(2, "0");
  return hex;
};
var toDateParts = (date) => {
  const year = date.getUTCFullYear().toString().padStart(YEAR_LENGTH, "0"), month = (date.getUTCMonth() + 1).toString().padStart(2, "0"), day = date.getUTCDate().toString().padStart(2, "0"), hours = date.getUTCHours().toString().padStart(2, "0"), minutes = date.getUTCMinutes().toString().padStart(2, "0"), seconds = date.getUTCSeconds().toString().padStart(2, "0");
  return {
    amzDate: `${year}${month}${day}T${hours}${minutes}${seconds}Z`,
    dateStamp: `${year}${month}${day}`
  };
};
var toCanonicalQuery = (params) => {
  const keys = Object.keys(params).toSorted(), pairs = [];
  for (const key of keys)
    pairs.push(`${encodeUriSegment(key)}=${encodeUriSegment(params[key] ?? "")}`);
  return pairs.join("&");
};
var hmac = async (key, message) => {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { hash: "SHA-256", name: "HMAC" }, false, ["sign"]), data = new TextEncoder().encode(message);
  return crypto.subtle.sign("HMAC", cryptoKey, data);
};
var sha256Hex = async (value) => {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toHex(hash);
};
var signingKey = async (secretAccessKey, dateStamp, region) => {
  const kDate = await hmac(new TextEncoder().encode(`AWS4${secretAccessKey}`), dateStamp), kRegion = await hmac(kDate, region), kService = await hmac(kRegion, "s3");
  return hmac(kService, "aws4_request");
};
var toHost = (endpoint) => endpoint.port ? `${endpoint.hostname}:${endpoint.port}` : endpoint.hostname;
var makePresignedRequest = async ({
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
var createS3UploadPresignedUrl = async (options) => makePresignedRequest({ ...options, method: "PUT" });
var createS3DownloadPresignedUrl = async (options) => makePresignedRequest({ ...options, method: "GET" });
var makeFileUpload = (spacetimedb, config) => {
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
// ../../../node_modules/base64-js/index.js
var $fromByteArray = fromByteArray;
var lookup = [];
var revLookup = [];
var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
for (i = 0, len = code.length;i < len; ++i) {
  lookup[i] = code[i];
  revLookup[code.charCodeAt(i)] = i;
}
var i;
var len;
revLookup[45] = 62;
revLookup[95] = 63;
function tripletToBase64(num) {
  return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
}
function encodeChunk(uint8, start, end) {
  var tmp;
  var output = [];
  for (var i2 = start;i2 < end; i2 += 3) {
    tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255);
    output.push(tripletToBase64(tmp));
  }
  return output.join("");
}
function fromByteArray(uint8) {
  var tmp;
  var len2 = uint8.length;
  var extraBytes = len2 % 3;
  var parts = [];
  var maxChunkLength = 16383;
  for (var i2 = 0, len22 = len2 - extraBytes;i2 < len22; i2 += maxChunkLength) {
    parts.push(encodeChunk(uint8, i2, i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength));
  }
  if (extraBytes === 1) {
    tmp = uint8[len2 - 1];
    parts.push(lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "==");
  } else if (extraBytes === 2) {
    tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
    parts.push(lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "=");
  }
  return parts.join("");
}

// ../../../node_modules/safe-stable-stringify/esm/wrapper.js
var import___ = __toESM(require_safe_stable_stringify(), 1);
var configure = import___.default.configure;
var stringify = import___.default;

// ../../../node_modules/zod/v4/core/core.js
var NEVER = Object.freeze({
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
    for (let i2 = 0;i2 < keys.length; i2++) {
      const k = keys[i2];
      if (!(k in inst)) {
        inst[k] = proto[k].bind(inst);
      }
    }
  }
  const Parent = params?.Parent ?? Object;

  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name });
  function _(def) {
    var _a;
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
var $brand = Symbol("zod_brand");

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
var globalConfig = {};
function config(newConfig) {
  if (newConfig)
    Object.assign(globalConfig, newConfig);
  return globalConfig;
}
// ../../../node_modules/zod/v4/core/util.js
var exports_util = {};
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
  const numericValues = Object.values(entries).filter((v) => typeof v === "number");
  const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
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
var EVALUATING = Symbol("evaluating");
function defineLazy(object, key, getter) {
  let value = undefined;
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
    for (let i2 = 0;i2 < keys.length; i2++) {
      resolvedObj[keys[i2]] = results[i2];
    }
    return resolvedObj;
  });
}
function randomString(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let str = "";
  for (let i2 = 0;i2 < length; i2++) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
}
function esc(str) {
  return JSON.stringify(str);
}
function slugify(input) {
  return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
var captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
var allowsEval = cached(() => {
  if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
    return false;
  }
  try {
    const F = Function;
    new F("");
    return true;
  } catch (_) {
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
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
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
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      keyCount++;
    }
  }
  return keyCount;
}
var getParsedType = (data) => {
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
var propertyKeyTypes = new Set(["string", "number", "symbol"]);
var primitiveTypes = new Set(["string", "number", "bigint", "boolean", "symbol", "undefined"]);
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
  });
}
var NUMBER_FORMAT_RANGES = {
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2147483648, 2147483647],
  uint32: [0, 4294967295],
  float32: [-340282346638528860000000000000000000000, 340282346638528860000000000000000000000],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
var BIGINT_FORMAT_RANGES = {
  int64: [/* @__PURE__ */ BigInt("-9223372036854775808"), /* @__PURE__ */ BigInt("9223372036854775807")],
  uint64: [/* @__PURE__ */ BigInt(0), /* @__PURE__ */ BigInt("18446744073709551615")]
};
function pick(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
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
  const checks = currDef.checks;
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
  const checks = schema._zod.def.checks;
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
  const checks = currDef.checks;
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
  for (let i2 = startIndex;i2 < x.issues.length; i2++) {
    if (x.issues[i2]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path, issues) {
  return issues.map((iss) => {
    var _a;
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
    case "number": {
      return Number.isNaN(data) ? "nan" : "number";
    }
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
  return Object.entries(obj).filter(([k, _]) => {
    return Number.isNaN(Number.parseInt(k, 10));
  }).map((el) => el[1]);
}
function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i2 = 0;i2 < binaryString.length; i2++) {
    bytes[i2] = binaryString.charCodeAt(i2);
  }
  return bytes;
}
function uint8ArrayToBase64(bytes) {
  let binaryString = "";
  for (let i2 = 0;i2 < bytes.length; i2++) {
    binaryString += String.fromCharCode(bytes[i2]);
  }
  return btoa(binaryString);
}
function base64urlToUint8Array(base64url) {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - base64.length % 4) % 4);
  return base64ToUint8Array(base64 + padding);
}
function uint8ArrayToBase64url(bytes) {
  return uint8ArrayToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function hexToUint8Array(hex) {
  const cleanHex = hex.replace(/^0x/, "");
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i2 = 0;i2 < cleanHex.length; i2 += 2) {
    bytes[i2 / 2] = Number.parseInt(cleanHex.slice(i2, i2 + 2), 16);
  }
  return bytes;
}
function uint8ArrayToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

class Class {
  constructor(..._args) {}
}

// ../../../node_modules/zod/v4/core/errors.js
var initializer = (inst, def) => {
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
var $ZodError = $constructor("$ZodError", initializer);
var $ZodRealError = $constructor("$ZodError", initializer, { Parent: Error });
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
        let i2 = 0;
        while (i2 < issue2.path.length) {
          const el = issue2.path[i2];
          const terminal = i2 === issue2.path.length - 1;
          if (!terminal) {
            curr[el] = curr[el] || { _errors: [] };
          } else {
            curr[el] = curr[el] || { _errors: [] };
            curr[el]._errors.push(mapper(issue2));
          }
          curr = curr[el];
          i2++;
        }
      }
    }
  };
  processError(error);
  return fieldErrors;
}

// ../../../node_modules/zod/v4/core/parse.js
var _parse = (_Err) => (schema, value, _ctx, _params) => {
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
var _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
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
var _safeParse = (_Err) => (schema, value, _ctx) => {
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
var safeParse = /* @__PURE__ */ _safeParse($ZodRealError);
var _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? {
    success: false,
    error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
var safeParseAsync = /* @__PURE__ */ _safeParseAsync($ZodRealError);
var _encode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _parse(_Err)(schema, value, ctx);
};
var _decode = (_Err) => (schema, value, _ctx) => {
  return _parse(_Err)(schema, value, _ctx);
};
var _encodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _parseAsync(_Err)(schema, value, ctx);
};
var _decodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _parseAsync(_Err)(schema, value, _ctx);
};
var _safeEncode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _safeParse(_Err)(schema, value, ctx);
};
var _safeDecode = (_Err) => (schema, value, _ctx) => {
  return _safeParse(_Err)(schema, value, _ctx);
};
var _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _safeParseAsync(_Err)(schema, value, ctx);
};
var _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _safeParseAsync(_Err)(schema, value, _ctx);
};
// ../../../node_modules/zod/v4/core/regexes.js
var dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
var date = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
var integer = /^-?\d+$/;
var number = /^-?\d+(?:\.\d+)?$/;

// ../../../node_modules/zod/v4/core/checks.js
var $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
  var _a;
  inst._zod ?? (inst._zod = {});
  inst._zod.def = def;
  (_a = inst._zod).onattach ?? (_a.onattach = []);
});
var numericOriginMap = {
  number: "number",
  bigint: "bigint",
  object: "date"
};
var $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
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
var $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
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
var $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    var _a;
    (_a = inst2._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
  });
  inst._zod.check = (payload) => {
    if (typeof payload.value !== typeof def.value)
      throw new Error("Cannot mix number and bigint in multiple_of check.");
    const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0;
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
var $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
  $ZodCheck.init(inst, def);
  def.format = def.format || "float64";
  const isInt = def.format?.includes("int");
  const origin = isInt ? "int" : "number";
  const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
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
var $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
  var _a;
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
    const length = input.length;
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
var $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
  var _a;
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
    const length = input.length;
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
var $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
  var _a;
  $ZodCheck.init(inst, def);
  (_a = inst._zod.def).when ?? (_a.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== undefined;
  });
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.minimum = def.length;
    bag.maximum = def.length;
    bag.length = def.length;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
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
var $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.check = (payload) => {
    payload.value = def.tx(payload.value);
  };
});

// ../../../node_modules/zod/v4/core/doc.js
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
    const lines = [...content.map((x) => `  ${x}`)];
    return new F(...args, lines.join(`
`));
  }
}

// ../../../node_modules/zod/v4/core/versions.js
var version = {
  major: 4,
  minor: 3,
  patch: 6
};

// ../../../node_modules/zod/v4/core/schemas.js
var $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
  var _a;
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
        return asyncResult.then(() => {
          return payload;
        });
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
          return canary.then((canary2) => {
            return handleCanaryResult(canary2, payload, ctx);
          });
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
      } catch (_) {
        return safeParseAsync(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
      }
    },
    vendor: "zod",
    version: 1
  }));
});
var $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = inst._zod.bag.pattern ?? number;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Number(payload.value);
      } catch (_) {}
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
var $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumberFormat", (inst, def) => {
  $ZodCheckNumberFormat.init(inst, def);
  $ZodNumber.init(inst, def);
});
var $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
var $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
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
var $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
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
    for (let i2 = 0;i2 < input.length; i2++) {
      const item = input[i2];
      const result = def.element._zod.run({
        value: item,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleArrayResult(result2, payload, i2)));
      } else {
        handleArrayResult(result, payload, i2);
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
  const keySet = def.keySet;
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
  return Promise.all(proms).then(() => {
    return payload;
  });
}
var $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
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
    const shape = def.shape;
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
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
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
    const shape = value.shape;
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
var $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
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
      ids[key] = `key_${counter++}`;
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
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
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
var $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : undefined);
  defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : undefined);
  defineLazy(inst._zod, "values", () => {
    if (def.options.every((o) => o._zod.values)) {
      return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
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
    return Promise.all(results).then((results2) => {
      return handleUnionResults(results2, payload, inst, ctx);
    });
  };
});
var $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    const left = def.left._zod.run({ value: input, issues: [] }, ctx);
    const right = def.right._zod.run({ value: input, issues: [] }, ctx);
    const async = left instanceof Promise || right instanceof Promise;
    if (async) {
      return Promise.all([left, right]).then(([left2, right2]) => {
        return handleIntersectionResults(payload, left2, right2);
      });
    }
    return handleIntersectionResults(payload, left, right);
  };
});
function mergeValues(a, b) {
  if (a === b) {
    return { valid: true, data: a };
  }
  if (a instanceof Date && b instanceof Date && +a === +b) {
    return { valid: true, data: a };
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const bKeys = Object.keys(b);
    const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
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
    for (let index = 0;index < a.length; index++) {
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
var $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
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
var $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
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
var $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  inst._zod.optout = "optional";
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? new Set([...def.innerType._zod.values, undefined]) : undefined;
  });
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
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
var $ZodExactOptional = /* @__PURE__ */ $constructor("$ZodExactOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
  inst._zod.parse = (payload, ctx) => {
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : undefined;
  });
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? new Set([...def.innerType._zod.values, null]) : undefined;
  });
  inst._zod.parse = (payload, ctx) => {
    if (payload.value === null)
      return payload;
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
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
var $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
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
var $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
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
var $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
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
var $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
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
var $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
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
var $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
  $ZodCheck.init(inst, def);
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _) => {
    return payload;
  };
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
// ../../../node_modules/zod/v4/core/registries.js
var _a;
var $output = Symbol("ZodOutput");
var $input = Symbol("ZodInput");

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
      const pm = { ...this.get(p) ?? {} };
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
var globalRegistry = globalThis.__zod_globalRegistry;
// ../../../node_modules/zod/v4/core/api.js
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
// ../../../node_modules/zod/v4/core/to-json-schema.js
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
  var _a2;
  const def = schema._zod.def;
  const seen = ctx.seen.get(schema);
  if (seen) {
    seen.count++;
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
    const parent = schema._zod.parent;
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
      const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
      entry[1].defId = id;
      return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}` };
    }
    if (entry[1] === root) {
      return { ref: "#" };
    }
    const uriPrefix = `#`;
    const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
    const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
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
    const ref = seen.ref;
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
    const parent = zodSchema._zod.parent;
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
  for (const entry of [...ctx.seen.entries()].reverse()) {
    flattenRef(entry[0]);
  }
  const result = {};
  if (ctx.target === "draft-2020-12") {
    result.$schema = "https://json-schema.org/draft/2020-12/schema";
  } else if (ctx.target === "draft-07") {
    result.$schema = "http://json-schema.org/draft-07/schema#";
  } else if (ctx.target === "draft-04") {
    result.$schema = "http://json-schema.org/draft-04/schema#";
  } else if (ctx.target === "openapi-3.0") {} else {}
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
  if (ctx.external) {} else {
    if (Object.keys(defs).length > 0) {
      if (ctx.target === "draft-2020-12") {
        result.$defs = defs;
      } else {
        result.definitions = defs;
      }
    }
  }
  try {
    const finalized = JSON.parse(JSON.stringify(result));
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
  } catch (_err) {
    throw new Error("Error converting schema to JSON.");
  }
}
function isTransforming(_schema, _ctx) {
  const ctx = _ctx ?? { seen: new Set };
  if (ctx.seen.has(_schema))
    return false;
  ctx.seen.add(_schema);
  const def = _schema._zod.def;
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
var createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
  const ctx = initializeContext({ ...params, processors });
  process2(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
};
var createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
  const { libraryOptions, target } = params ?? {};
  const ctx = initializeContext({ ...libraryOptions ?? {}, target, io, processors });
  process2(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
};
// ../../../node_modules/zod/v4/core/json-schema-processors.js
var numberProcessor = (schema, ctx, _json, _params) => {
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
var neverProcessor = (_schema, _ctx, json, _params) => {
  json.not = {};
};
var unknownProcessor = (_schema, _ctx, _json, _params) => {};
var enumProcessor = (schema, _ctx, json, _params) => {
  const def = schema._zod.def;
  const values = getEnumValues(def.entries);
  if (values.every((v) => typeof v === "number"))
    json.type = "number";
  if (values.every((v) => typeof v === "string"))
    json.type = "string";
  json.enum = values;
};
var customProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Custom types cannot be represented in JSON Schema");
  }
};
var transformProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Transforms cannot be represented in JSON Schema");
  }
};
var arrayProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  const { minimum, maximum } = schema._zod.bag;
  if (typeof minimum === "number")
    json.minItems = minimum;
  if (typeof maximum === "number")
    json.maxItems = maximum;
  json.type = "array";
  json.items = process2(def.element, ctx, { ...params, path: [...params.path, "items"] });
};
var objectProcessor = (schema, ctx, _json, params) => {
  const json = _json;
  const def = schema._zod.def;
  json.type = "object";
  json.properties = {};
  const shape = def.shape;
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
    } else {
      return v.optout === undefined;
    }
  }));
  if (requiredKeys.size > 0) {
    json.required = Array.from(requiredKeys);
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
var unionProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const isExclusive = def.inclusive === false;
  const options = def.options.map((x, i2) => process2(x, ctx, {
    ...params,
    path: [...params.path, isExclusive ? "oneOf" : "anyOf", i2]
  }));
  if (isExclusive) {
    json.oneOf = options;
  } else {
    json.anyOf = options;
  }
};
var intersectionProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
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
var nullableProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  const inner = process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  if (ctx.target === "openapi-3.0") {
    seen.ref = def.innerType;
    json.nullable = true;
  } else {
    json.anyOf = [inner, { type: "null" }];
  }
};
var nonoptionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
var defaultProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json.default = JSON.parse(JSON.stringify(def.defaultValue));
};
var prefaultProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  if (ctx.io === "input")
    json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
};
var catchProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  let catchValue;
  try {
    catchValue = def.catchValue(undefined);
  } catch {
    throw new Error("Dynamic catch values are not supported in JSON Schema");
  }
  json.default = catchValue;
};
var pipeProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  const innerType = ctx.io === "input" ? def.in._zod.def.type === "transform" ? def.out : def.in : def.out;
  process2(innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = innerType;
};
var readonlyProcessor = (schema, ctx, json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json.readOnly = true;
};
var optionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process2(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
// ../../../node_modules/zod/v4/classic/errors.js
var initializer2 = (inst, issues) => {
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
var ZodError = $constructor("ZodError", initializer2);
var ZodRealError = $constructor("ZodError", initializer2, {
  Parent: Error
});

// ../../../node_modules/zod/v4/classic/parse.js
var parse3 = /* @__PURE__ */ _parse(ZodRealError);
var parseAsync2 = /* @__PURE__ */ _parseAsync(ZodRealError);
var safeParse2 = /* @__PURE__ */ _safeParse(ZodRealError);
var safeParseAsync2 = /* @__PURE__ */ _safeParseAsync(ZodRealError);
var encode = /* @__PURE__ */ _encode(ZodRealError);
var decode = /* @__PURE__ */ _decode(ZodRealError);
var encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
var decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
var safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
var safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
var safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
var safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);

// ../../../node_modules/zod/v4/classic/schemas.js
var ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
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
  inst.check = (...checks2) => {
    return inst.clone(exports_util.mergeDefs(def, {
      checks: [
        ...def.checks ?? [],
        ...checks2.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
      ]
    }), {
      parent: true
    });
  };
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
  inst.isOptional = () => inst.safeParse(undefined).success;
  inst.isNullable = () => inst.safeParse(null).success;
  inst.apply = (fn) => fn(inst);
  return inst;
});
var ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
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
  const bag = inst._zod.bag;
  inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
  inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
  inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? 0.5);
  inst.isFinite = true;
  inst.format = bag.format ?? null;
});
function number2(params) {
  return _number(ZodNumber, params);
}
var ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
  $ZodNumberFormat.init(inst, def);
  ZodNumber.init(inst, def);
});
function int(params) {
  return _int(ZodNumberFormat, params);
}
var ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
  $ZodUnknown.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => unknownProcessor(inst, ctx, json, params);
});
function unknown() {
  return _unknown(ZodUnknown);
}
var ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
  $ZodNever.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
});
function never(params) {
  return _never(ZodNever, params);
}
var ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
  $ZodArray.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
  inst.element = def.element;
  inst.min = (minLength, params) => inst.check(_minLength(minLength, params));
  inst.nonempty = (params) => inst.check(_minLength(1, params));
  inst.max = (maxLength, params) => inst.check(_maxLength(maxLength, params));
  inst.length = (len2, params) => inst.check(_length(len2, params));
  inst.unwrap = () => inst.element;
});
function array(element, params) {
  return _array(ZodArray, element, params);
}
var ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
  $ZodObjectJIT.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
  exports_util.defineLazy(inst, "shape", () => {
    return def.shape;
  });
  inst.keyof = () => _enum(Object.keys(inst._zod.def.shape));
  inst.catchall = (catchall) => inst.clone({ ...inst._zod.def, catchall });
  inst.passthrough = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
  inst.loose = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
  inst.strict = () => inst.clone({ ...inst._zod.def, catchall: never() });
  inst.strip = () => inst.clone({ ...inst._zod.def, catchall: undefined });
  inst.extend = (incoming) => {
    return exports_util.extend(inst, incoming);
  };
  inst.safeExtend = (incoming) => {
    return exports_util.safeExtend(inst, incoming);
  };
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
var ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
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
var ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
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
var ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
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
var ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
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
var ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
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
var ZodExactOptional = /* @__PURE__ */ $constructor("ZodExactOptional", (inst, def) => {
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
var ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
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
var ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
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
var ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
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
var ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
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
var ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
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
var ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
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
var ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
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
var ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
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

// ../../betterspace/src/zod.ts
var WRAPPERS = new Set([
  "catch",
  "default",
  "nullable",
  "optional",
  "prefault",
  "readonly"
]);
var unwrapZod = (schema) => {
  let cur = schema;
  while (cur && typeof cur === "object" && "type" in cur) {
    if (!WRAPPERS.has(cur.type))
      return { def: cur.def, schema: cur, type: cur.type };
    cur = cur.def.innerType;
  }
  return { def: undefined, schema: undefined, type: "" };
};
var elementOf = (s) => s?.def?.element;
var isArrayType = (t) => t === "array";

// ../../betterspace/src/server/bridge.ts
var idx = (fn) => fn;

// ../../betterspace/src/server/types/common.ts
var ERROR_MESSAGES = {
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
// ../../betterspace/src/server/helpers.ts
class SenderError extends Error {
  constructor(message) {
    super(message);
    this.name = "SenderError";
  }
}
var SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
var log = (level, msg, data) => {
  console[level](JSON.stringify({ level, msg, ts: Date.now(), ...data }));
};
var isRecord = (v) => Boolean(v) && typeof v === "object";
var pgOpts = object({
  limit: number2().optional(),
  numItems: number2().optional(),
  offset: number2().optional()
});
var serializeError = (data) => `${data.code}:${JSON.stringify(data)}`;
var err = (code2, opts) => {
  if (!opts)
    throw new SenderError(serializeError({ code: code2 }));
  if (typeof opts !== "string")
    throw new SenderError(serializeError({ code: code2, ...opts }));
  const sep = opts.indexOf(":"), data = sep > 0 ? { code: code2, debug: opts, op: opts.slice(sep + 1), table: opts.slice(0, sep) } : { code: code2, debug: opts };
  throw new SenderError(serializeError(data));
};
var time2 = (timestamp) => ({ updatedAt: timestamp ?? Date.now() });
var errValidation = (code2, zodError) => {
  const { fieldErrors: raw } = zodError.flatten(), fields = [], fieldErrors = {};
  for (const k of Object.keys(raw)) {
    const first = raw[k]?.[0];
    if (first) {
      fields.push(k);
      fieldErrors[k] = first;
    }
  }
  throw new SenderError(serializeError({
    code: code2,
    fieldErrors,
    fields,
    message: fields.length ? `Invalid: ${fields.join(", ")}` : "Validation failed"
  }));
};
var checkRateLimit = async (db, opts) => {
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
    const windowStart = existing.windowStart, retryAfter = config2.window - (now - windowStart);
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
var parseSenderMessage = (message) => {
  const sep = message.indexOf(":");
  if (sep <= 0)
    return;
  const code2 = message.slice(0, sep);
  if (!(code2 in ERROR_MESSAGES))
    return;
  const rest = message.slice(sep + 1).trim(), data = { code: code2 };
  if (rest.startsWith("{") && rest.endsWith("}")) {
    try {
      const parsed = JSON.parse(rest);
      return {
        code: code2,
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
var extractErrorData = (e) => {
  if (isRecord(e)) {
    const { data } = e;
    if (isRecord(data)) {
      const { code: code2 } = data;
      if (typeof code2 === "string" && code2 in ERROR_MESSAGES) {
        return {
          code: code2,
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
var getErrorCode = (e) => extractErrorData(e)?.code;
var getErrorMessage = (e) => {
  const d = extractErrorData(e);
  if (d)
    return d.message ?? ERROR_MESSAGES[d.code];
  if (e instanceof Error)
    return e.message;
  return "Unknown error";
};
var getErrorDetail = (e) => {
  const d = extractErrorData(e);
  if (!d)
    return e instanceof Error ? e.message : "Unknown error";
  const base = d.message ?? ERROR_MESSAGES[d.code];
  let detail = d.table ? `${base} [${d.table}${d.op ? `:${d.op}` : ""}]` : base;
  if (d.retryAfter !== undefined)
    detail += ` (retry after ${d.retryAfter}ms)`;
  return detail;
};
var handleError = (e, handlers) => {
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
var ok = (value) => ({ ok: true, value });
var fail = (code2, detail) => ({
  error: { code: code2, message: ERROR_MESSAGES[code2], ...detail },
  ok: false
});
var isMutationError = (e) => extractErrorData(e) !== undefined;
var isErrorCode = (e, code2) => {
  const d = extractErrorData(e);
  return d?.code === code2;
};
var matchError = (e, handlers) => {
  const d = extractErrorData(e);
  if (d) {
    const handler = handlers[d.code];
    if (handler)
      return handler(d);
  }
  return handlers._?.(e);
};
// ../../betterspace/src/server/middleware.ts
var withOp = (ctx, op) => ({ ...ctx, operation: op });
var composeMiddleware = (...middlewares) => {
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
var auditLog = (opts) => {
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
var DEFAULT_SLOW_THRESHOLD_MS = 500;
var slowQueryWarn = (opts) => {
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
var SCRIPT_TAG_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/giu;
var EVENT_HANDLER_PATTERN = /\bon\w+\s*=/giu;
var sanitizeString = (val) => val.replace(SCRIPT_TAG_PATTERN, "").replace(EVENT_HANDLER_PATTERN, "");
var sanitizeRec = (data) => {
  const result = {};
  for (const key of Object.keys(data)) {
    const v = data[key];
    result[key] = typeof v === "string" ? sanitizeString(v) : v;
  }
  return result;
};
var inputSanitize = (opts) => {
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
// ../../betterspace/src/server/org-invites.ts
var DAY_HOURS = 24;
var DAYS_PER_WEEK2 = 7;
var MILLIS_PER_SECOND2 = 1000;
var MINUTES_PER_HOUR2 = 60;
var SECONDS_PER_MINUTE2 = 60;
var SEVEN_DAYS_MS2 = DAYS_PER_WEEK2 * DAY_HOURS * MINUTES_PER_HOUR2 * SECONDS_PER_MINUTE2 * MILLIS_PER_SECOND2;
var TOKEN_BASE = 36;
var makeInviteToken = () => {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function")
    return cryptoApi.randomUUID();
  return `${Date.now()}_${Math.random().toString(TOKEN_BASE).slice(2)}`;
};
var findOrgMember = (orgMemberTable, orgId, userId) => {
  for (const member of orgMemberTable)
    if (Object.is(member.orgId, orgId) && identityEquals(member.userId, userId))
      return member;
  return null;
};
var getRole = (org, member, sender) => {
  if (identityEquals(org.userId, sender))
    return "owner";
  if (!member)
    return null;
  if (member.isAdmin)
    return "admin";
  return "member";
};
var requireAdminRole = ({
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
var findInviteByToken = (inviteByTokenIndex, token) => {
  for (const invite of inviteByTokenIndex)
    if (invite.token === token)
      return invite;
  return null;
};
var findPendingJoinRequest = (byOrgStatusIndex, orgId, userId) => {
  const pendingRows = byOrgStatusIndex.filterByOrgStatus(orgId, "pending");
  for (const request of pendingRows)
    if (identityEquals(request.userId, userId))
      return request;
  return null;
};
var resolveAcceptedInvite = ({
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
var completeInviteAcceptance = ({
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
var acceptInvite = ({
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
var makeInviteReducers = (spacetimedb, config2) => {
  const inviteReducer = spacetimedb.reducer({ name: "org_invite" }, {
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
      org_invite: inviteReducer,
      org_revoke_invite: revokeInviteReducer
    }
  };
};

// ../../betterspace/src/server/org-join.ts
var findOrgMember2 = (orgMemberTable, orgId, userId) => {
  for (const member of orgMemberTable)
    if (Object.is(member.orgId, orgId) && identityEquals(member.userId, userId))
      return member;
  return null;
};
var getRole2 = (org, member, sender) => {
  if (identityEquals(org.userId, sender))
    return "owner";
  if (!member)
    return null;
  if (member.isAdmin)
    return "admin";
  return "member";
};
var requireAdminRole2 = ({
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
var findPendingJoinRequestByUser = (byOrgStatusIndex, orgId, userId) => {
  const pendingRequests = byOrgStatusIndex.filterByOrgStatus(orgId, "pending");
  for (const request of pendingRequests)
    if (identityEquals(request.userId, userId))
      return request;
  return null;
};
var makeJoinReducers = (spacetimedb, config2) => {
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

// ../../betterspace/src/server/org-members.ts
var findOrgMember3 = (orgMemberTable, orgId, userId) => {
  for (const member of orgMemberTable)
    if (Object.is(member.orgId, orgId) && identityEquals(member.userId, userId))
      return member;
  return null;
};
var getRole3 = (org, member, sender) => {
  if (identityEquals(org.userId, sender))
    return "owner";
  if (!member)
    return null;
  if (member.isAdmin)
    return "admin";
  return "member";
};
var requireRole = ({
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
var makeMemberReducers = (spacetimedb, config2) => {
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

// ../../betterspace/src/server/org.ts
var makeOptionalFields2 = (fields) => {
  const optionalFields = {}, keys = Object.keys(fields);
  for (const key of keys) {
    const field = fields[key];
    if (typeof field.optional === "function")
      optionalFields[key] = field.optional();
  }
  return optionalFields;
};
var findOrgBySlug = (slugIndex, slug) => {
  for (const org of slugIndex)
    if (org.slug === slug)
      return org;
  return null;
};
var findOrgMember4 = (orgMemberTable, orgId, userId) => {
  for (const member of orgMemberTable)
    if (Object.is(member.orgId, orgId) && identityEquals(member.userId, userId))
      return member;
  return null;
};
var getRole4 = (org, member, sender) => {
  if (identityEquals(org.userId, sender))
    return "owner";
  if (!member)
    return null;
  if (member.isAdmin)
    return "admin";
  return "member";
};
var requireRole2 = ({
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
var applyOrgUpdate = (opts) => {
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
var removeByPk = (rows, pk, message) => {
  for (const row of rows) {
    const removed = pk.delete(row.id);
    if (!removed)
      throw makeError("NOT_FOUND", message);
  }
};
var removeCascadeRows = (cascadeTables, db, orgId) => {
  if (!cascadeTables)
    return;
  for (const cascadeTable of cascadeTables)
    for (const row of cascadeTable.rowsByOrg(db, orgId)) {
      const removed = cascadeTable.deleteById(db, row.id);
      if (!removed)
        throw makeError("NOT_FOUND", "org:remove_cascade");
    }
};
var removeMembersByOrg = (memberByOrgIndex, orgId, orgMemberTable) => {
  for (const member of memberByOrgIndex.filterByOrg(orgId)) {
    const removed = orgMemberTable.delete(member);
    if (!removed)
      throw makeError("NOT_FOUND", "org:remove_member");
  }
};
var mergeReducerExports = (...parts) => {
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
var makeOrg = (spacetimedb, config2) => {
  const orgFields = config2.fields, optionalOrgFields = makeOptionalFields2(orgFields), updateParams = {
    orgId: config2.builders.orgId
  }, optionalKeys2 = Object.keys(optionalOrgFields);
  for (const key of optionalKeys2) {
    const field = optionalOrgFields[key];
    if (field)
      updateParams[key] = field;
  }
  const createReducer = spacetimedb.reducer({ name: "org_create" }, orgFields, (ctx, args) => {
    const orgTable = config2.orgTable(ctx.db), orgSlugIndex = config2.orgSlugIndex(orgTable), { slug } = args;
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
// ../../betterspace/src/server/org-crud.ts
var applyOrgPatch = (row, patch, timestamp) => {
  const nextRecord = { ...row }, patchKeys = Object.keys(patch);
  for (const key of patchKeys)
    nextRecord[key] = patch[key];
  nextRecord.updatedAt = timestamp;
  return nextRecord;
};
var checkMembership = (orgMemberTable, orgId, sender) => {
  for (const member of orgMemberTable)
    if (Object.is(member.orgId, orgId) && identityEquals(member.userId, sender))
      return member;
  return null;
};
var requireMembership = ({
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
var requireCanMutate = ({
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
var getOrgOwnedRow = ({
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
var makeOrgCrud = (spacetimedb, config2) => {
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
var orgCascade = (_schema, config2) => config2;
// ../../betterspace/src/server/presence.ts
var HEARTBEAT_INTERVAL_MS = 15000;
var PRESENCE_TTL_MS = 30000;
var MICROS_PER_MILLISECOND = 1000n;
var ZERO_PREFIX_REGEX2 = /^0x/u;
var isAuthenticated = (sender) => {
  const senderLike = sender, raw = typeof senderLike.toHexString === "function" ? senderLike.toHexString() : senderLike.toString?.() ?? "", normalized = raw.trim().toLowerCase().replace(ZERO_PREFIX_REGEX2, "");
  if (!normalized)
    return false;
  for (const ch of normalized)
    if (ch !== "0")
      return true;
  return false;
};
var toMicros = (timestamp) => {
  const value = timestamp;
  return value.microsSinceUnixEpoch ?? 0n;
};
var findPresenceRow = (rows, roomId, sender) => {
  for (const row of rows)
    if (row.roomId === roomId && identityEquals(row.userId, sender))
      return row;
  return null;
};
var upsertPresence = ({
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
var presenceTable = (presence) => ({ presence });
var makePresence = (spacetimedb, config2) => {
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
// ../../betterspace/src/server/schema-helpers.ts
var tableDef = (kind, fields) => {
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
var asNever = (v) => v;
var zodShapeToFields = (shape) => {
  const out = {}, keys = Object.keys(shape);
  for (const k of keys) {
    const field = shape[k], { type } = unwrapZod(field);
    out[k] = type || "unknown";
  }
  return out;
};
var baseTable = (s) => asNever(tableDef("base", {
  ...zodShapeToFields(s.shape),
  updatedAt: "number"
}));
var ownedTable = (s) => asNever(tableDef("owned", {
  ...zodShapeToFields(s.shape),
  updatedAt: "number",
  userId: "identity"
}).index("by_user", ["userId"]));
var singletonTable = (s) => asNever(tableDef("singleton", {
  ...zodShapeToFields(s.shape),
  updatedAt: "number",
  userId: "identity"
}).index("by_user", ["userId"]));
var orgTable = (s) => asNever(tableDef("org", {
  ...zodShapeToFields(s.shape),
  orgId: "u32",
  updatedAt: "number",
  userId: "identity"
}).index("by_org", ["orgId"]).index("by_org_user", ["orgId", "userId"]));
var orgChildTable = (s, parent) => asNever(tableDef("org-child", {
  ...zodShapeToFields(s.shape),
  orgId: "u32",
  updatedAt: "number",
  userId: "identity"
}).index("by_org", ["orgId"]).index("by_parent", [parent.foreignKey]));
var childTable = (s, indexField, indexName) => asNever(tableDef("child", {
  ...zodShapeToFields(s.shape),
  updatedAt: "number"
}).index(indexName ?? `by_${indexField}`, [indexField]));
var orgTables = () => ({
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
var rateLimitTable = () => ({
  rateLimit: asNever(tableDef("system", {
    count: "number",
    key: "string",
    table: "string",
    windowStart: "number"
  }).index("by_table_key", ["table", "key"]))
});
var uploadTables = () => ({
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
var unsupportedTypes = new Set(["pipe", "transform"]);
var scanSchema = (schema, path, out) => {
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
var checkSchema = (schemas2) => {
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
// ../../betterspace/src/server/singleton.ts
var findByUser = (table, sender) => {
  for (const row of table)
    if (identityEquals(row.userId, sender))
      return row;
  return null;
};
var applyPatch2 = (row, patch, opts) => {
  const nextRecord = { ...row };
  for (const key of opts.fieldNames) {
    const value = patch[key];
    if (value !== undefined)
      nextRecord[key] = value;
  }
  nextRecord.updatedAt = opts.timestamp;
  return nextRecord;
};
var makeSingletonCrud = (spacetimedb, config2) => {
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
      table.update(nextRecord);
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
// ../../betterspace/src/server/setup.ts
var isPromiseLike = (value) => {
  if (!value || typeof value !== "object")
    return false;
  const { then } = value;
  return typeof then === "function";
};
var requireSync = (value, hookName) => {
  if (isPromiseLike(value))
    throw new Error(`Hook "${hookName}" must be synchronous in SpacetimeDB reducers`);
  return value;
};
var toGlobalCtx = (table, { db, sender, timestamp }) => ({ db, sender, table, timestamp });
var hasGlobalHooks = (hooks) => Boolean(hooks.beforeCreate ?? hooks.afterCreate ?? hooks.beforeUpdate ?? hooks.afterUpdate ?? hooks.beforeDelete ?? hooks.afterDelete);
var mergeGlobalBeforeCreate = (left, right) => {
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
var mergeGlobalAfterCreate = (left, right) => {
  if (!(left.afterCreate || right.afterCreate))
    return;
  return (ctx, args) => {
    if (left.afterCreate)
      requireSync(left.afterCreate(ctx, args), "global.afterCreate:left");
    if (right.afterCreate)
      requireSync(right.afterCreate(ctx, args), "global.afterCreate:right");
  };
};
var mergeGlobalBeforeUpdate = (left, right) => {
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
var mergeGlobalAfterUpdate = (left, right) => {
  if (!(left.afterUpdate || right.afterUpdate))
    return;
  return (ctx, args) => {
    if (left.afterUpdate)
      requireSync(left.afterUpdate(ctx, args), "global.afterUpdate:left");
    if (right.afterUpdate)
      requireSync(right.afterUpdate(ctx, args), "global.afterUpdate:right");
  };
};
var mergeGlobalBeforeDelete = (left, right) => {
  if (!(left.beforeDelete || right.beforeDelete))
    return;
  return (ctx, args) => {
    if (left.beforeDelete)
      requireSync(left.beforeDelete(ctx, args), "global.beforeDelete:left");
    if (right.beforeDelete)
      requireSync(right.beforeDelete(ctx, args), "global.beforeDelete:right");
  };
};
var mergeGlobalAfterDelete = (left, right) => {
  if (!(left.afterDelete || right.afterDelete))
    return;
  return (ctx, args) => {
    if (left.afterDelete)
      requireSync(left.afterDelete(ctx, args), "global.afterDelete:left");
    if (right.afterDelete)
      requireSync(right.afterDelete(ctx, args), "global.afterDelete:right");
  };
};
var mergeGlobalHooks = (left, right) => {
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
var hasCrudHooks = (hooks) => Boolean(hooks.beforeCreate ?? hooks.afterCreate ?? hooks.beforeUpdate ?? hooks.afterUpdate ?? hooks.beforeDelete ?? hooks.afterDelete);
var mergeCrudBeforeCreate = (table, globalHooks, localHooks) => {
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
var mergeCrudAfterCreate = (table, globalHooks, localHooks) => {
  if (!(globalHooks?.afterCreate || localHooks?.afterCreate))
    return;
  return (ctx, { data, row }) => {
    if (globalHooks?.afterCreate)
      requireSync(globalHooks.afterCreate(toGlobalCtx(table, ctx), { data, row }), "crud.afterCreate:global");
    if (localHooks?.afterCreate)
      requireSync(localHooks.afterCreate(ctx, { data, row }), "crud.afterCreate:local");
  };
};
var mergeCrudBeforeUpdate = (table, globalHooks, localHooks) => {
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
var mergeCrudAfterUpdate = (table, globalHooks, localHooks) => {
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
var mergeCrudBeforeDelete = (table, globalHooks, localHooks) => {
  if (!(globalHooks?.beforeDelete || localHooks?.beforeDelete))
    return;
  return (ctx, { row }) => {
    if (globalHooks?.beforeDelete)
      requireSync(globalHooks.beforeDelete(toGlobalCtx(table, ctx), { row }), "crud.beforeDelete:global");
    if (localHooks?.beforeDelete)
      requireSync(localHooks.beforeDelete(ctx, { row }), "crud.beforeDelete:local");
  };
};
var mergeCrudAfterDelete = (table, globalHooks, localHooks) => {
  if (!(globalHooks?.afterDelete || localHooks?.afterDelete))
    return;
  return (ctx, { row }) => {
    if (globalHooks?.afterDelete)
      requireSync(globalHooks.afterDelete(toGlobalCtx(table, ctx), { row }), "crud.afterDelete:global");
    if (localHooks?.afterDelete)
      requireSync(localHooks.afterDelete(ctx, { row }), "crud.afterDelete:local");
  };
};
var mergeCrudHooks = (table, globalHooks, localHooks) => {
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
var hasSingletonHooks = (hooks) => Boolean(hooks.beforeCreate ?? hooks.afterCreate ?? hooks.beforeUpdate ?? hooks.afterUpdate ?? hooks.beforeRead);
var mergeSingletonBeforeCreate = (table, globalHooks, localHooks) => {
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
var mergeSingletonAfterCreate = (table, globalHooks, localHooks) => {
  if (!(globalHooks?.afterCreate || localHooks?.afterCreate))
    return;
  return (ctx, { data, row }) => {
    if (globalHooks?.afterCreate)
      requireSync(globalHooks.afterCreate(toGlobalCtx(table, ctx), { data, row }), "singleton.afterCreate:global");
    if (localHooks?.afterCreate)
      requireSync(localHooks.afterCreate(ctx, { data, row }), "singleton.afterCreate:local");
  };
};
var mergeSingletonBeforeUpdate = (table, globalHooks, localHooks) => {
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
var mergeSingletonAfterUpdate = (table, globalHooks, localHooks) => {
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
var mergeSingletonHooks = (table, globalHooks, localHooks) => {
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
var registerExports = (target, next) => {
  const names = Object.keys(next);
  for (const name of names) {
    const reducer = next[name];
    if (reducer)
      target[name] = reducer;
  }
};
var setup = (spacetimedb, config2 = {}) => {
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
// ../../../node_modules/spacetimedb/dist/sdk/index.mjs
var TimeDuration = class _TimeDuration {
  __time_duration_micros__;
  static MICROS_PER_MILLIS = 1000n;
  static getAlgebraicType() {
    return AlgebraicType.Product({
      elements: [
        {
          name: "__time_duration_micros__",
          algebraicType: AlgebraicType.I64
        }
      ]
    });
  }
  static isTimeDuration(algebraicType) {
    if (algebraicType.tag !== "Product") {
      return false;
    }
    const elements = algebraicType.value.elements;
    if (elements.length !== 1) {
      return false;
    }
    const microsElement = elements[0];
    return microsElement.name === "__time_duration_micros__" && microsElement.algebraicType.tag === "I64";
  }
  get micros() {
    return this.__time_duration_micros__;
  }
  get millis() {
    return Number(this.micros / _TimeDuration.MICROS_PER_MILLIS);
  }
  constructor(micros) {
    this.__time_duration_micros__ = micros;
  }
  static fromMillis(millis) {
    return new _TimeDuration(BigInt(millis) * _TimeDuration.MICROS_PER_MILLIS);
  }
  toString() {
    const micros = this.micros;
    const sign = micros < 0 ? "-" : "+";
    const pos = micros < 0 ? -micros : micros;
    const secs = pos / 1000000n;
    const micros_remaining = pos % 1000000n;
    return `${sign}${secs}.${String(micros_remaining).padStart(6, "0")}`;
  }
};
var Timestamp = class _Timestamp {
  __timestamp_micros_since_unix_epoch__;
  static MICROS_PER_MILLIS = 1000n;
  get microsSinceUnixEpoch() {
    return this.__timestamp_micros_since_unix_epoch__;
  }
  constructor(micros) {
    this.__timestamp_micros_since_unix_epoch__ = micros;
  }
  static getAlgebraicType() {
    return AlgebraicType.Product({
      elements: [
        {
          name: "__timestamp_micros_since_unix_epoch__",
          algebraicType: AlgebraicType.I64
        }
      ]
    });
  }
  static isTimestamp(algebraicType) {
    if (algebraicType.tag !== "Product") {
      return false;
    }
    const elements = algebraicType.value.elements;
    if (elements.length !== 1) {
      return false;
    }
    const microsElement = elements[0];
    return microsElement.name === "__timestamp_micros_since_unix_epoch__" && microsElement.algebraicType.tag === "I64";
  }
  static UNIX_EPOCH = new _Timestamp(0n);
  static now() {
    return _Timestamp.fromDate(/* @__PURE__ */ new Date);
  }
  toMillis() {
    return this.microsSinceUnixEpoch / 1000n;
  }
  static fromDate(date2) {
    const millis = date2.getTime();
    const micros = BigInt(millis) * _Timestamp.MICROS_PER_MILLIS;
    return new _Timestamp(micros);
  }
  toDate() {
    const micros = this.__timestamp_micros_since_unix_epoch__;
    const millis = micros / _Timestamp.MICROS_PER_MILLIS;
    if (millis > BigInt(Number.MAX_SAFE_INTEGER) || millis < BigInt(Number.MIN_SAFE_INTEGER)) {
      throw new RangeError("Timestamp is outside of the representable range of JS's Date");
    }
    return new Date(Number(millis));
  }
  toISOString() {
    const micros = this.__timestamp_micros_since_unix_epoch__;
    const millis = micros / _Timestamp.MICROS_PER_MILLIS;
    if (millis > BigInt(Number.MAX_SAFE_INTEGER) || millis < BigInt(Number.MIN_SAFE_INTEGER)) {
      throw new RangeError("Timestamp is outside of the representable range for ISO string formatting");
    }
    const date2 = new Date(Number(millis));
    const isoBase = date2.toISOString();
    const microsRemainder = Math.abs(Number(micros % 1000000n));
    const fractionalPart = String(microsRemainder).padStart(6, "0");
    return isoBase.replace(/\.\d{3}Z$/, `.${fractionalPart}Z`);
  }
  since(other) {
    return new TimeDuration(this.__timestamp_micros_since_unix_epoch__ - other.__timestamp_micros_since_unix_epoch__);
  }
};
var Uuid = class _Uuid {
  __uuid__;
  static NIL = new _Uuid(0n);
  static MAX_UUID_BIGINT = 0xffffffffffffffffffffffffffffffffn;
  static MAX = new _Uuid(_Uuid.MAX_UUID_BIGINT);
  constructor(u) {
    if (u < 0n || u > _Uuid.MAX_UUID_BIGINT) {
      throw new Error("Invalid UUID: must be between 0 and `MAX_UUID_BIGINT`");
    }
    this.__uuid__ = u;
  }
  static fromRandomBytesV4(bytes) {
    if (bytes.length !== 16)
      throw new Error("UUID v4 requires 16 bytes");
    const arr = new Uint8Array(bytes);
    arr[6] = arr[6] & 15 | 64;
    arr[8] = arr[8] & 63 | 128;
    return new _Uuid(_Uuid.bytesToBigInt(arr));
  }
  static fromCounterV7(counter, now, randomBytes) {
    if (randomBytes.length !== 4) {
      throw new Error("`fromCounterV7` requires `randomBytes.length == 4`");
    }
    if (counter.value < 0) {
      throw new Error("`fromCounterV7` uuid `counter` must be non-negative");
    }
    if (now.__timestamp_micros_since_unix_epoch__ < 0) {
      throw new Error("`fromCounterV7` `timestamp` before unix epoch");
    }
    const counterVal = counter.value;
    counter.value = counterVal + 1 & 2147483647;
    const tsMs = now.toMillis() & 0xffffffffffffn;
    const bytes = new Uint8Array(16);
    bytes[0] = Number(tsMs >> 40n & 0xffn);
    bytes[1] = Number(tsMs >> 32n & 0xffn);
    bytes[2] = Number(tsMs >> 24n & 0xffn);
    bytes[3] = Number(tsMs >> 16n & 0xffn);
    bytes[4] = Number(tsMs >> 8n & 0xffn);
    bytes[5] = Number(tsMs & 0xffn);
    bytes[7] = counterVal >>> 23 & 255;
    bytes[9] = counterVal >>> 15 & 255;
    bytes[10] = counterVal >>> 7 & 255;
    bytes[11] = (counterVal & 127) << 1 & 255;
    bytes[12] |= randomBytes[0] & 127;
    bytes[13] = randomBytes[1];
    bytes[14] = randomBytes[2];
    bytes[15] = randomBytes[3];
    bytes[6] = bytes[6] & 15 | 112;
    bytes[8] = bytes[8] & 63 | 128;
    return new _Uuid(_Uuid.bytesToBigInt(bytes));
  }
  static parse(s) {
    const hex = s.replace(/-/g, "");
    if (hex.length !== 32)
      throw new Error("Invalid hex UUID");
    let v = 0n;
    for (let i2 = 0;i2 < 32; i2 += 2) {
      v = v << 8n | BigInt(parseInt(hex.slice(i2, i2 + 2), 16));
    }
    return new _Uuid(v);
  }
  toString() {
    const bytes = _Uuid.bigIntToBytes(this.__uuid__);
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
  }
  asBigInt() {
    return this.__uuid__;
  }
  toBytes() {
    return _Uuid.bigIntToBytes(this.__uuid__);
  }
  static bytesToBigInt(bytes) {
    let result = 0n;
    for (const b of bytes)
      result = result << 8n | BigInt(b);
    return result;
  }
  static bigIntToBytes(value) {
    const bytes = new Uint8Array(16);
    for (let i2 = 15;i2 >= 0; i2--) {
      bytes[i2] = Number(value & 0xffn);
      value >>= 8n;
    }
    return bytes;
  }
  getVersion() {
    const version2 = this.toBytes()[6] >> 4 & 15;
    switch (version2) {
      case 4:
        return "V4";
      case 7:
        return "V7";
      default:
        if (this == _Uuid.NIL) {
          return "Nil";
        }
        if (this == _Uuid.MAX) {
          return "Max";
        }
        throw new Error(`Unsupported UUID version: ${version2}`);
    }
  }
  getCounter() {
    const bytes = this.toBytes();
    const high = bytes[7];
    const mid1 = bytes[9];
    const mid2 = bytes[10];
    const low = bytes[11] >>> 1;
    return high << 23 | mid1 << 15 | mid2 << 7 | low | 0;
  }
  compareTo(other) {
    if (this.__uuid__ < other.__uuid__)
      return -1;
    if (this.__uuid__ > other.__uuid__)
      return 1;
    return 0;
  }
  static getAlgebraicType() {
    return AlgebraicType.Product({
      elements: [
        {
          name: "__uuid__",
          algebraicType: AlgebraicType.U128
        }
      ]
    });
  }
};
var BinaryReader = class {
  view;
  offset = 0;
  constructor(input) {
    this.view = input instanceof DataView ? input : new DataView(input.buffer, input.byteOffset, input.byteLength);
    this.offset = 0;
  }
  reset(view) {
    this.view = view;
    this.offset = 0;
  }
  get remaining() {
    return this.view.byteLength - this.offset;
  }
  #ensure(n) {
    if (this.offset + n > this.view.byteLength) {
      throw new RangeError(`Tried to read ${n} byte(s) at relative offset ${this.offset}, but only ${this.remaining} byte(s) remain`);
    }
  }
  readUInt8Array() {
    const length = this.readU32();
    this.#ensure(length);
    return this.readBytes(length);
  }
  readBool() {
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value !== 0;
  }
  readByte() {
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }
  readBytes(length) {
    const array2 = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, length);
    this.offset += length;
    return array2;
  }
  readI8() {
    const value = this.view.getInt8(this.offset);
    this.offset += 1;
    return value;
  }
  readU8() {
    return this.readByte();
  }
  readI16() {
    const value = this.view.getInt16(this.offset, true);
    this.offset += 2;
    return value;
  }
  readU16() {
    const value = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return value;
  }
  readI32() {
    const value = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }
  readU32() {
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }
  readI64() {
    const value = this.view.getBigInt64(this.offset, true);
    this.offset += 8;
    return value;
  }
  readU64() {
    const value = this.view.getBigUint64(this.offset, true);
    this.offset += 8;
    return value;
  }
  readU128() {
    const lowerPart = this.view.getBigUint64(this.offset, true);
    const upperPart = this.view.getBigUint64(this.offset + 8, true);
    this.offset += 16;
    return (upperPart << BigInt(64)) + lowerPart;
  }
  readI128() {
    const lowerPart = this.view.getBigUint64(this.offset, true);
    const upperPart = this.view.getBigInt64(this.offset + 8, true);
    this.offset += 16;
    return (upperPart << BigInt(64)) + lowerPart;
  }
  readU256() {
    const p0 = this.view.getBigUint64(this.offset, true);
    const p1 = this.view.getBigUint64(this.offset + 8, true);
    const p2 = this.view.getBigUint64(this.offset + 16, true);
    const p3 = this.view.getBigUint64(this.offset + 24, true);
    this.offset += 32;
    return (p3 << BigInt(3 * 64)) + (p2 << BigInt(2 * 64)) + (p1 << BigInt(1 * 64)) + p0;
  }
  readI256() {
    const p0 = this.view.getBigUint64(this.offset, true);
    const p1 = this.view.getBigUint64(this.offset + 8, true);
    const p2 = this.view.getBigUint64(this.offset + 16, true);
    const p3 = this.view.getBigInt64(this.offset + 24, true);
    this.offset += 32;
    return (p3 << BigInt(3 * 64)) + (p2 << BigInt(2 * 64)) + (p1 << BigInt(1 * 64)) + p0;
  }
  readF32() {
    const value = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return value;
  }
  readF64() {
    const value = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return value;
  }
  readString() {
    const uint8Array = this.readUInt8Array();
    return new TextDecoder("utf-8").decode(uint8Array);
  }
};
var ArrayBufferPrototypeTransfer = ArrayBuffer.prototype.transfer ?? function(newByteLength) {
  if (newByteLength === undefined) {
    return this.slice();
  } else if (newByteLength <= this.byteLength) {
    return this.slice(0, newByteLength);
  } else {
    const copy = new Uint8Array(newByteLength);
    copy.set(new Uint8Array(this));
    return copy.buffer;
  }
};
var ResizableBuffer = class {
  buffer;
  view;
  constructor(init) {
    this.buffer = typeof init === "number" ? new ArrayBuffer(init) : init;
    this.view = new DataView(this.buffer);
  }
  get capacity() {
    return this.buffer.byteLength;
  }
  grow(newSize) {
    if (newSize <= this.buffer.byteLength)
      return;
    this.buffer = ArrayBufferPrototypeTransfer.call(this.buffer, newSize);
    this.view = new DataView(this.buffer);
  }
};
var BinaryWriter = class {
  buffer;
  offset = 0;
  constructor(init) {
    this.buffer = typeof init === "number" ? new ResizableBuffer(init) : init;
  }
  reset(buffer) {
    this.buffer = buffer;
    this.offset = 0;
  }
  expandBuffer(additionalCapacity) {
    const minCapacity = this.offset + additionalCapacity + 1;
    if (minCapacity <= this.buffer.capacity)
      return;
    let newCapacity = this.buffer.capacity * 2;
    if (newCapacity < minCapacity)
      newCapacity = minCapacity;
    this.buffer.grow(newCapacity);
  }
  toBase64() {
    return $fromByteArray(this.getBuffer());
  }
  getBuffer() {
    return new Uint8Array(this.buffer.buffer, 0, this.offset);
  }
  get view() {
    return this.buffer.view;
  }
  writeUInt8Array(value) {
    const length = value.length;
    this.expandBuffer(4 + length);
    this.writeU32(length);
    new Uint8Array(this.buffer.buffer, this.offset).set(value);
    this.offset += length;
  }
  writeBool(value) {
    this.expandBuffer(1);
    this.view.setUint8(this.offset, value ? 1 : 0);
    this.offset += 1;
  }
  writeByte(value) {
    this.expandBuffer(1);
    this.view.setUint8(this.offset, value);
    this.offset += 1;
  }
  writeI8(value) {
    this.expandBuffer(1);
    this.view.setInt8(this.offset, value);
    this.offset += 1;
  }
  writeU8(value) {
    this.expandBuffer(1);
    this.view.setUint8(this.offset, value);
    this.offset += 1;
  }
  writeI16(value) {
    this.expandBuffer(2);
    this.view.setInt16(this.offset, value, true);
    this.offset += 2;
  }
  writeU16(value) {
    this.expandBuffer(2);
    this.view.setUint16(this.offset, value, true);
    this.offset += 2;
  }
  writeI32(value) {
    this.expandBuffer(4);
    this.view.setInt32(this.offset, value, true);
    this.offset += 4;
  }
  writeU32(value) {
    this.expandBuffer(4);
    this.view.setUint32(this.offset, value, true);
    this.offset += 4;
  }
  writeI64(value) {
    this.expandBuffer(8);
    this.view.setBigInt64(this.offset, value, true);
    this.offset += 8;
  }
  writeU64(value) {
    this.expandBuffer(8);
    this.view.setBigUint64(this.offset, value, true);
    this.offset += 8;
  }
  writeU128(value) {
    this.expandBuffer(16);
    const lowerPart = value & BigInt("0xFFFFFFFFFFFFFFFF");
    const upperPart = value >> BigInt(64);
    this.view.setBigUint64(this.offset, lowerPart, true);
    this.view.setBigUint64(this.offset + 8, upperPart, true);
    this.offset += 16;
  }
  writeI128(value) {
    this.expandBuffer(16);
    const lowerPart = value & BigInt("0xFFFFFFFFFFFFFFFF");
    const upperPart = value >> BigInt(64);
    this.view.setBigInt64(this.offset, lowerPart, true);
    this.view.setBigInt64(this.offset + 8, upperPart, true);
    this.offset += 16;
  }
  writeU256(value) {
    this.expandBuffer(32);
    const low_64_mask = BigInt("0xFFFFFFFFFFFFFFFF");
    const p0 = value & low_64_mask;
    const p1 = value >> BigInt(64 * 1) & low_64_mask;
    const p2 = value >> BigInt(64 * 2) & low_64_mask;
    const p3 = value >> BigInt(64 * 3);
    this.view.setBigUint64(this.offset + 8 * 0, p0, true);
    this.view.setBigUint64(this.offset + 8 * 1, p1, true);
    this.view.setBigUint64(this.offset + 8 * 2, p2, true);
    this.view.setBigUint64(this.offset + 8 * 3, p3, true);
    this.offset += 32;
  }
  writeI256(value) {
    this.expandBuffer(32);
    const low_64_mask = BigInt("0xFFFFFFFFFFFFFFFF");
    const p0 = value & low_64_mask;
    const p1 = value >> BigInt(64 * 1) & low_64_mask;
    const p2 = value >> BigInt(64 * 2) & low_64_mask;
    const p3 = value >> BigInt(64 * 3);
    this.view.setBigUint64(this.offset + 8 * 0, p0, true);
    this.view.setBigUint64(this.offset + 8 * 1, p1, true);
    this.view.setBigUint64(this.offset + 8 * 2, p2, true);
    this.view.setBigInt64(this.offset + 8 * 3, p3, true);
    this.offset += 32;
  }
  writeF32(value) {
    this.expandBuffer(4);
    this.view.setFloat32(this.offset, value, true);
    this.offset += 4;
  }
  writeF64(value) {
    this.expandBuffer(8);
    this.view.setFloat64(this.offset, value, true);
    this.offset += 8;
  }
  writeString(value) {
    const encoder = new TextEncoder;
    const encodedString = encoder.encode(value);
    this.writeUInt8Array(encodedString);
  }
};
function deepEqual(obj1, obj2) {
  if (obj1 === obj2)
    return true;
  if (typeof obj1 !== "object" || obj1 === null || typeof obj2 !== "object" || obj2 === null) {
    return false;
  }
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length)
    return false;
  for (const key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }
  return true;
}
function uint8ArrayToHexString(array2) {
  return Array.prototype.map.call(array2.reverse(), (x) => ("00" + x.toString(16)).slice(-2)).join("");
}
function uint8ArrayToU128(array2) {
  if (array2.length != 16) {
    throw new Error(`Uint8Array is not 16 bytes long: ${array2}`);
  }
  return new BinaryReader(array2).readU128();
}
function uint8ArrayToU256(array2) {
  if (array2.length != 32) {
    throw new Error(`Uint8Array is not 32 bytes long: [${array2}]`);
  }
  return new BinaryReader(array2).readU256();
}
function hexStringToUint8Array(str) {
  if (str.startsWith("0x")) {
    str = str.slice(2);
  }
  const matches = str.match(/.{1,2}/g) || [];
  const data = Uint8Array.from(matches.map((byte) => parseInt(byte, 16)));
  return data.reverse();
}
function hexStringToU128(str) {
  return uint8ArrayToU128(hexStringToUint8Array(str));
}
function hexStringToU256(str) {
  return uint8ArrayToU256(hexStringToUint8Array(str));
}
function u128ToUint8Array(data) {
  const writer = new BinaryWriter(16);
  writer.writeU128(data);
  return writer.getBuffer();
}
function u128ToHexString(data) {
  return uint8ArrayToHexString(u128ToUint8Array(data));
}
function u256ToUint8Array(data) {
  const writer = new BinaryWriter(32);
  writer.writeU256(data);
  return writer.getBuffer();
}
function u256ToHexString(data) {
  return uint8ArrayToHexString(u256ToUint8Array(data));
}
var hasOwn = Object.hasOwn;
var Identity = class _Identity {
  __identity__;
  constructor(data) {
    this.__identity__ = typeof data === "string" ? hexStringToU256(data) : data;
  }
  static getAlgebraicType() {
    return AlgebraicType.Product({
      elements: [{ name: "__identity__", algebraicType: AlgebraicType.U256 }]
    });
  }
  isEqual(other) {
    return this.toHexString() === other.toHexString();
  }
  equals(other) {
    return this.isEqual(other);
  }
  toHexString() {
    return u256ToHexString(this.__identity__);
  }
  toUint8Array() {
    return u256ToUint8Array(this.__identity__);
  }
  static fromString(str) {
    return new _Identity(str);
  }
  static zero() {
    return new _Identity(0n);
  }
  toString() {
    return this.toHexString();
  }
};
var SERIALIZERS = /* @__PURE__ */ new Map;
var DESERIALIZERS = /* @__PURE__ */ new Map;
var AlgebraicType = {
  Ref: (value) => ({ tag: "Ref", value }),
  Sum: (value) => ({
    tag: "Sum",
    value
  }),
  Product: (value) => ({
    tag: "Product",
    value
  }),
  Array: (value) => ({
    tag: "Array",
    value
  }),
  String: { tag: "String" },
  Bool: { tag: "Bool" },
  I8: { tag: "I8" },
  U8: { tag: "U8" },
  I16: { tag: "I16" },
  U16: { tag: "U16" },
  I32: { tag: "I32" },
  U32: { tag: "U32" },
  I64: { tag: "I64" },
  U64: { tag: "U64" },
  I128: { tag: "I128" },
  U128: { tag: "U128" },
  I256: { tag: "I256" },
  U256: { tag: "U256" },
  F32: { tag: "F32" },
  F64: { tag: "F64" },
  makeSerializer(ty, typespace) {
    if (ty.tag === "Ref") {
      if (!typespace)
        throw new Error("cannot serialize refs without a typespace");
      while (ty.tag === "Ref")
        ty = typespace.types[ty.value];
    }
    switch (ty.tag) {
      case "Product":
        return ProductType.makeSerializer(ty.value, typespace);
      case "Sum":
        return SumType.makeSerializer(ty.value, typespace);
      case "Array":
        if (ty.value.tag === "U8") {
          return serializeUint8Array;
        } else {
          const serialize = AlgebraicType.makeSerializer(ty.value, typespace);
          return (writer, value) => {
            writer.writeU32(value.length);
            for (const elem of value) {
              serialize(writer, elem);
            }
          };
        }
      default:
        return primitiveSerializers[ty.tag];
    }
  },
  serializeValue(writer, ty, value, typespace) {
    AlgebraicType.makeSerializer(ty, typespace)(writer, value);
  },
  makeDeserializer(ty, typespace) {
    if (ty.tag === "Ref") {
      if (!typespace)
        throw new Error("cannot deserialize refs without a typespace");
      while (ty.tag === "Ref")
        ty = typespace.types[ty.value];
    }
    switch (ty.tag) {
      case "Product":
        return ProductType.makeDeserializer(ty.value, typespace);
      case "Sum":
        return SumType.makeDeserializer(ty.value, typespace);
      case "Array":
        if (ty.value.tag === "U8") {
          return deserializeUint8Array;
        } else {
          const deserialize = AlgebraicType.makeDeserializer(ty.value, typespace);
          return (reader) => {
            const length = reader.readU32();
            const result = Array(length);
            for (let i2 = 0;i2 < length; i2++) {
              result[i2] = deserialize(reader);
            }
            return result;
          };
        }
      default:
        return primitiveDeserializers[ty.tag];
    }
  },
  deserializeValue(reader, ty, typespace) {
    return AlgebraicType.makeDeserializer(ty, typespace)(reader);
  },
  intoMapKey: function(ty, value) {
    switch (ty.tag) {
      case "U8":
      case "U16":
      case "U32":
      case "U64":
      case "U128":
      case "U256":
      case "I8":
      case "I16":
      case "I32":
      case "I64":
      case "I128":
      case "I256":
      case "F32":
      case "F64":
      case "String":
      case "Bool":
        return value;
      case "Product":
        return ProductType.intoMapKey(ty.value, value);
      default: {
        const writer = new BinaryWriter(10);
        AlgebraicType.serializeValue(writer, ty, value);
        return writer.toBase64();
      }
    }
  }
};
function bindCall(f) {
  return Function.prototype.call.bind(f);
}
var primitiveSerializers = {
  Bool: bindCall(BinaryWriter.prototype.writeBool),
  I8: bindCall(BinaryWriter.prototype.writeI8),
  U8: bindCall(BinaryWriter.prototype.writeU8),
  I16: bindCall(BinaryWriter.prototype.writeI16),
  U16: bindCall(BinaryWriter.prototype.writeU16),
  I32: bindCall(BinaryWriter.prototype.writeI32),
  U32: bindCall(BinaryWriter.prototype.writeU32),
  I64: bindCall(BinaryWriter.prototype.writeI64),
  U64: bindCall(BinaryWriter.prototype.writeU64),
  I128: bindCall(BinaryWriter.prototype.writeI128),
  U128: bindCall(BinaryWriter.prototype.writeU128),
  I256: bindCall(BinaryWriter.prototype.writeI256),
  U256: bindCall(BinaryWriter.prototype.writeU256),
  F32: bindCall(BinaryWriter.prototype.writeF32),
  F64: bindCall(BinaryWriter.prototype.writeF64),
  String: bindCall(BinaryWriter.prototype.writeString)
};
Object.freeze(primitiveSerializers);
var serializeUint8Array = bindCall(BinaryWriter.prototype.writeUInt8Array);
var primitiveDeserializers = {
  Bool: bindCall(BinaryReader.prototype.readBool),
  I8: bindCall(BinaryReader.prototype.readI8),
  U8: bindCall(BinaryReader.prototype.readU8),
  I16: bindCall(BinaryReader.prototype.readI16),
  U16: bindCall(BinaryReader.prototype.readU16),
  I32: bindCall(BinaryReader.prototype.readI32),
  U32: bindCall(BinaryReader.prototype.readU32),
  I64: bindCall(BinaryReader.prototype.readI64),
  U64: bindCall(BinaryReader.prototype.readU64),
  I128: bindCall(BinaryReader.prototype.readI128),
  U128: bindCall(BinaryReader.prototype.readU128),
  I256: bindCall(BinaryReader.prototype.readI256),
  U256: bindCall(BinaryReader.prototype.readU256),
  F32: bindCall(BinaryReader.prototype.readF32),
  F64: bindCall(BinaryReader.prototype.readF64),
  String: bindCall(BinaryReader.prototype.readString)
};
Object.freeze(primitiveDeserializers);
var deserializeUint8Array = bindCall(BinaryReader.prototype.readUInt8Array);
var primitiveSizes = {
  Bool: 1,
  I8: 1,
  U8: 1,
  I16: 2,
  U16: 2,
  I32: 4,
  U32: 4,
  I64: 8,
  U64: 8,
  I128: 16,
  U128: 16,
  I256: 32,
  U256: 32,
  F32: 4,
  F64: 8
};
var fixedSizePrimitives = new Set(Object.keys(primitiveSizes));
var isFixedSizeProduct = (ty) => ty.elements.every(({ algebraicType }) => fixedSizePrimitives.has(algebraicType.tag));
var productSize = (ty) => ty.elements.reduce((acc, { algebraicType }) => acc + primitiveSizes[algebraicType.tag], 0);
var primitiveJSName = {
  Bool: "Uint8",
  I8: "Int8",
  U8: "Uint8",
  I16: "Int16",
  U16: "Uint16",
  I32: "Int32",
  U32: "Uint32",
  I64: "BigInt64",
  U64: "BigUint64",
  F32: "Float32",
  F64: "Float64"
};
var specialProductDeserializers = {
  __time_duration_micros__: (reader) => new TimeDuration(reader.readI64()),
  __timestamp_micros_since_unix_epoch__: (reader) => new Timestamp(reader.readI64()),
  __identity__: (reader) => new Identity(reader.readU256()),
  __connection_id__: (reader) => new ConnectionId(reader.readU128()),
  __uuid__: (reader) => new Uuid(reader.readU128())
};
Object.freeze(specialProductDeserializers);
var unitDeserializer = () => ({});
var getElementInitializer = (element) => {
  let init;
  switch (element.algebraicType.tag) {
    case "String":
      init = "''";
      break;
    case "Bool":
      init = "false";
      break;
    case "I8":
    case "U8":
    case "I16":
    case "U16":
    case "I32":
    case "U32":
      init = "0";
      break;
    case "I64":
    case "U64":
    case "I128":
    case "U128":
    case "I256":
    case "U256":
      init = "0n";
      break;
    case "F32":
    case "F64":
      init = "0.0";
      break;
    default:
      init = "undefined";
  }
  return `${element.name}: ${init}`;
};
var ProductType = {
  makeSerializer(ty, typespace) {
    let serializer = SERIALIZERS.get(ty);
    if (serializer != null)
      return serializer;
    if (isFixedSizeProduct(ty)) {
      const size = productSize(ty);
      const body2 = `"use strict";
writer.expandBuffer(${size});
const view = writer.view;
${ty.elements.map(({ name, algebraicType: { tag } }) => (tag in primitiveJSName) ? `view.set${primitiveJSName[tag]}(writer.offset, value.${name}, ${primitiveSizes[tag] > 1 ? "true" : ""});
writer.offset += ${primitiveSizes[tag]};` : `writer.write${tag}(value.${name});`).join(`
`)}`;
      serializer = Function("writer", "value", body2);
      SERIALIZERS.set(ty, serializer);
      return serializer;
    }
    const serializers = {};
    const body = `"use strict";
` + ty.elements.map((element) => `this.${element.name}(writer, value.${element.name});`).join(`
`);
    serializer = Function("writer", "value", body).bind(serializers);
    SERIALIZERS.set(ty, serializer);
    for (const { name, algebraicType } of ty.elements) {
      serializers[name] = AlgebraicType.makeSerializer(algebraicType, typespace);
    }
    Object.freeze(serializers);
    return serializer;
  },
  serializeValue(writer, ty, value, typespace) {
    ProductType.makeSerializer(ty, typespace)(writer, value);
  },
  makeDeserializer(ty, typespace) {
    switch (ty.elements.length) {
      case 0:
        return unitDeserializer;
      case 1: {
        const fieldName = ty.elements[0].name;
        if (hasOwn(specialProductDeserializers, fieldName))
          return specialProductDeserializers[fieldName];
      }
    }
    let deserializer = DESERIALIZERS.get(ty);
    if (deserializer != null)
      return deserializer;
    if (isFixedSizeProduct(ty)) {
      const body = `"use strict";
const result = { ${ty.elements.map(getElementInitializer).join(", ")} };
const view = reader.view;
${ty.elements.map(({ name, algebraicType: { tag } }) => (tag in primitiveJSName) ? `result.${name} = view.get${primitiveJSName[tag]}(reader.offset, ${primitiveSizes[tag] > 1 ? "true" : ""});
reader.offset += ${primitiveSizes[tag]};` : `result.${name} = reader.read${tag}();`).join(`
`)}
return result;`;
      deserializer = Function("reader", body);
      DESERIALIZERS.set(ty, deserializer);
      return deserializer;
    }
    const deserializers = {};
    deserializer = Function("reader", `"use strict";
const result = { ${ty.elements.map(getElementInitializer).join(", ")} };
${ty.elements.map(({ name }) => `result.${name} = this.${name}(reader);`).join(`
`)}
return result;`).bind(deserializers);
    DESERIALIZERS.set(ty, deserializer);
    for (const { name, algebraicType } of ty.elements) {
      deserializers[name] = AlgebraicType.makeDeserializer(algebraicType, typespace);
    }
    Object.freeze(deserializers);
    return deserializer;
  },
  deserializeValue(reader, ty, typespace) {
    return ProductType.makeDeserializer(ty, typespace)(reader);
  },
  intoMapKey(ty, value) {
    if (ty.elements.length === 1) {
      const fieldName = ty.elements[0].name;
      if (hasOwn(specialProductDeserializers, fieldName)) {
        return value[fieldName];
      }
    }
    const writer = new BinaryWriter(10);
    AlgebraicType.serializeValue(writer, AlgebraicType.Product(ty), value);
    return writer.toBase64();
  }
};
var SumType = {
  makeSerializer(ty, typespace) {
    if (ty.variants.length == 2 && ty.variants[0].name === "some" && ty.variants[1].name === "none") {
      const serialize = AlgebraicType.makeSerializer(ty.variants[0].algebraicType, typespace);
      return (writer, value) => {
        if (value !== null && value !== undefined) {
          writer.writeByte(0);
          serialize(writer, value);
        } else {
          writer.writeByte(1);
        }
      };
    } else if (ty.variants.length == 2 && ty.variants[0].name === "ok" && ty.variants[1].name === "err") {
      const serializeOk = AlgebraicType.makeSerializer(ty.variants[0].algebraicType, typespace);
      const serializeErr = AlgebraicType.makeSerializer(ty.variants[0].algebraicType, typespace);
      return (writer, value) => {
        if ("ok" in value) {
          writer.writeU8(0);
          serializeOk(writer, value.ok);
        } else if ("err" in value) {
          writer.writeU8(1);
          serializeErr(writer, value.err);
        } else {
          throw new TypeError("could not serialize result: object had neither a `ok` nor an `err` field");
        }
      };
    } else {
      let serializer = SERIALIZERS.get(ty);
      if (serializer != null)
        return serializer;
      const serializers = {};
      const body = `switch (value.tag) {
${ty.variants.map(({ name }, i2) => `  case ${JSON.stringify(name)}:
    writer.writeByte(${i2});
    return this.${name}(writer, value.value);`).join(`
`)}
  default:
    throw new TypeError(
      \`Could not serialize sum type; unknown tag \${value.tag}\`
    )
}
`;
      serializer = Function("writer", "value", body).bind(serializers);
      SERIALIZERS.set(ty, serializer);
      for (const { name, algebraicType } of ty.variants) {
        serializers[name] = AlgebraicType.makeSerializer(algebraicType, typespace);
      }
      Object.freeze(serializers);
      return serializer;
    }
  },
  serializeValue(writer, ty, value, typespace) {
    SumType.makeSerializer(ty, typespace)(writer, value);
  },
  makeDeserializer(ty, typespace) {
    if (ty.variants.length == 2 && ty.variants[0].name === "some" && ty.variants[1].name === "none") {
      const deserialize = AlgebraicType.makeDeserializer(ty.variants[0].algebraicType, typespace);
      return (reader) => {
        const tag = reader.readU8();
        if (tag === 0) {
          return deserialize(reader);
        } else if (tag === 1) {
          return;
        } else {
          throw `Can't deserialize an option type, couldn't find ${tag} tag`;
        }
      };
    } else if (ty.variants.length == 2 && ty.variants[0].name === "ok" && ty.variants[1].name === "err") {
      const deserializeOk = AlgebraicType.makeDeserializer(ty.variants[0].algebraicType, typespace);
      const deserializeErr = AlgebraicType.makeDeserializer(ty.variants[1].algebraicType, typespace);
      return (reader) => {
        const tag = reader.readByte();
        if (tag === 0) {
          return { ok: deserializeOk(reader) };
        } else if (tag === 1) {
          return { err: deserializeErr(reader) };
        } else {
          throw `Can't deserialize a result type, couldn't find ${tag} tag`;
        }
      };
    } else {
      let deserializer = DESERIALIZERS.get(ty);
      if (deserializer != null)
        return deserializer;
      const deserializers = {};
      deserializer = Function("reader", `switch (reader.readU8()) {
${ty.variants.map(({ name }, i2) => `case ${i2}: return { tag: ${JSON.stringify(name)}, value: this.${name}(reader) };`).join(`
`)} }`).bind(deserializers);
      DESERIALIZERS.set(ty, deserializer);
      for (const { name, algebraicType } of ty.variants) {
        deserializers[name] = AlgebraicType.makeDeserializer(algebraicType, typespace);
      }
      Object.freeze(deserializers);
      return deserializer;
    }
  },
  deserializeValue(reader, ty, typespace) {
    return SumType.makeDeserializer(ty, typespace)(reader);
  }
};
var ConnectionId = class _ConnectionId {
  __connection_id__;
  constructor(data) {
    this.__connection_id__ = data;
  }
  static getAlgebraicType() {
    return AlgebraicType.Product({
      elements: [
        { name: "__connection_id__", algebraicType: AlgebraicType.U128 }
      ]
    });
  }
  isZero() {
    return this.__connection_id__ === BigInt(0);
  }
  static nullIfZero(addr) {
    if (addr.isZero()) {
      return null;
    } else {
      return addr;
    }
  }
  static random() {
    function randomU8() {
      return Math.floor(Math.random() * 255);
    }
    let result = BigInt(0);
    for (let i2 = 0;i2 < 16; i2++) {
      result = result << BigInt(8) | BigInt(randomU8());
    }
    return new _ConnectionId(result);
  }
  isEqual(other) {
    return this.__connection_id__ == other.__connection_id__;
  }
  equals(other) {
    return this.isEqual(other);
  }
  toHexString() {
    return u128ToHexString(this.__connection_id__);
  }
  toUint8Array() {
    return u128ToUint8Array(this.__connection_id__);
  }
  static fromString(str) {
    return new _ConnectionId(hexStringToU128(str));
  }
  static fromStringOrNull(str) {
    const addr = _ConnectionId.fromString(str);
    if (addr.isZero()) {
      return null;
    } else {
      return addr;
    }
  }
};
var SenderError2 = class extends Error {
  constructor(message) {
    super(message);
  }
  get name() {
    return "SenderError";
  }
};
var InternalError = class extends Error {
  constructor(message) {
    super(message);
  }
  get name() {
    return "InternalError";
  }
};
var ScheduleAt = {
  interval(value) {
    return Interval(value);
  },
  time(value) {
    return Time(value);
  },
  getAlgebraicType() {
    return AlgebraicType.Sum({
      variants: [
        {
          name: "Interval",
          algebraicType: TimeDuration.getAlgebraicType()
        },
        { name: "Time", algebraicType: Timestamp.getAlgebraicType() }
      ]
    });
  },
  isScheduleAt(algebraicType) {
    if (algebraicType.tag !== "Sum") {
      return false;
    }
    const variants = algebraicType.value.variants;
    if (variants.length !== 2) {
      return false;
    }
    const intervalVariant = variants.find((v) => v.name === "Interval");
    const timeVariant = variants.find((v) => v.name === "Time");
    if (!intervalVariant || !timeVariant) {
      return false;
    }
    return TimeDuration.isTimeDuration(intervalVariant.algebraicType) && Timestamp.isTimestamp(timeVariant.algebraicType);
  }
};
var Interval = (micros) => ({
  tag: "Interval",
  value: new TimeDuration(micros)
});
var Time = (microsSinceUnixEpoch) => ({
  tag: "Time",
  value: new Timestamp(microsSinceUnixEpoch)
});
var schedule_at_default = ScheduleAt;
var Option = {
  getAlgebraicType(innerType) {
    return AlgebraicType.Sum({
      variants: [
        { name: "some", algebraicType: innerType },
        {
          name: "none",
          algebraicType: AlgebraicType.Product({ elements: [] })
        }
      ]
    });
  }
};
var Result = {
  getAlgebraicType(okType, errType) {
    return AlgebraicType.Sum({
      variants: [
        { name: "ok", algebraicType: okType },
        { name: "err", algebraicType: errType }
      ]
    });
  }
};
var QueryBrand = Symbol("QueryBrand");
var isRowTypedQuery = (val) => !!val && typeof val === "object" && (QueryBrand in val);
function toSql(q) {
  return q.toSql();
}
var SemijoinImpl = class _SemijoinImpl {
  constructor(sourceQuery, filterQuery, joinCondition) {
    this.sourceQuery = sourceQuery;
    this.filterQuery = filterQuery;
    this.joinCondition = joinCondition;
    if (sourceQuery.table.sourceName === filterQuery.table.sourceName) {
      throw new Error("Cannot semijoin a table to itself");
    }
  }
  [QueryBrand] = true;
  type = "semijoin";
  build() {
    return this;
  }
  where(predicate) {
    const nextSourceQuery = this.sourceQuery.where(predicate);
    return new _SemijoinImpl(nextSourceQuery, this.filterQuery, this.joinCondition);
  }
  toSql() {
    const left = this.filterQuery;
    const right = this.sourceQuery;
    const leftTable = quoteIdentifier(left.table.sourceName);
    const rightTable = quoteIdentifier(right.table.sourceName);
    let sql = `SELECT ${rightTable}.* FROM ${leftTable} JOIN ${rightTable} ON ${booleanExprToSql(this.joinCondition)}`;
    const clauses = [];
    if (left.whereClause) {
      clauses.push(booleanExprToSql(left.whereClause));
    }
    if (right.whereClause) {
      clauses.push(booleanExprToSql(right.whereClause));
    }
    if (clauses.length > 0) {
      const whereSql = clauses.length === 1 ? clauses[0] : clauses.map(wrapInParens).join(" AND ");
      sql += ` WHERE ${whereSql}`;
    }
    return sql;
  }
};
var FromBuilder = class _FromBuilder {
  constructor(table2, whereClause) {
    this.table = table2;
    this.whereClause = whereClause;
  }
  [QueryBrand] = true;
  where(predicate) {
    const newCondition = predicate(this.table.cols);
    const nextWhere = this.whereClause ? this.whereClause.and(newCondition) : newCondition;
    return new _FromBuilder(this.table, nextWhere);
  }
  rightSemijoin(right, on) {
    const sourceQuery = new _FromBuilder(right);
    const joinCondition = on(this.table.indexedCols, right.indexedCols);
    return new SemijoinImpl(sourceQuery, this, joinCondition);
  }
  leftSemijoin(right, on) {
    const filterQuery = new _FromBuilder(right);
    const joinCondition = on(this.table.indexedCols, right.indexedCols);
    return new SemijoinImpl(this, filterQuery, joinCondition);
  }
  toSql() {
    return renderSelectSqlWithJoins(this.table, this.whereClause);
  }
  build() {
    return this;
  }
};
var TableRefImpl = class {
  [QueryBrand] = true;
  type = "table";
  sourceName;
  accessorName;
  cols;
  indexedCols;
  tableDef;
  get columns() {
    return this.tableDef.columns;
  }
  get indexes() {
    return this.tableDef.indexes;
  }
  get rowType() {
    return this.tableDef.rowType;
  }
  get constraints() {
    return this.tableDef.constraints;
  }
  constructor(tableDef2) {
    this.sourceName = tableDef2.sourceName;
    this.accessorName = tableDef2.accessorName;
    this.cols = createRowExpr(tableDef2);
    this.indexedCols = this.cols;
    this.tableDef = tableDef2;
    Object.freeze(this);
  }
  asFrom() {
    return new FromBuilder(this);
  }
  rightSemijoin(other, on) {
    return this.asFrom().rightSemijoin(other, on);
  }
  leftSemijoin(other, on) {
    return this.asFrom().leftSemijoin(other, on);
  }
  build() {
    return this.asFrom().build();
  }
  toSql() {
    return this.asFrom().toSql();
  }
  where(predicate) {
    return this.asFrom().where(predicate);
  }
};
function createTableRefFromDef(tableDef2) {
  return new TableRefImpl(tableDef2);
}
function makeQueryBuilder(schema2) {
  const qb = /* @__PURE__ */ Object.create(null);
  for (const table2 of Object.values(schema2.tables)) {
    const ref = createTableRefFromDef(table2);
    qb[table2.accessorName] = ref;
  }
  return Object.freeze(qb);
}
function createRowExpr(tableDef2) {
  const row = {};
  for (const columnName of Object.keys(tableDef2.columns)) {
    const columnBuilder = tableDef2.columns[columnName];
    const column = new ColumnExpression(tableDef2.sourceName, columnName, columnBuilder.typeBuilder.algebraicType);
    row[columnName] = Object.freeze(column);
  }
  return Object.freeze(row);
}
function renderSelectSqlWithJoins(table2, where, extraClauses = []) {
  const quotedTable = quoteIdentifier(table2.sourceName);
  const sql = `SELECT * FROM ${quotedTable}`;
  const clauses = [];
  if (where)
    clauses.push(booleanExprToSql(where));
  clauses.push(...extraClauses);
  if (clauses.length === 0)
    return sql;
  const whereSql = clauses.length === 1 ? clauses[0] : clauses.map(wrapInParens).join(" AND ");
  return `${sql} WHERE ${whereSql}`;
}
var ColumnExpression = class {
  type = "column";
  column;
  table;
  tsValueType;
  spacetimeType;
  constructor(table2, column, spacetimeType) {
    this.table = table2;
    this.column = column;
    this.spacetimeType = spacetimeType;
  }
  eq(x) {
    return new BooleanExpr({
      type: "eq",
      left: this,
      right: normalizeValue(x)
    });
  }
  ne(x) {
    return new BooleanExpr({
      type: "ne",
      left: this,
      right: normalizeValue(x)
    });
  }
  lt(x) {
    return new BooleanExpr({
      type: "lt",
      left: this,
      right: normalizeValue(x)
    });
  }
  lte(x) {
    return new BooleanExpr({
      type: "lte",
      left: this,
      right: normalizeValue(x)
    });
  }
  gt(x) {
    return new BooleanExpr({
      type: "gt",
      left: this,
      right: normalizeValue(x)
    });
  }
  gte(x) {
    return new BooleanExpr({
      type: "gte",
      left: this,
      right: normalizeValue(x)
    });
  }
};
function literal(value) {
  return { type: "literal", value };
}
function normalizeValue(val) {
  if (val.type === "literal")
    return val;
  if (typeof val === "object" && val != null && "type" in val && val.type === "column") {
    return val;
  }
  return literal(val);
}
var BooleanExpr = class _BooleanExpr {
  constructor(data) {
    this.data = data;
  }
  and(other) {
    return new _BooleanExpr({ type: "and", clauses: [this.data, other.data] });
  }
  or(other) {
    return new _BooleanExpr({ type: "or", clauses: [this.data, other.data] });
  }
  not() {
    return new _BooleanExpr({ type: "not", clause: this.data });
  }
};
function booleanExprToSql(expr, tableAlias) {
  const data = expr instanceof BooleanExpr ? expr.data : expr;
  switch (data.type) {
    case "eq":
      return `${valueExprToSql(data.left)} = ${valueExprToSql(data.right)}`;
    case "ne":
      return `${valueExprToSql(data.left)} <> ${valueExprToSql(data.right)}`;
    case "gt":
      return `${valueExprToSql(data.left)} > ${valueExprToSql(data.right)}`;
    case "gte":
      return `${valueExprToSql(data.left)} >= ${valueExprToSql(data.right)}`;
    case "lt":
      return `${valueExprToSql(data.left)} < ${valueExprToSql(data.right)}`;
    case "lte":
      return `${valueExprToSql(data.left)} <= ${valueExprToSql(data.right)}`;
    case "and":
      return data.clauses.map((c) => booleanExprToSql(c)).map(wrapInParens).join(" AND ");
    case "or":
      return data.clauses.map((c) => booleanExprToSql(c)).map(wrapInParens).join(" OR ");
    case "not":
      return `NOT ${wrapInParens(booleanExprToSql(data.clause))}`;
  }
}
function wrapInParens(sql) {
  return `(${sql})`;
}
function valueExprToSql(expr, tableAlias) {
  if (isLiteralExpr(expr)) {
    return literalValueToSql(expr.value);
  }
  const table2 = expr.table;
  return `${quoteIdentifier(table2)}.${quoteIdentifier(expr.column)}`;
}
function literalValueToSql(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (value instanceof Identity || value instanceof ConnectionId) {
    return `0x${value.toHexString()}`;
  }
  if (value instanceof Timestamp) {
    return `'${value.toISOString()}'`;
  }
  switch (typeof value) {
    case "number":
    case "bigint":
      return String(value);
    case "boolean":
      return value ? "TRUE" : "FALSE";
    case "string":
      return `'${value.replace(/'/g, "''")}'`;
    default:
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
}
function quoteIdentifier(name) {
  return `"${name.replace(/"/g, '""')}"`;
}
function isLiteralExpr(expr) {
  return expr.type === "literal";
}
function set(x, t2) {
  return { ...x, ...t2 };
}
var TypeBuilder = class {
  type;
  algebraicType;
  constructor(algebraicType) {
    this.algebraicType = algebraicType;
  }
  optional() {
    return new OptionBuilder(this);
  }
  serialize(writer, value) {
    const serialize = this.serialize = AlgebraicType.makeSerializer(this.algebraicType);
    serialize(writer, value);
  }
  deserialize(reader) {
    const deserialize = this.deserialize = AlgebraicType.makeDeserializer(this.algebraicType);
    return deserialize(reader);
  }
};
var U8Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.U8);
  }
  index(algorithm = "btree") {
    return new U8ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new U8ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new U8ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new U8ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new U8ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new U8ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var U16Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.U16);
  }
  index(algorithm = "btree") {
    return new U16ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new U16ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new U16ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new U16ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new U16ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new U16ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var U32Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.U32);
  }
  index(algorithm = "btree") {
    return new U32ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new U32ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new U32ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new U32ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new U32ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new U32ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var U64Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.U64);
  }
  index(algorithm = "btree") {
    return new U64ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new U64ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new U64ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new U64ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new U64ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new U64ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var U128Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.U128);
  }
  index(algorithm = "btree") {
    return new U128ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new U128ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new U128ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new U128ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new U128ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new U128ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var U256Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.U256);
  }
  index(algorithm = "btree") {
    return new U256ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new U256ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new U256ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new U256ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new U256ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new U256ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var I8Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.I8);
  }
  index(algorithm = "btree") {
    return new I8ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new I8ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new I8ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new I8ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new I8ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new I8ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var I16Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.I16);
  }
  index(algorithm = "btree") {
    return new I16ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new I16ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new I16ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new I16ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new I16ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new I16ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var I32Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.I32);
  }
  index(algorithm = "btree") {
    return new I32ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new I32ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new I32ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new I32ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new I32ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new I32ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var I64Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.I64);
  }
  index(algorithm = "btree") {
    return new I64ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new I64ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new I64ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new I64ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new I64ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new I64ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var I128Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.I128);
  }
  index(algorithm = "btree") {
    return new I128ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new I128ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new I128ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new I128ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new I128ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new I128ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var I256Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.I256);
  }
  index(algorithm = "btree") {
    return new I256ColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new I256ColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new I256ColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new I256ColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new I256ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new I256ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var F32Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.F32);
  }
  default(value) {
    return new F32ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new F32ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var F64Builder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.F64);
  }
  default(value) {
    return new F64ColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new F64ColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var BoolBuilder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.Bool);
  }
  index(algorithm = "btree") {
    return new BoolColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new BoolColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new BoolColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  default(value) {
    return new BoolColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new BoolColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var StringBuilder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.String);
  }
  index(algorithm = "btree") {
    return new StringColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new StringColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new StringColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  default(value) {
    return new StringColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new StringColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var ArrayBuilder = class extends TypeBuilder {
  element;
  constructor(element) {
    super(AlgebraicType.Array(element.algebraicType));
    this.element = element;
  }
  default(value) {
    return new ArrayColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new ArrayColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var ByteArrayBuilder = class extends TypeBuilder {
  constructor() {
    super(AlgebraicType.Array(AlgebraicType.U8));
  }
  default(value) {
    return new ByteArrayColumnBuilder(set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new ByteArrayColumnBuilder(set(defaultMetadata, { name }));
  }
};
var OptionBuilder = class extends TypeBuilder {
  value;
  constructor(value) {
    super(Option.getAlgebraicType(value.algebraicType));
    this.value = value;
  }
  default(value) {
    return new OptionColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new OptionColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var ProductBuilder = class extends TypeBuilder {
  typeName;
  elements;
  constructor(elements, name) {
    function elementsArrayFromElementsObj(obj) {
      return Object.keys(obj).map((key) => ({
        name: key,
        get algebraicType() {
          return obj[key].algebraicType;
        }
      }));
    }
    super(AlgebraicType.Product({
      elements: elementsArrayFromElementsObj(elements)
    }));
    this.typeName = name;
    this.elements = elements;
  }
  default(value) {
    return new ProductColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new ProductColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var ResultBuilder = class extends TypeBuilder {
  ok;
  err;
  constructor(ok2, err2) {
    super(Result.getAlgebraicType(ok2.algebraicType, err2.algebraicType));
    this.ok = ok2;
    this.err = err2;
  }
  default(value) {
    return new ResultColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
};
var UnitBuilder = class extends TypeBuilder {
  constructor() {
    super({ tag: "Product", value: { elements: [] } });
  }
};
var RowBuilder = class extends TypeBuilder {
  row;
  typeName;
  constructor(row, name) {
    const mappedRow = Object.fromEntries(Object.entries(row).map(([colName, builder]) => [
      colName,
      builder instanceof ColumnBuilder ? builder : new ColumnBuilder(builder, {})
    ]));
    const elements = Object.keys(mappedRow).map((name2) => ({
      name: name2,
      get algebraicType() {
        return mappedRow[name2].typeBuilder.algebraicType;
      }
    }));
    super(AlgebraicType.Product({ elements }));
    this.row = mappedRow;
    this.typeName = name;
  }
};
var SumBuilderImpl = class extends TypeBuilder {
  variants;
  typeName;
  constructor(variants, name) {
    function variantsArrayFromVariantsObj(variants2) {
      return Object.keys(variants2).map((key) => ({
        name: key,
        get algebraicType() {
          return variants2[key].algebraicType;
        }
      }));
    }
    super(AlgebraicType.Sum({
      variants: variantsArrayFromVariantsObj(variants)
    }));
    this.variants = variants;
    this.typeName = name;
    for (const key of Object.keys(variants)) {
      const desc = Object.getOwnPropertyDescriptor(variants, key);
      const isAccessor = !!desc && (typeof desc.get === "function" || typeof desc.set === "function");
      let isUnit2 = false;
      if (!isAccessor) {
        const variant = variants[key];
        isUnit2 = variant instanceof UnitBuilder;
      }
      if (isUnit2) {
        const constant = this.create(key);
        Object.defineProperty(this, key, {
          value: constant,
          writable: false,
          enumerable: true,
          configurable: false
        });
      } else {
        const fn = (value) => this.create(key, value);
        Object.defineProperty(this, key, {
          value: fn,
          writable: false,
          enumerable: true,
          configurable: false
        });
      }
    }
  }
  create(tag, value) {
    return value === undefined ? { tag } : { tag, value };
  }
  default(value) {
    return new SumColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new SumColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var SumBuilder = SumBuilderImpl;
var SimpleSumBuilderImpl = class extends SumBuilderImpl {
  index(algorithm = "btree") {
    return new SimpleSumColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  primaryKey() {
    return new SimpleSumColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
};
var ScheduleAtBuilder = class extends TypeBuilder {
  constructor() {
    super(schedule_at_default.getAlgebraicType());
  }
  default(value) {
    return new ScheduleAtColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new ScheduleAtColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var IdentityBuilder = class extends TypeBuilder {
  constructor() {
    super(Identity.getAlgebraicType());
  }
  index(algorithm = "btree") {
    return new IdentityColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new IdentityColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new IdentityColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new IdentityColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new IdentityColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new IdentityColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var ConnectionIdBuilder = class extends TypeBuilder {
  constructor() {
    super(ConnectionId.getAlgebraicType());
  }
  index(algorithm = "btree") {
    return new ConnectionIdColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new ConnectionIdColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new ConnectionIdColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new ConnectionIdColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new ConnectionIdColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new ConnectionIdColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var TimestampBuilder = class extends TypeBuilder {
  constructor() {
    super(Timestamp.getAlgebraicType());
  }
  index(algorithm = "btree") {
    return new TimestampColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new TimestampColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new TimestampColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new TimestampColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new TimestampColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new TimestampColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var TimeDurationBuilder = class extends TypeBuilder {
  constructor() {
    super(TimeDuration.getAlgebraicType());
  }
  index(algorithm = "btree") {
    return new TimeDurationColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new TimeDurationColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new TimeDurationColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new TimeDurationColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new TimeDurationColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new TimeDurationColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var UuidBuilder = class extends TypeBuilder {
  constructor() {
    super(Uuid.getAlgebraicType());
  }
  index(algorithm = "btree") {
    return new UuidColumnBuilder(this, set(defaultMetadata, { indexType: algorithm }));
  }
  unique() {
    return new UuidColumnBuilder(this, set(defaultMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new UuidColumnBuilder(this, set(defaultMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new UuidColumnBuilder(this, set(defaultMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new UuidColumnBuilder(this, set(defaultMetadata, { defaultValue: value }));
  }
  name(name) {
    return new UuidColumnBuilder(this, set(defaultMetadata, { name }));
  }
};
var defaultMetadata = {};
var ColumnBuilder = class {
  typeBuilder;
  columnMetadata;
  constructor(typeBuilder, metadata) {
    this.typeBuilder = typeBuilder;
    this.columnMetadata = metadata;
  }
  serialize(writer, value) {
    this.typeBuilder.serialize(writer, value);
  }
  deserialize(reader) {
    return this.typeBuilder.deserialize(reader);
  }
};
var U8ColumnBuilder = class _U8ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _U8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _U8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _U8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _U8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _U8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _U8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var U16ColumnBuilder = class _U16ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _U16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _U16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _U16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _U16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _U16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _U16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var U32ColumnBuilder = class _U32ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _U32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _U32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _U32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _U32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _U32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _U32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var U64ColumnBuilder = class _U64ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _U64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _U64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _U64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _U64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _U64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _U64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var U128ColumnBuilder = class _U128ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _U128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _U128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _U128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _U128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _U128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _U128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var U256ColumnBuilder = class _U256ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _U256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _U256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _U256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _U256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _U256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _U256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var I8ColumnBuilder = class _I8ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _I8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _I8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _I8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _I8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _I8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _I8ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var I16ColumnBuilder = class _I16ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _I16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _I16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _I16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _I16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _I16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _I16ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var I32ColumnBuilder = class _I32ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _I32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _I32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _I32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _I32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _I32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _I32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var I64ColumnBuilder = class _I64ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _I64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _I64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _I64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _I64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _I64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _I64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var I128ColumnBuilder = class _I128ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _I128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _I128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _I128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _I128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _I128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _I128ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var I256ColumnBuilder = class _I256ColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _I256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _I256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _I256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  autoInc() {
    return new _I256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isAutoIncrement: true }));
  }
  default(value) {
    return new _I256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _I256ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var F32ColumnBuilder = class _F32ColumnBuilder extends ColumnBuilder {
  default(value) {
    return new _F32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _F32ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var F64ColumnBuilder = class _F64ColumnBuilder extends ColumnBuilder {
  default(value) {
    return new _F64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _F64ColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var BoolColumnBuilder = class _BoolColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _BoolColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _BoolColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _BoolColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  default(value) {
    return new _BoolColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _BoolColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var StringColumnBuilder = class _StringColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _StringColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _StringColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _StringColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  default(value) {
    return new _StringColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _StringColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var ArrayColumnBuilder = class _ArrayColumnBuilder extends ColumnBuilder {
  default(value) {
    return new _ArrayColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _ArrayColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var ByteArrayColumnBuilder = class _ByteArrayColumnBuilder extends ColumnBuilder {
  constructor(metadata) {
    super(new TypeBuilder(AlgebraicType.Array(AlgebraicType.U8)), metadata);
  }
  default(value) {
    return new _ByteArrayColumnBuilder(set(this.columnMetadata, { defaultValue: value }));
  }
  name(name) {
    return new _ByteArrayColumnBuilder(set(this.columnMetadata, { name }));
  }
};
var OptionColumnBuilder = class _OptionColumnBuilder extends ColumnBuilder {
  default(value) {
    return new _OptionColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
  name(name) {
    return new _OptionColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var ResultColumnBuilder = class _ResultColumnBuilder extends ColumnBuilder {
  constructor(typeBuilder, metadata) {
    super(typeBuilder, metadata);
  }
  default(value) {
    return new _ResultColumnBuilder(this.typeBuilder, set(this.columnMetadata, {
      defaultValue: value
    }));
  }
};
var ProductColumnBuilder = class _ProductColumnBuilder extends ColumnBuilder {
  default(value) {
    return new _ProductColumnBuilder(this.typeBuilder, set(this.columnMetadata, { defaultValue: value }));
  }
  name(name) {
    return new _ProductColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var SumColumnBuilder = class _SumColumnBuilder extends ColumnBuilder {
  default(value) {
    return new _SumColumnBuilder(this.typeBuilder, set(this.columnMetadata, { defaultValue: value }));
  }
  name(name) {
    return new _SumColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var SimpleSumColumnBuilder = class _SimpleSumColumnBuilder extends SumColumnBuilder {
  index(algorithm = "btree") {
    return new _SimpleSumColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  primaryKey() {
    return new _SimpleSumColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
};
var ScheduleAtColumnBuilder = class _ScheduleAtColumnBuilder extends ColumnBuilder {
  default(value) {
    return new _ScheduleAtColumnBuilder(this.typeBuilder, set(this.columnMetadata, { defaultValue: value }));
  }
  name(name) {
    return new _ScheduleAtColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var IdentityColumnBuilder = class _IdentityColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _IdentityColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _IdentityColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _IdentityColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  default(value) {
    return new _IdentityColumnBuilder(this.typeBuilder, set(this.columnMetadata, { defaultValue: value }));
  }
  name(name) {
    return new _IdentityColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var ConnectionIdColumnBuilder = class _ConnectionIdColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _ConnectionIdColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _ConnectionIdColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _ConnectionIdColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  default(value) {
    return new _ConnectionIdColumnBuilder(this.typeBuilder, set(this.columnMetadata, { defaultValue: value }));
  }
  name(name) {
    return new _ConnectionIdColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var TimestampColumnBuilder = class _TimestampColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _TimestampColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _TimestampColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _TimestampColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  default(value) {
    return new _TimestampColumnBuilder(this.typeBuilder, set(this.columnMetadata, { defaultValue: value }));
  }
  name(name) {
    return new _TimestampColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var TimeDurationColumnBuilder = class _TimeDurationColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _TimeDurationColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _TimeDurationColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _TimeDurationColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  default(value) {
    return new _TimeDurationColumnBuilder(this.typeBuilder, set(this.columnMetadata, { defaultValue: value }));
  }
  name(name) {
    return new _TimeDurationColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var UuidColumnBuilder = class _UuidColumnBuilder extends ColumnBuilder {
  index(algorithm = "btree") {
    return new _UuidColumnBuilder(this.typeBuilder, set(this.columnMetadata, { indexType: algorithm }));
  }
  unique() {
    return new _UuidColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isUnique: true }));
  }
  primaryKey() {
    return new _UuidColumnBuilder(this.typeBuilder, set(this.columnMetadata, { isPrimaryKey: true }));
  }
  default(value) {
    return new _UuidColumnBuilder(this.typeBuilder, set(this.columnMetadata, { defaultValue: value }));
  }
  name(name) {
    return new _UuidColumnBuilder(this.typeBuilder, set(this.columnMetadata, { name }));
  }
};
var RefBuilder = class extends TypeBuilder {
  ref;
  __spacetimeType;
  constructor(ref) {
    super(AlgebraicType.Ref(ref));
    this.ref = ref;
  }
};
var enumImpl = (nameOrObj, maybeObj) => {
  let obj = nameOrObj;
  let name = undefined;
  if (typeof nameOrObj === "string") {
    if (!maybeObj) {
      throw new TypeError("When providing a name, you must also provide the variants object or array.");
    }
    obj = maybeObj;
    name = nameOrObj;
  }
  if (Array.isArray(obj)) {
    const simpleVariantsObj = {};
    for (const variant of obj) {
      simpleVariantsObj[variant] = new UnitBuilder;
    }
    return new SimpleSumBuilderImpl(simpleVariantsObj, name);
  }
  return new SumBuilder(obj, name);
};
var t = {
  bool: () => new BoolBuilder,
  string: () => new StringBuilder,
  number: () => new F64Builder,
  i8: () => new I8Builder,
  u8: () => new U8Builder,
  i16: () => new I16Builder,
  u16: () => new U16Builder,
  i32: () => new I32Builder,
  u32: () => new U32Builder,
  i64: () => new I64Builder,
  u64: () => new U64Builder,
  i128: () => new I128Builder,
  u128: () => new U128Builder,
  i256: () => new I256Builder,
  u256: () => new U256Builder,
  f32: () => new F32Builder,
  f64: () => new F64Builder,
  object: (nameOrObj, maybeObj) => {
    if (typeof nameOrObj === "string") {
      if (!maybeObj) {
        throw new TypeError("When providing a name, you must also provide the object.");
      }
      return new ProductBuilder(maybeObj, nameOrObj);
    }
    return new ProductBuilder(nameOrObj, undefined);
  },
  row: (nameOrObj, maybeObj) => {
    const [obj, name] = typeof nameOrObj === "string" ? [maybeObj, nameOrObj] : [nameOrObj, undefined];
    return new RowBuilder(obj, name);
  },
  array(e) {
    return new ArrayBuilder(e);
  },
  enum: enumImpl,
  unit() {
    return new UnitBuilder;
  },
  lazy(thunk) {
    let cached2 = null;
    const get = () => cached2 ??= thunk();
    const proxy = new Proxy({}, {
      get(_t, prop, recv) {
        const target = get();
        const val = Reflect.get(target, prop, recv);
        return typeof val === "function" ? val.bind(target) : val;
      },
      set(_t, prop, value, recv) {
        return Reflect.set(get(), prop, value, recv);
      },
      has(_t, prop) {
        return prop in get();
      },
      ownKeys() {
        return Reflect.ownKeys(get());
      },
      getOwnPropertyDescriptor(_t, prop) {
        return Object.getOwnPropertyDescriptor(get(), prop);
      },
      getPrototypeOf() {
        return Object.getPrototypeOf(get());
      }
    });
    return proxy;
  },
  scheduleAt: () => {
    return new ScheduleAtBuilder;
  },
  option(value) {
    return new OptionBuilder(value);
  },
  result(ok2, err2) {
    return new ResultBuilder(ok2, err2);
  },
  identity: () => {
    return new IdentityBuilder;
  },
  connectionId: () => {
    return new ConnectionIdBuilder;
  },
  timestamp: () => {
    return new TimestampBuilder;
  },
  timeDuration: () => {
    return new TimeDurationBuilder;
  },
  uuid: () => {
    return new UuidBuilder;
  },
  byteArray: () => {
    return new ByteArrayBuilder;
  }
};
var BsatnRowList = t.object("BsatnRowList", {
  get sizeHint() {
    return RowSizeHint;
  },
  rowsData: t.byteArray()
});
var CallProcedure = t.object("CallProcedure", {
  requestId: t.u32(),
  flags: t.u8(),
  procedure: t.string(),
  args: t.byteArray()
});
var CallReducer = t.object("CallReducer", {
  requestId: t.u32(),
  flags: t.u8(),
  reducer: t.string(),
  args: t.byteArray()
});
var ClientMessage = t.enum("ClientMessage", {
  get Subscribe() {
    return Subscribe;
  },
  get Unsubscribe() {
    return Unsubscribe;
  },
  get OneOffQuery() {
    return OneOffQuery;
  },
  get CallReducer() {
    return CallReducer;
  },
  get CallProcedure() {
    return CallProcedure;
  }
});
var EventTableRows = t.object("EventTableRows", {
  get events() {
    return BsatnRowList;
  }
});
var InitialConnection = t.object("InitialConnection", {
  identity: t.identity(),
  connectionId: t.connectionId(),
  token: t.string()
});
var OneOffQuery = t.object("OneOffQuery", {
  requestId: t.u32(),
  queryString: t.string()
});
var OneOffQueryResult = t.object("OneOffQueryResult", {
  requestId: t.u32(),
  get result() {
    return t.result(QueryRows, t.string());
  }
});
var PersistentTableRows = t.object("PersistentTableRows", {
  get inserts() {
    return BsatnRowList;
  },
  get deletes() {
    return BsatnRowList;
  }
});
var ProcedureResult = t.object("ProcedureResult", {
  get status() {
    return ProcedureStatus;
  },
  timestamp: t.timestamp(),
  totalHostExecutionDuration: t.timeDuration(),
  requestId: t.u32()
});
var ProcedureStatus = t.enum("ProcedureStatus", {
  Returned: t.byteArray(),
  InternalError: t.string()
});
var QueryRows = t.object("QueryRows", {
  get tables() {
    return t.array(SingleTableRows);
  }
});
var QuerySetId = t.object("QuerySetId", {
  id: t.u32()
});
var QuerySetUpdate = t.object("QuerySetUpdate", {
  get querySetId() {
    return QuerySetId;
  },
  get tables() {
    return t.array(TableUpdate);
  }
});
var ReducerOk = t.object("ReducerOk", {
  retValue: t.byteArray(),
  get transactionUpdate() {
    return TransactionUpdate;
  }
});
var ReducerOutcome = t.enum("ReducerOutcome", {
  get Ok() {
    return ReducerOk;
  },
  OkEmpty: t.unit(),
  Err: t.byteArray(),
  InternalError: t.string()
});
var ReducerResult = t.object("ReducerResult", {
  requestId: t.u32(),
  timestamp: t.timestamp(),
  get result() {
    return ReducerOutcome;
  }
});
var RowSizeHint = t.enum("RowSizeHint", {
  FixedSize: t.u16(),
  RowOffsets: t.array(t.u64())
});
var ServerMessage = t.enum("ServerMessage", {
  get InitialConnection() {
    return InitialConnection;
  },
  get SubscribeApplied() {
    return SubscribeApplied;
  },
  get UnsubscribeApplied() {
    return UnsubscribeApplied;
  },
  get SubscriptionError() {
    return SubscriptionError;
  },
  get TransactionUpdate() {
    return TransactionUpdate;
  },
  get OneOffQueryResult() {
    return OneOffQueryResult;
  },
  get ReducerResult() {
    return ReducerResult;
  },
  get ProcedureResult() {
    return ProcedureResult;
  }
});
var SingleTableRows = t.object("SingleTableRows", {
  table: t.string(),
  get rows() {
    return BsatnRowList;
  }
});
var Subscribe = t.object("Subscribe", {
  requestId: t.u32(),
  get querySetId() {
    return QuerySetId;
  },
  queryStrings: t.array(t.string())
});
var SubscribeApplied = t.object("SubscribeApplied", {
  requestId: t.u32(),
  get querySetId() {
    return QuerySetId;
  },
  get rows() {
    return QueryRows;
  }
});
var SubscriptionError = t.object("SubscriptionError", {
  requestId: t.option(t.u32()),
  get querySetId() {
    return QuerySetId;
  },
  error: t.string()
});
var TableUpdate = t.object("TableUpdate", {
  tableName: t.string(),
  get rows() {
    return t.array(TableUpdateRows);
  }
});
var TableUpdateRows = t.enum("TableUpdateRows", {
  get PersistentTable() {
    return PersistentTableRows;
  },
  get EventTable() {
    return EventTableRows;
  }
});
var TransactionUpdate = t.object("TransactionUpdate", {
  get querySets() {
    return t.array(QuerySetUpdate);
  }
});
var Unsubscribe = t.object("Unsubscribe", {
  requestId: t.u32(),
  get querySetId() {
    return QuerySetId;
  },
  get flags() {
    return UnsubscribeFlags;
  }
});
var UnsubscribeApplied = t.object("UnsubscribeApplied", {
  requestId: t.u32(),
  get querySetId() {
    return QuerySetId;
  },
  get rows() {
    return t.option(QueryRows);
  }
});
var UnsubscribeFlags = t.enum("UnsubscribeFlags", {
  Default: t.unit(),
  SendDroppedRows: t.unit()
});
var EventEmitter = class {
  #events = /* @__PURE__ */ new Map;
  on(event, callback) {
    let callbacks = this.#events.get(event);
    if (!callbacks) {
      callbacks = /* @__PURE__ */ new Set;
      this.#events.set(event, callbacks);
    }
    callbacks.add(callback);
  }
  off(event, callback) {
    const callbacks = this.#events.get(event);
    if (!callbacks) {
      return;
    }
    callbacks.delete(callback);
  }
  emit(event, ...args) {
    const callbacks = this.#events.get(event);
    if (!callbacks) {
      return;
    }
    for (const callback of callbacks) {
      callback(...args);
    }
  }
};
var LogLevelIdentifierIcon = {
  component: "\uD83D\uDCE6",
  info: "\u2139\uFE0F",
  warn: "\u26A0\uFE0F",
  error: "\u274C",
  debug: "\uD83D\uDC1B",
  trace: "\uD83D\uDD0D"
};
var LogStyle = {
  component: "color: #fff; background-color: #8D6FDD; padding: 2px 5px; border-radius: 3px;",
  info: "color: #fff; background-color: #007bff; padding: 2px 5px; border-radius: 3px;",
  warn: "color: #fff; background-color: #ffc107; padding: 2px 5px; border-radius: 3px;",
  error: "color: #fff; background-color: #dc3545; padding: 2px 5px; border-radius: 3px;",
  debug: "color: #fff; background-color: #28a745; padding: 2px 5px; border-radius: 3px;",
  trace: "color: #fff; background-color: #17a2b8; padding: 2px 5px; border-radius: 3px;"
};
var LogTextStyle = {
  component: "color: #8D6FDD;",
  info: "color: #007bff;",
  warn: "color: #ffc107;",
  error: "color: #dc3545;",
  debug: "color: #28a745;",
  trace: "color: #17a2b8;"
};
var LogLevelRank = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4
};
var globalLogLevel = "info";
var shouldLog = (level) => LogLevelRank[level] <= LogLevelRank[globalLogLevel];
var resolveLazy = (v) => typeof v === "function" ? v() : v;
var toHex2 = (bytes) => Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
var ARRAY_TRUNCATION_THRESHOLD = 25;
var ARRAY_PREVIEW_COUNT = 10;
var SENSITIVE_KEYS = /* @__PURE__ */ new Set([
  "token",
  "authToken",
  "authorization",
  "accessToken",
  "refreshToken"
]);
var stringify2 = (value) => stringify(value, (key, current) => {
  if (SENSITIVE_KEYS.has(key)) {
    return "[REDACTED]";
  }
  if (current && typeof current === "object" && "__identity__" in current && typeof current.__identity__ === "bigint") {
    return u256ToHexString(current.__identity__);
  }
  if (current && typeof current === "object" && "__connection_id__" in current && typeof current.__connection_id__ === "bigint") {
    return u128ToHexString(current.__connection_id__);
  }
  if (current instanceof Uint8Array) {
    if (current.length < 25) {
      return `0x${toHex2(current)}`;
    }
    const head = current.subarray(0, 10);
    return `Uint8Array(len=${current.length}, head=0x${toHex2(head)})`;
  }
  if (Array.isArray(current) && current.length >= ARRAY_TRUNCATION_THRESHOLD) {
    const head = stringify(current.slice(0, ARRAY_PREVIEW_COUNT));
    return `Array(len=${current.length}, head=${head ?? "[]"})`;
  }
  return current;
});
var stdbLogger = (level, message, ...args) => {
  if (!shouldLog(level)) {
    return;
  }
  const resolvedMessage = resolveLazy(message);
  const resolvedArgs = args.map(resolveLazy);
  console.log(`%c${LogLevelIdentifierIcon[level]} ${level.toUpperCase()}%c ${resolvedMessage}`, LogStyle[level], LogTextStyle[level], ...resolvedArgs);
};
var scalarCompare = (x, y) => {
  if (x === y)
    return 0;
  return x < y ? -1 : 1;
};
var TableCacheImpl = class {
  rows;
  tableDef;
  emitter;
  constructor(tableDef2) {
    this.tableDef = tableDef2;
    this.rows = /* @__PURE__ */ new Map;
    this.emitter = new EventEmitter;
    const indexesDef = this.tableDef.indexes || [];
    for (const idx2 of indexesDef) {
      const idxDef = idx2;
      const index = this.#makeReadonlyIndex(this.tableDef, idxDef);
      this[idxDef.name] = index;
    }
  }
  #makeReadonlyIndex(tableDef2, idx2) {
    if (idx2.algorithm !== "btree") {
      throw new Error("Only btree indexes are supported in TableCacheImpl");
    }
    const columns = idx2.columns;
    const getKey = (row) => columns.map((c) => row[c]);
    const matchRange = (row, rangeArg) => {
      const key = getKey(row);
      const arr = Array.isArray(rangeArg) ? rangeArg : [rangeArg];
      const prefixLen = Math.max(0, arr.length - 1);
      for (let i2 = 0;i2 < prefixLen; i2++) {
        if (!deepEqual(key[i2], arr[i2]))
          return false;
      }
      const lastProvided = arr[arr.length - 1];
      const kLast = key[prefixLen];
      if (lastProvided && typeof lastProvided === "object" && "from" in lastProvided && "to" in lastProvided) {
        const from = lastProvided.from;
        const to = lastProvided.to;
        if (from.tag !== "unbounded") {
          const c = scalarCompare(kLast, from.value);
          if (c < 0)
            return false;
          if (c === 0 && from.tag === "excluded")
            return false;
        }
        if (to.tag !== "unbounded") {
          const c = scalarCompare(kLast, to.value);
          if (c > 0)
            return false;
          if (c === 0 && to.tag === "excluded")
            return false;
        }
        return true;
      } else {
        if (!deepEqual(kLast, lastProvided))
          return false;
        return true;
      }
    };
    const isUnique = tableDef2.constraints.some((constraint) => {
      if (constraint.constraint !== "unique") {
        return false;
      }
      return deepEqual(constraint.columns, idx2.columns);
    });
    const self = this;
    if (isUnique) {
      const impl = {
        find: (colVal) => {
          const expected = Array.isArray(colVal) ? colVal : [colVal];
          for (const row of self.iter()) {
            if (deepEqual(getKey(row), expected))
              return row;
          }
          return null;
        }
      };
      return impl;
    } else {
      const impl = {
        *filter(range) {
          for (const row of self.iter()) {
            if (matchRange(row, range))
              yield row;
          }
        }
      };
      return impl;
    }
  }
  count() {
    return BigInt(this.rows.size);
  }
  iter() {
    function* generator(rows) {
      for (const [row] of rows.values()) {
        yield row;
      }
    }
    return generator(this.rows);
  }
  [Symbol.iterator]() {
    return this.iter();
  }
  applyOperations = (operations, ctx) => {
    const pendingCallbacks = [];
    if (this.tableDef.isEvent) {
      for (const op of operations) {
        if (op.type === "insert") {
          pendingCallbacks.push({
            type: "insert",
            table: this.tableDef.sourceName,
            cb: () => {
              this.emitter.emit("insert", ctx, op.row);
            }
          });
        }
      }
      return pendingCallbacks;
    }
    const hasPrimaryKey = Object.values(this.tableDef.columns).some((col) => col.columnMetadata.isPrimaryKey === true);
    if (hasPrimaryKey) {
      const insertMap = /* @__PURE__ */ new Map;
      const deleteMap = /* @__PURE__ */ new Map;
      for (const op of operations) {
        if (op.type === "insert") {
          const [_, prevCount] = insertMap.get(op.rowId) || [op, 0];
          insertMap.set(op.rowId, [op, prevCount + 1]);
        } else {
          const [_, prevCount] = deleteMap.get(op.rowId) || [op, 0];
          deleteMap.set(op.rowId, [op, prevCount + 1]);
        }
      }
      for (const [primaryKey, [insertOp, refCount]] of insertMap) {
        const deleteEntry = deleteMap.get(primaryKey);
        if (deleteEntry) {
          const [_, deleteCount] = deleteEntry;
          const refCountDelta = refCount - deleteCount;
          const maybeCb = this.update(ctx, primaryKey, insertOp.row, refCountDelta);
          if (maybeCb) {
            pendingCallbacks.push(maybeCb);
          }
          deleteMap.delete(primaryKey);
        } else {
          const maybeCb = this.insert(ctx, insertOp, refCount);
          if (maybeCb) {
            pendingCallbacks.push(maybeCb);
          }
        }
      }
      for (const [deleteOp, refCount] of deleteMap.values()) {
        const maybeCb = this.delete(ctx, deleteOp, refCount);
        if (maybeCb) {
          pendingCallbacks.push(maybeCb);
        }
      }
    } else {
      for (const op of operations) {
        if (op.type === "insert") {
          const maybeCb = this.insert(ctx, op);
          if (maybeCb) {
            pendingCallbacks.push(maybeCb);
          }
        } else {
          const maybeCb = this.delete(ctx, op);
          if (maybeCb) {
            pendingCallbacks.push(maybeCb);
          }
        }
      }
    }
    return pendingCallbacks;
  };
  update = (ctx, rowId, newRow, refCountDelta = 0) => {
    const existingEntry = this.rows.get(rowId);
    if (!existingEntry) {
      stdbLogger("error", `Updating a row that was not present in the cache. Table: ${this.tableDef.sourceName}, RowId: ${rowId}`);
      return;
    }
    const [oldRow, previousCount] = existingEntry;
    const refCount = Math.max(1, previousCount + refCountDelta);
    if (previousCount + refCountDelta <= 0) {
      stdbLogger("error", `Negative reference count for in table ${this.tableDef.sourceName} row ${rowId} (${previousCount} + ${refCountDelta})`);
      return;
    }
    this.rows.set(rowId, [newRow, refCount]);
    if (previousCount === 0) {
      stdbLogger("error", `Updating a row id in table ${this.tableDef.sourceName} which was not present in the cache (rowId: ${rowId})`);
      return {
        type: "insert",
        table: this.tableDef.sourceName,
        cb: () => {
          this.emitter.emit("insert", ctx, newRow);
        }
      };
    }
    return {
      type: "update",
      table: this.tableDef.sourceName,
      cb: () => {
        this.emitter.emit("update", ctx, oldRow, newRow);
      }
    };
  };
  insert = (ctx, operation, count = 1) => {
    const [_, previousCount] = this.rows.get(operation.rowId) || [
      operation.row,
      0
    ];
    this.rows.set(operation.rowId, [operation.row, previousCount + count]);
    if (previousCount === 0) {
      return {
        type: "insert",
        table: this.tableDef.sourceName,
        cb: () => {
          this.emitter.emit("insert", ctx, operation.row);
        }
      };
    }
    return;
  };
  delete = (ctx, operation, count = 1) => {
    const [_, previousCount] = this.rows.get(operation.rowId) || [
      operation.row,
      0
    ];
    if (previousCount === 0) {
      stdbLogger("warn", "Deleting a row that was not present in the cache");
      return;
    }
    if (previousCount <= count) {
      this.rows.delete(operation.rowId);
      return {
        type: "delete",
        table: this.tableDef.sourceName,
        cb: () => {
          this.emitter.emit("delete", ctx, operation.row);
        }
      };
    }
    this.rows.set(operation.rowId, [operation.row, previousCount - count]);
    return;
  };
  onInsert = (cb) => {
    this.emitter.on("insert", cb);
  };
  onDelete = (cb) => {
    this.emitter.on("delete", cb);
  };
  onUpdate = (cb) => {
    this.emitter.on("update", cb);
  };
  removeOnInsert = (cb) => {
    this.emitter.off("insert", cb);
  };
  removeOnDelete = (cb) => {
    this.emitter.off("delete", cb);
  };
  removeOnUpdate = (cb) => {
    this.emitter.off("update", cb);
  };
};
var TableMap = class {
  map = /* @__PURE__ */ new Map;
  get(key) {
    return this.map.get(key);
  }
  set(key, value) {
    this.map.set(key, value);
    return this;
  }
  has(key) {
    return this.map.has(key);
  }
  delete(key) {
    return this.map.delete(key);
  }
  keys() {
    return this.map.keys();
  }
  values() {
    return this.map.values();
  }
  entries() {
    return this.map.entries();
  }
  [Symbol.iterator]() {
    return this.entries();
  }
};
var ClientCache = class {
  tables = new TableMap;
  getTable(name) {
    const table2 = this.tables.get(name);
    if (!table2) {
      console.error("The table has not been registered for this client. Please register the table before using it. If you have registered global tables using the SpacetimeDBClient.registerTables() or `registerTable()` method, please make sure that is executed first!");
      throw new Error(`Table ${String(name)} does not exist`);
    }
    return table2;
  }
  getOrCreateTable(tableDef2) {
    const name = tableDef2.accessorName;
    const table2 = this.tables.get(name);
    if (table2) {
      return table2;
    }
    const newTable = new TableCacheImpl(tableDef2);
    this.tables.set(name, newTable);
    return newTable;
  }
};
function comparePreReleases(a, b) {
  const len2 = Math.min(a.length, b.length);
  for (let i2 = 0;i2 < len2; i2++) {
    const aPart = a[i2];
    const bPart = b[i2];
    if (aPart === bPart)
      continue;
    if (typeof aPart === "number" && typeof bPart === "number") {
      return aPart - bPart;
    }
    if (typeof aPart === "string" && typeof bPart === "string") {
      return aPart.localeCompare(bPart);
    }
    return typeof aPart === "string" ? 1 : -1;
  }
  return a.length - b.length;
}
var SemanticVersion = class _SemanticVersion {
  major;
  minor;
  patch;
  preRelease;
  buildInfo;
  constructor(major, minor, patch, preRelease = null, buildInfo = null) {
    this.major = major;
    this.minor = minor;
    this.patch = patch;
    this.preRelease = preRelease;
    this.buildInfo = buildInfo;
  }
  toString() {
    let versionString = `${this.major}.${this.minor}.${this.patch}`;
    if (this.preRelease) {
      versionString += `-${this.preRelease.join(".")}`;
    }
    if (this.buildInfo) {
      versionString += `+${this.buildInfo}`;
    }
    return versionString;
  }
  compare(other) {
    if (this.major !== other.major) {
      return this.major - other.major;
    }
    if (this.minor !== other.minor) {
      return this.minor - other.minor;
    }
    if (this.patch !== other.patch) {
      return this.patch - other.patch;
    }
    if (this.preRelease && other.preRelease) {
      return comparePreReleases(this.preRelease, other.preRelease);
    }
    if (this.preRelease) {
      return -1;
    }
    if (other.preRelease) {
      return -1;
    }
    return 0;
  }
  clone() {
    return new _SemanticVersion(this.major, this.minor, this.patch, this.preRelease ? [...this.preRelease] : null, this.buildInfo);
  }
  static parseVersionString(version2) {
    const regex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?(?:\+([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?$/;
    const match = version2.match(regex);
    if (!match) {
      throw new Error(`Invalid version string: ${version2}`);
    }
    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    const patch = parseInt(match[3], 10);
    const preRelease = match[4] ? match[4].split(".").map((id) => isNaN(Number(id)) ? id : Number(id)) : null;
    const buildInfo = match[5] || null;
    return new _SemanticVersion(major, minor, patch, preRelease, buildInfo);
  }
};
var _MINIMUM_CLI_VERSION = new SemanticVersion(1, 4, 0);
function ensureMinimumVersionOrThrow(versionString) {
  if (versionString === undefined) {
    throw new Error(versionErrorMessage(versionString));
  }
  const version2 = SemanticVersion.parseVersionString(versionString);
  if (version2.compare(_MINIMUM_CLI_VERSION) < 0) {
    throw new Error(versionErrorMessage(versionString));
  }
}
function versionErrorMessage(incompatibleVersion) {
  return `Module code was generated with an incompatible version of the spacetimedb cli (${incompatibleVersion}). Update the cli version to at least ${_MINIMUM_CLI_VERSION.toString()} and regenerate the bindings. You can upgrade to the latest cli version by running: spacetime version upgrade`;
}
async function decompress(buffer, type, chunkSize = 128 * 1024) {
  let offset = 0;
  const readableStream = new ReadableStream({
    pull(controller) {
      if (offset < buffer.length) {
        const chunk = buffer.subarray(offset, Math.min(offset + chunkSize, buffer.length));
        controller.enqueue(chunk);
        offset += chunkSize;
      } else {
        controller.close();
      }
    }
  });
  const decompressionStream = new DecompressionStream(type);
  const decompressedStream = readableStream.pipeThrough(decompressionStream);
  const reader = decompressedStream.getReader();
  const chunks = [];
  let totalLength = 0;
  let result;
  while (!(result = await reader.read()).done) {
    chunks.push(result.value);
    totalLength += result.value.length;
  }
  const decompressedArray = new Uint8Array(totalLength);
  let chunkOffset = 0;
  for (const chunk of chunks) {
    decompressedArray.set(chunk, chunkOffset);
    chunkOffset += chunk.length;
  }
  return decompressedArray;
}
async function resolveWS() {
  if (typeof globalThis.WebSocket !== "undefined") {
    return globalThis.WebSocket;
  }
  const dynamicImport = new Function("m", "return import(m)");
  try {
    const { WebSocket: UndiciWS } = await dynamicImport("undici");
    return UndiciWS;
  } catch (err2) {
    stdbLogger("warn", "[spacetimedb-sdk] No global WebSocket found. On Node 18\u201321, please install `undici` (npm install undici) to enable WebSocket support.");
    throw err2;
  }
}
var WebsocketDecompressAdapter = class _WebsocketDecompressAdapter {
  onclose;
  onopen;
  onmessage;
  onerror;
  #ws;
  async#handleOnMessage(msg) {
    const buffer = new Uint8Array(msg.data);
    let decompressed;
    if (buffer[0] === 0) {
      decompressed = buffer.slice(1);
    } else if (buffer[0] === 1) {
      throw new Error("Brotli Compression not supported. Please use gzip or none compression in withCompression method on DbConnection.");
    } else if (buffer[0] === 2) {
      decompressed = await decompress(buffer.slice(1), "gzip");
    } else {
      throw new Error("Unexpected Compression Algorithm. Please use `gzip` or `none`");
    }
    this.onmessage?.({ data: decompressed });
  }
  #handleOnOpen(msg) {
    this.onopen?.(msg);
  }
  #handleOnError(msg) {
    this.onerror?.(msg);
  }
  #handleOnClose(msg) {
    this.onclose?.(msg);
  }
  send(msg) {
    this.#ws.send(msg);
  }
  close() {
    this.#ws.close();
  }
  constructor(ws) {
    this.onmessage = undefined;
    this.onopen = undefined;
    this.onmessage = undefined;
    this.onerror = undefined;
    ws.onmessage = this.#handleOnMessage.bind(this);
    ws.onerror = this.#handleOnError.bind(this);
    ws.onclose = this.#handleOnClose.bind(this);
    ws.onopen = this.#handleOnOpen.bind(this);
    ws.binaryType = "arraybuffer";
    this.#ws = ws;
  }
  static async createWebSocketFn({
    url,
    nameOrAddress,
    wsProtocol,
    authToken,
    compression,
    lightMode,
    confirmedReads
  }) {
    const headers = new Headers;
    const WS = await resolveWS();
    let temporaryAuthToken = undefined;
    if (authToken) {
      headers.set("Authorization", `Bearer ${authToken}`);
      const tokenUrl = new URL("v1/identity/websocket-token", url);
      tokenUrl.protocol = url.protocol === "wss:" ? "https:" : "http:";
      const response = await fetch(tokenUrl, { method: "POST", headers });
      if (response.ok) {
        const { token } = await response.json();
        temporaryAuthToken = token;
      } else {
        return Promise.reject(new Error(`Failed to verify token: ${response.statusText}`));
      }
    }
    const databaseUrl = new URL(`v1/database/${nameOrAddress}/subscribe`, url);
    if (temporaryAuthToken) {
      databaseUrl.searchParams.set("token", temporaryAuthToken);
    }
    databaseUrl.searchParams.set("compression", compression === "gzip" ? "Gzip" : "None");
    if (lightMode) {
      databaseUrl.searchParams.set("light", "true");
    }
    if (confirmedReads !== undefined) {
      databaseUrl.searchParams.set("confirmed", confirmedReads.toString());
    }
    const ws = new WS(databaseUrl.toString(), wsProtocol);
    return new _WebsocketDecompressAdapter(ws);
  }
};
var DbConnectionBuilder = class {
  constructor(remoteModule, dbConnectionCtor) {
    this.remoteModule = remoteModule;
    this.dbConnectionCtor = dbConnectionCtor;
    this.#createWSFn = WebsocketDecompressAdapter.createWebSocketFn;
  }
  #uri;
  #nameOrAddress;
  #identity;
  #token;
  #emitter = new EventEmitter;
  #compression = "gzip";
  #lightMode = false;
  #confirmedReads;
  #createWSFn;
  withUri(uri) {
    this.#uri = new URL(uri);
    return this;
  }
  withDatabaseName(nameOrAddress) {
    this.#nameOrAddress = nameOrAddress;
    return this;
  }
  withToken(token) {
    this.#token = token;
    return this;
  }
  withWSFn(createWSFn) {
    this.#createWSFn = createWSFn;
    return this;
  }
  withCompression(compression) {
    this.#compression = compression;
    return this;
  }
  withLightMode(lightMode) {
    this.#lightMode = lightMode;
    return this;
  }
  withConfirmedReads(confirmedReads) {
    this.#confirmedReads = confirmedReads;
    return this;
  }
  onConnect(callback) {
    this.#emitter.on("connect", callback);
    return this;
  }
  onConnectError(callback) {
    this.#emitter.on("connectError", callback);
    return this;
  }
  onDisconnect(callback) {
    this.#emitter.on("disconnect", callback);
    return this;
  }
  getUri() {
    return this.#uri?.toString() ?? "";
  }
  getModuleName() {
    return this.#nameOrAddress ?? "";
  }
  build() {
    if (!this.#uri) {
      throw new Error("URI is required to connect to SpacetimeDB");
    }
    if (!this.#nameOrAddress) {
      throw new Error("Database name or address is required to connect to SpacetimeDB");
    }
    ensureMinimumVersionOrThrow(this.remoteModule.versionInfo?.cliVersion);
    return this.dbConnectionCtor({
      uri: this.#uri,
      nameOrAddress: this.#nameOrAddress,
      identity: this.#identity,
      token: this.#token,
      emitter: this.#emitter,
      compression: this.#compression,
      lightMode: this.#lightMode,
      confirmedReads: this.#confirmedReads,
      createWSFn: this.#createWSFn,
      remoteModule: this.remoteModule
    });
  }
};
var INTERNAL_REMOTE_MODULE = Symbol("INTERNAL_REMOTE_MODULE");
var SubscriptionBuilderImpl = class {
  constructor(db) {
    this.db = db;
  }
  #onApplied = undefined;
  #onError = undefined;
  onApplied(cb) {
    this.#onApplied = cb;
    return this;
  }
  onError(cb) {
    this.#onError = cb;
    return this;
  }
  subscribe(query_sql) {
    let queries;
    if (typeof query_sql === "function") {
      const tablesMap = this.db.getTablesMap?.();
      const result = query_sql(tablesMap);
      queries = Array.isArray(result) ? result : [result];
    } else {
      queries = Array.isArray(query_sql) ? query_sql : [query_sql];
    }
    if (queries.length === 0) {
      throw new Error("Subscriptions must have at least one query");
    }
    const queryStrings = queries.map((q) => {
      if (typeof q === "string")
        return q;
      if (isRowTypedQuery(q))
        return toSql(q);
      throw new Error("Subscriptions must be SQL strings or typed queries");
    });
    return new SubscriptionHandleImpl(this.db, queryStrings, this.#onApplied, this.#onError);
  }
  subscribeToAllTables() {
    const remoteModule = this.db[INTERNAL_REMOTE_MODULE]();
    const queries = Object.values(remoteModule.tables).map((table2) => `SELECT * FROM ${table2.sourceName}`);
    this.subscribe(queries);
  }
};
var SubscriptionManager = class {
  subscriptions = /* @__PURE__ */ new Map;
};
var SubscriptionHandleImpl = class {
  constructor(db, querySql, onApplied, onError) {
    this.db = db;
    this.#emitter.on("applied", (ctx) => {
      this.#activeState = true;
      if (onApplied) {
        onApplied(ctx);
      }
    });
    this.#emitter.on("error", (ctx, error) => {
      this.#activeState = false;
      this.#endedState = true;
      if (onError) {
        onError(ctx, error);
      }
    });
    this.#querySetId = this.db.registerSubscription(this, this.#emitter, querySql);
  }
  #querySetId;
  #unsubscribeCalled = false;
  #endedState = false;
  #activeState = false;
  #emitter = new EventEmitter;
  unsubscribe() {
    if (this.#unsubscribeCalled) {
      throw new Error("Unsubscribe has already been called");
    }
    this.#unsubscribeCalled = true;
    this.db.unregisterSubscription(this.#querySetId);
    this.#emitter.on("end", (_ctx) => {
      this.#endedState = true;
      this.#activeState = false;
    });
  }
  unsubscribeThen(onEnd) {
    if (this.#endedState) {
      throw new Error("Subscription has already ended");
    }
    if (this.#unsubscribeCalled) {
      throw new Error("Unsubscribe has already been called");
    }
    this.#unsubscribeCalled = true;
    this.db.unregisterSubscription(this.#querySetId);
    this.#emitter.on("end", (ctx) => {
      this.#endedState = true;
      this.#activeState = false;
      onEnd(ctx);
    });
  }
  isEnded() {
    return this.#endedState;
  }
  isActive() {
    return this.#activeState;
  }
};
var DbConnectionImpl = class {
  isActive = false;
  identity = undefined;
  token = undefined;
  [INTERNAL_REMOTE_MODULE]() {
    return this.#remoteModule;
  }
  db;
  reducers;
  procedures;
  connectionId = ConnectionId.random();
  #queryId = 0;
  #requestId = 0;
  #eventId = 0;
  #emitter;
  #messageQueue = Promise.resolve();
  #outboundQueue = [];
  #subscriptionManager = new SubscriptionManager;
  #remoteModule;
  #reducerCallbacks = /* @__PURE__ */ new Map;
  #reducerCallInfo = /* @__PURE__ */ new Map;
  #procedureCallbacks = /* @__PURE__ */ new Map;
  #rowDeserializers;
  #reducerArgsSerializers;
  #procedureSerializers;
  #sourceNameToTableDef;
  clientCache;
  ws;
  wsPromise;
  constructor({
    uri,
    nameOrAddress,
    identity,
    token,
    emitter,
    remoteModule,
    createWSFn,
    compression,
    lightMode,
    confirmedReads
  }) {
    stdbLogger("info", "Connecting to SpacetimeDB WS...");
    const url = new URL(uri.toString());
    if (!/^wss?:/.test(uri.protocol)) {
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    }
    this.identity = identity;
    this.token = token;
    this.#remoteModule = remoteModule;
    this.#emitter = emitter;
    this.#rowDeserializers = /* @__PURE__ */ Object.create(null);
    this.#sourceNameToTableDef = /* @__PURE__ */ Object.create(null);
    for (const table2 of Object.values(remoteModule.tables)) {
      this.#rowDeserializers[table2.sourceName] = ProductType.makeDeserializer(table2.rowType);
      this.#sourceNameToTableDef[table2.sourceName] = table2;
    }
    this.#reducerArgsSerializers = /* @__PURE__ */ Object.create(null);
    for (const reducer of remoteModule.reducers) {
      this.#reducerArgsSerializers[reducer.name] = {
        serialize: ProductType.makeSerializer(reducer.paramsType),
        deserialize: ProductType.makeDeserializer(reducer.paramsType)
      };
    }
    this.#procedureSerializers = /* @__PURE__ */ Object.create(null);
    for (const procedure of remoteModule.procedures) {
      this.#procedureSerializers[procedure.name] = {
        serializeArgs: ProductType.makeSerializer(new ProductBuilder(procedure.params).algebraicType.value),
        deserializeReturn: AlgebraicType.makeDeserializer(procedure.returnType.algebraicType)
      };
    }
    const connectionId = this.connectionId.toHexString();
    url.searchParams.set("connection_id", connectionId);
    this.clientCache = new ClientCache;
    this.db = this.#makeDbView();
    this.reducers = this.#makeReducers(remoteModule);
    this.procedures = this.#makeProcedures(remoteModule);
    this.wsPromise = createWSFn({
      url,
      nameOrAddress,
      wsProtocol: "v2.bsatn.spacetimedb",
      authToken: token,
      compression,
      lightMode,
      confirmedReads
    }).then((v) => {
      this.ws = v;
      this.ws.onclose = () => {
        this.#emitter.emit("disconnect", this);
        this.isActive = false;
      };
      this.ws.onerror = (e) => {
        this.#emitter.emit("connectError", this, e);
        this.isActive = false;
      };
      this.ws.onopen = this.#handleOnOpen.bind(this);
      this.ws.onmessage = this.#handleOnMessage.bind(this);
      return v;
    }).catch((e) => {
      stdbLogger("error", "Error connecting to SpacetimeDB WS");
      this.#emitter.emit("connectError", this, e);
      return;
    });
  }
  #getNextQueryId = () => {
    const queryId = this.#queryId;
    this.#queryId += 1;
    return queryId;
  };
  #getNextRequestId = () => this.#requestId++;
  #makeDbView() {
    const view = /* @__PURE__ */ Object.create(null);
    for (const tbl of Object.values(this.#sourceNameToTableDef)) {
      const key = tbl.accessorName;
      Object.defineProperty(view, key, {
        enumerable: true,
        configurable: false,
        get: () => this.clientCache.getOrCreateTable(tbl)
      });
    }
    return view;
  }
  #makeReducers(def) {
    const out = {};
    for (const reducer of def.reducers) {
      const reducerName = reducer.name;
      const key = reducer.accessorName;
      const { serialize: serializeArgs } = this.#reducerArgsSerializers[reducerName];
      out[key] = (params) => {
        const writer = new BinaryWriter(1024);
        serializeArgs(writer, params);
        const argsBuffer = writer.getBuffer();
        return this.callReducer(reducerName, argsBuffer, params);
      };
    }
    return out;
  }
  #makeProcedures(def) {
    const out = {};
    for (const procedure of def.procedures) {
      const procedureName = procedure.name;
      const key = procedure.accessorName;
      const { serializeArgs, deserializeReturn } = this.#procedureSerializers[procedureName];
      out[key] = (params) => {
        const writer = new BinaryWriter(1024);
        serializeArgs(writer, params);
        const argsBuffer = writer.getBuffer();
        return this.callProcedure(procedureName, argsBuffer).then((returnBuf) => {
          return deserializeReturn(new BinaryReader(returnBuf));
        });
      };
    }
    return out;
  }
  #makeEventContext(event) {
    return {
      db: this.db,
      reducers: this.reducers,
      isActive: this.isActive,
      subscriptionBuilder: this.subscriptionBuilder.bind(this),
      disconnect: this.disconnect.bind(this),
      event
    };
  }
  subscriptionBuilder = () => {
    return new SubscriptionBuilderImpl(this);
  };
  getTablesMap() {
    return makeQueryBuilder({ tables: this.#remoteModule.tables });
  }
  registerSubscription(handle, handleEmitter, querySql) {
    const querySetId = this.#getNextQueryId();
    this.#subscriptionManager.subscriptions.set(querySetId, {
      handle,
      emitter: handleEmitter
    });
    const requestId = this.#getNextRequestId();
    this.#sendMessage(ClientMessage.Subscribe({
      queryStrings: querySql,
      querySetId: { id: querySetId },
      requestId
    }));
    return querySetId;
  }
  unregisterSubscription(querySetId) {
    const requestId = this.#getNextRequestId();
    this.#sendMessage(ClientMessage.Unsubscribe({
      querySetId: { id: querySetId },
      requestId,
      flags: UnsubscribeFlags.SendDroppedRows
    }));
  }
  #parseRowList(type, tableName, rowList) {
    const buffer = rowList.rowsData;
    const reader = new BinaryReader(buffer);
    const rows = [];
    const deserializeRow = this.#rowDeserializers[tableName];
    const table2 = this.#sourceNameToTableDef[tableName];
    const columnsArray = Object.entries(table2.columns);
    const primaryKeyColumnEntry = columnsArray.find((col) => col[1].columnMetadata.isPrimaryKey);
    let previousOffset = 0;
    while (reader.remaining > 0) {
      const row = deserializeRow(reader);
      let rowId = undefined;
      if (primaryKeyColumnEntry !== undefined) {
        const primaryKeyColName = primaryKeyColumnEntry[0];
        const primaryKeyColType = primaryKeyColumnEntry[1].typeBuilder.algebraicType;
        rowId = AlgebraicType.intoMapKey(primaryKeyColType, row[primaryKeyColName]);
      } else {
        const rowBytes = buffer.subarray(previousOffset, reader.offset);
        const asBase64 = $fromByteArray(rowBytes);
        rowId = asBase64;
      }
      previousOffset = reader.offset;
      rows.push({
        type,
        rowId,
        row
      });
    }
    return rows;
  }
  #mergeTableUpdates(updates) {
    const merged = /* @__PURE__ */ new Map;
    for (const update of updates) {
      const ops = merged.get(update.tableName);
      if (ops) {
        for (const op of update.operations)
          ops.push(op);
      } else {
        merged.set(update.tableName, update.operations.slice());
      }
    }
    return Array.from(merged, ([tableName, operations]) => ({
      tableName,
      operations
    }));
  }
  #queryRowsToTableUpdates(rows, opType) {
    const updates = [];
    for (const tableRows of rows.tables) {
      updates.push({
        tableName: tableRows.table,
        operations: this.#parseRowList(opType, tableRows.table, tableRows.rows)
      });
    }
    return this.#mergeTableUpdates(updates);
  }
  #tableUpdateRowsToOperations(tableName, rows) {
    if (rows.tag === "PersistentTable") {
      const inserts = this.#parseRowList("insert", tableName, rows.value.inserts);
      const deletes = this.#parseRowList("delete", tableName, rows.value.deletes);
      return inserts.concat(deletes);
    }
    if (rows.tag === "EventTable") {
      return this.#parseRowList("insert", tableName, rows.value.events);
    }
    return [];
  }
  #querySetUpdateToTableUpdates(querySetUpdate) {
    const updates = [];
    for (const tableUpdate of querySetUpdate.tables) {
      let operations = [];
      for (const rows of tableUpdate.rows) {
        operations = operations.concat(this.#tableUpdateRowsToOperations(tableUpdate.tableName, rows));
      }
      updates.push({
        tableName: tableUpdate.tableName,
        operations
      });
    }
    return this.#mergeTableUpdates(updates);
  }
  #sendEncoded(wsResolved, message) {
    stdbLogger("trace", () => `Sending message to server: ${stringify2(message)}`);
    const writer = new BinaryWriter(1024);
    ClientMessage.serialize(writer, message);
    const encoded = writer.getBuffer();
    wsResolved.send(encoded);
  }
  #flushOutboundQueue(wsResolved) {
    if (!this.isActive || this.#outboundQueue.length === 0) {
      return;
    }
    const pending = this.#outboundQueue.splice(0);
    for (const message of pending) {
      this.#sendEncoded(wsResolved, message);
    }
  }
  #sendMessage(message) {
    this.wsPromise.then((wsResolved) => {
      if (!wsResolved || !this.isActive) {
        this.#outboundQueue.push(message);
        return;
      }
      this.#flushOutboundQueue(wsResolved);
      this.#sendEncoded(wsResolved, message);
    });
  }
  #nextEventId() {
    this.#eventId += 1;
    return `${this.connectionId.toHexString()}:${this.#eventId}`;
  }
  #handleOnOpen() {
    this.isActive = true;
    if (this.ws) {
      this.#flushOutboundQueue(this.ws);
    }
  }
  #applyTableUpdates(tableUpdates, eventContext) {
    const pendingCallbacks = [];
    for (const tableUpdate of tableUpdates) {
      const tableName = tableUpdate.tableName;
      const tableDef2 = this.#sourceNameToTableDef[tableName];
      const table2 = this.clientCache.getOrCreateTable(tableDef2);
      const newCallbacks = table2.applyOperations(tableUpdate.operations, eventContext);
      for (const callback of newCallbacks) {
        pendingCallbacks.push(callback);
      }
    }
    return pendingCallbacks;
  }
  #applyTransactionUpdates(eventContext, tu) {
    const allUpdates = [];
    for (const querySetUpdate of tu.querySets) {
      const tableUpdates = this.#querySetUpdateToTableUpdates(querySetUpdate);
      for (const update of tableUpdates) {
        allUpdates.push(update);
      }
    }
    return this.#applyTableUpdates(this.#mergeTableUpdates(allUpdates), eventContext);
  }
  async#processMessage(data) {
    const serverMessage = ServerMessage.deserialize(new BinaryReader(data));
    stdbLogger("trace", () => `Processing server message: ${stringify2(serverMessage)}`);
    switch (serverMessage.tag) {
      case "InitialConnection": {
        this.identity = serverMessage.value.identity;
        if (!this.token && serverMessage.value.token) {
          this.token = serverMessage.value.token;
        }
        this.connectionId = serverMessage.value.connectionId;
        this.#emitter.emit("connect", this, this.identity, this.token);
        break;
      }
      case "SubscribeApplied": {
        const querySetId = serverMessage.value.querySetId.id;
        const subscription = this.#subscriptionManager.subscriptions.get(querySetId);
        if (!subscription) {
          stdbLogger("error", `Received SubscribeApplied for unknown querySetId ${querySetId}.`);
          return;
        }
        const event = {
          id: this.#nextEventId(),
          tag: "SubscribeApplied"
        };
        const eventContext = this.#makeEventContext(event);
        const tableUpdates = this.#queryRowsToTableUpdates(serverMessage.value.rows, "insert");
        const callbacks = this.#applyTableUpdates(tableUpdates, eventContext);
        const { event: _, ...subscriptionEventContext } = eventContext;
        subscription.emitter.emit("applied", subscriptionEventContext);
        stdbLogger("trace", () => `Calling ${callbacks.length} triggered row callbacks`);
        for (const callback of callbacks) {
          callback.cb();
        }
        break;
      }
      case "UnsubscribeApplied": {
        const querySetId = serverMessage.value.querySetId.id;
        const subscription = this.#subscriptionManager.subscriptions.get(querySetId);
        if (!subscription) {
          stdbLogger("error", `Received UnsubscribeApplied for unknown querySetId ${querySetId}.`);
          return;
        }
        const event = {
          id: this.#nextEventId(),
          tag: "UnsubscribeApplied"
        };
        const eventContext = this.#makeEventContext(event);
        const tableUpdates = serverMessage.value.rows ? this.#queryRowsToTableUpdates(serverMessage.value.rows, "delete") : [];
        const callbacks = this.#applyTableUpdates(tableUpdates, eventContext);
        const { event: _, ...subscriptionEventContext } = eventContext;
        subscription.emitter.emit("end", subscriptionEventContext);
        this.#subscriptionManager.subscriptions.delete(querySetId);
        stdbLogger("trace", () => `Calling ${callbacks.length} triggered row callbacks`);
        for (const callback of callbacks) {
          callback.cb();
        }
        break;
      }
      case "SubscriptionError": {
        const querySetId = serverMessage.value.querySetId.id;
        const requestId = serverMessage.value.requestId;
        const error = Error(serverMessage.value.error);
        const event = {
          id: this.#nextEventId(),
          tag: "Error",
          value: error
        };
        const eventContext = this.#makeEventContext(event);
        const errorContext = {
          ...eventContext,
          event: error
        };
        if (requestId == null) {
          stdbLogger("error", `Disconnecting due to error for a previously applied subscription: ${serverMessage.value.error}`);
          this.disconnect();
          break;
        }
        const subscription = this.#subscriptionManager.subscriptions.get(querySetId);
        if (subscription) {
          subscription.emitter.emit("error", errorContext, error);
          this.#subscriptionManager.subscriptions.delete(querySetId);
        } else {
          stdbLogger("error", `Received SubscriptionError for unknown querySetId ${querySetId}:`, error);
        }
        break;
      }
      case "TransactionUpdate": {
        const event = {
          id: this.#nextEventId(),
          tag: "Transaction"
        };
        const eventContext = this.#makeEventContext(event);
        const callbacks = this.#applyTransactionUpdates(eventContext, serverMessage.value);
        stdbLogger("trace", () => `Calling ${callbacks.length} triggered row callbacks`);
        for (const callback of callbacks) {
          callback.cb();
        }
        break;
      }
      case "ReducerResult": {
        const { requestId, result } = serverMessage.value;
        if (result.tag === "Ok") {
          const reducerInfo = this.#reducerCallInfo.get(requestId);
          const eventId = this.#nextEventId();
          const event = reducerInfo ? {
            id: eventId,
            tag: "Reducer",
            value: {
              timestamp: serverMessage.value.timestamp,
              outcome: result,
              reducer: {
                name: reducerInfo.name,
                args: reducerInfo.args
              }
            }
          } : {
            id: eventId,
            tag: "Transaction"
          };
          const eventContext = this.#makeEventContext(event);
          const callbacks = this.#applyTransactionUpdates(eventContext, result.value.transactionUpdate);
          stdbLogger("trace", () => `Calling ${callbacks.length} triggered row callbacks`);
          for (const callback of callbacks) {
            callback.cb();
          }
        }
        this.#reducerCallInfo.delete(requestId);
        const cb = this.#reducerCallbacks.get(requestId);
        this.#reducerCallbacks.delete(requestId);
        cb?.(result);
        break;
      }
      case "ProcedureResult": {
        const { status, requestId } = serverMessage.value;
        const result = status.tag === "Returned" ? { tag: "Ok", value: status.value } : { tag: "Err", value: status.value };
        const cb = this.#procedureCallbacks.get(requestId);
        this.#procedureCallbacks.delete(requestId);
        cb?.(result);
        break;
      }
      case "OneOffQueryResult": {
        stdbLogger("warn", "Received OneOffQueryResult but SDK does not expose one-off query APIs yet.");
        break;
      }
    }
  }
  #handleOnMessage(wsMessage) {
    this.#messageQueue = this.#messageQueue.then(() => {
      return this.#processMessage(wsMessage.data);
    });
  }
  callReducer(reducerName, argsBuffer, reducerArgs) {
    const { promise, resolve, reject } = Promise.withResolvers();
    const requestId = this.#getNextRequestId();
    const message = ClientMessage.CallReducer({
      reducer: reducerName,
      args: argsBuffer,
      requestId,
      flags: 0
    });
    this.#sendMessage(message);
    if (reducerArgs) {
      this.#reducerCallInfo.set(requestId, {
        name: reducerName,
        args: reducerArgs
      });
    }
    this.#reducerCallbacks.set(requestId, (result) => {
      if (result.tag === "Ok" || result.tag === "OkEmpty") {
        resolve();
      } else {
        if (result.tag === "Err") {
          const reader = new BinaryReader(result.value);
          const errorString = reader.readString();
          reject(new SenderError2(errorString));
        } else if (result.tag === "InternalError") {
          reject(new InternalError(result.value));
        } else {
          reject(new Error("Unexpected reducer result"));
        }
      }
    });
    return promise;
  }
  callReducerWithParams(reducerName, _paramsType, params) {
    const writer = new BinaryWriter(1024);
    this.#reducerArgsSerializers[reducerName].serialize(writer, params);
    const argsBuffer = writer.getBuffer();
    return this.callReducer(reducerName, argsBuffer, params);
  }
  callProcedure(procedureName, argsBuffer) {
    const { promise, resolve, reject } = Promise.withResolvers();
    const requestId = this.#getNextRequestId();
    const message = ClientMessage.CallProcedure({
      procedure: procedureName,
      args: argsBuffer,
      requestId,
      flags: 0
    });
    this.#sendMessage(message);
    this.#procedureCallbacks.set(requestId, (result) => {
      if (result.tag === "Ok") {
        resolve(result.value);
      } else {
        reject(result.value);
      }
    });
    return promise;
  }
  callProcedureWithParams(procedureName, _paramsType, params, _returnType) {
    const writer = new BinaryWriter(1024);
    const { serializeArgs, deserializeReturn } = this.#procedureSerializers[procedureName];
    serializeArgs(writer, params);
    const argsBuffer = writer.getBuffer();
    return this.callProcedure(procedureName, argsBuffer).then((returnBuf) => {
      return deserializeReturn(new BinaryReader(returnBuf));
    });
  }
  disconnect() {
    this.wsPromise.then((wsResolved) => {
      if (wsResolved) {
        wsResolved.close();
      }
    });
  }
  on(eventName, callback) {
    this.#emitter.on(eventName, callback);
  }
  off(eventName, callback) {
    this.#emitter.off(eventName, callback);
  }
  onConnect(callback) {
    this.#emitter.on("connect", callback);
  }
  onDisconnect(callback) {
    this.#emitter.on("disconnect", callback);
  }
  onConnectError(callback) {
    this.#emitter.on("connectError", callback);
  }
  removeOnConnect(callback) {
    this.#emitter.off("connect", callback);
  }
  removeOnDisconnect(callback) {
    this.#emitter.off("disconnect", callback);
  }
  removeOnConnectError(callback) {
    this.#emitter.off("connectError", callback);
  }
};
var ModuleContext = class {
  #compoundTypes = /* @__PURE__ */ new Map;
  #moduleDef = {
    typespace: { types: [] },
    tables: [],
    reducers: [],
    types: [],
    rowLevelSecurity: [],
    schedules: [],
    procedures: [],
    views: [],
    lifeCycleReducers: [],
    caseConversionPolicy: { tag: "SnakeCase" },
    explicitNames: {
      entries: []
    }
  };
  get moduleDef() {
    return this.#moduleDef;
  }
  rawModuleDefV10() {
    const sections = [];
    const push = (s) => {
      if (s)
        sections.push(s);
    };
    const module = this.#moduleDef;
    push(module.typespace && { tag: "Typespace", value: module.typespace });
    push(module.types && { tag: "Types", value: module.types });
    push(module.tables && { tag: "Tables", value: module.tables });
    push(module.reducers && { tag: "Reducers", value: module.reducers });
    push(module.procedures && { tag: "Procedures", value: module.procedures });
    push(module.views && { tag: "Views", value: module.views });
    push(module.schedules && { tag: "Schedules", value: module.schedules });
    push(module.lifeCycleReducers && {
      tag: "LifeCycleReducers",
      value: module.lifeCycleReducers
    });
    push(module.rowLevelSecurity && {
      tag: "RowLevelSecurity",
      value: module.rowLevelSecurity
    });
    push(module.explicitNames && {
      tag: "ExplicitNames",
      value: module.explicitNames
    });
    push(module.caseConversionPolicy && {
      tag: "CaseConversionPolicy",
      value: module.caseConversionPolicy
    });
    return { sections };
  }
  setCaseConversionPolicy(policy) {
    this.#moduleDef.caseConversionPolicy = policy;
  }
  get typespace() {
    return this.#moduleDef.typespace;
  }
  resolveType(typeBuilder) {
    let ty = typeBuilder.algebraicType;
    while (ty.tag === "Ref") {
      ty = this.typespace.types[ty.value];
    }
    return ty;
  }
  registerTypesRecursively(typeBuilder) {
    if (typeBuilder instanceof ProductBuilder && !isUnit(typeBuilder) || typeBuilder instanceof SumBuilder || typeBuilder instanceof RowBuilder) {
      return this.#registerCompoundTypeRecursively(typeBuilder);
    } else if (typeBuilder instanceof OptionBuilder) {
      return new OptionBuilder(this.registerTypesRecursively(typeBuilder.value));
    } else if (typeBuilder instanceof ResultBuilder) {
      return new ResultBuilder(this.registerTypesRecursively(typeBuilder.ok), this.registerTypesRecursively(typeBuilder.err));
    } else if (typeBuilder instanceof ArrayBuilder) {
      return new ArrayBuilder(this.registerTypesRecursively(typeBuilder.element));
    } else {
      return typeBuilder;
    }
  }
  #registerCompoundTypeRecursively(typeBuilder) {
    const ty = typeBuilder.algebraicType;
    const name = typeBuilder.typeName;
    if (name === undefined) {
      throw new Error(`Missing type name for ${typeBuilder.constructor.name ?? "TypeBuilder"} ${JSON.stringify(typeBuilder)}`);
    }
    let r = this.#compoundTypes.get(ty);
    if (r != null) {
      return r;
    }
    const newTy = typeBuilder instanceof RowBuilder || typeBuilder instanceof ProductBuilder ? {
      tag: "Product",
      value: { elements: [] }
    } : {
      tag: "Sum",
      value: { variants: [] }
    };
    r = new RefBuilder(this.#moduleDef.typespace.types.length);
    this.#moduleDef.typespace.types.push(newTy);
    this.#compoundTypes.set(ty, r);
    if (typeBuilder instanceof RowBuilder) {
      for (const [name2, elem] of Object.entries(typeBuilder.row)) {
        newTy.value.elements.push({
          name: name2,
          algebraicType: this.registerTypesRecursively(elem.typeBuilder).algebraicType
        });
      }
    } else if (typeBuilder instanceof ProductBuilder) {
      for (const [name2, elem] of Object.entries(typeBuilder.elements)) {
        newTy.value.elements.push({
          name: name2,
          algebraicType: this.registerTypesRecursively(elem).algebraicType
        });
      }
    } else if (typeBuilder instanceof SumBuilder) {
      for (const [name2, variant] of Object.entries(typeBuilder.variants)) {
        newTy.value.variants.push({
          name: name2,
          algebraicType: this.registerTypesRecursively(variant).algebraicType
        });
      }
    }
    this.#moduleDef.types.push({
      sourceName: splitName(name),
      ty: r.ref,
      customOrdering: true
    });
    return r;
  }
};
function isUnit(typeBuilder) {
  return typeBuilder.typeName == null && typeBuilder.algebraicType.value.elements.length === 0;
}
function splitName(name) {
  const scope = name.split(".");
  return { sourceName: scope.pop(), scope };
}
var AlgebraicType2 = t.enum("AlgebraicType", {
  Ref: t.u32(),
  get Sum() {
    return SumType2;
  },
  get Product() {
    return ProductType2;
  },
  get Array() {
    return AlgebraicType2;
  },
  String: t.unit(),
  Bool: t.unit(),
  I8: t.unit(),
  U8: t.unit(),
  I16: t.unit(),
  U16: t.unit(),
  I32: t.unit(),
  U32: t.unit(),
  I64: t.unit(),
  U64: t.unit(),
  I128: t.unit(),
  U128: t.unit(),
  I256: t.unit(),
  U256: t.unit(),
  F32: t.unit(),
  F64: t.unit()
});
var CaseConversionPolicy = t.enum("CaseConversionPolicy", {
  None: t.unit(),
  SnakeCase: t.unit()
});
var ExplicitNameEntry = t.enum("ExplicitNameEntry", {
  get Table() {
    return NameMapping;
  },
  get Function() {
    return NameMapping;
  },
  get Index() {
    return NameMapping;
  }
});
var ExplicitNames = t.object("ExplicitNames", {
  get entries() {
    return t.array(ExplicitNameEntry);
  }
});
var FunctionVisibility = t.enum("FunctionVisibility", {
  Private: t.unit(),
  ClientCallable: t.unit()
});
var HttpHeaderPair = t.object("HttpHeaderPair", {
  name: t.string(),
  value: t.byteArray()
});
var HttpHeaders = t.object("HttpHeaders", {
  get entries() {
    return t.array(HttpHeaderPair);
  }
});
var HttpMethod = t.enum("HttpMethod", {
  Get: t.unit(),
  Head: t.unit(),
  Post: t.unit(),
  Put: t.unit(),
  Delete: t.unit(),
  Connect: t.unit(),
  Options: t.unit(),
  Trace: t.unit(),
  Patch: t.unit(),
  Extension: t.string()
});
t.object("HttpRequest", {
  get method() {
    return HttpMethod;
  },
  get headers() {
    return HttpHeaders;
  },
  timeout: t.option(t.timeDuration()),
  uri: t.string(),
  get version() {
    return HttpVersion;
  }
});
t.object("HttpResponse", {
  get headers() {
    return HttpHeaders;
  },
  get version() {
    return HttpVersion;
  },
  code: t.u16()
});
var HttpVersion = t.enum("HttpVersion", {
  Http09: t.unit(),
  Http10: t.unit(),
  Http11: t.unit(),
  Http2: t.unit(),
  Http3: t.unit()
});
var IndexType = t.enum("IndexType", {
  BTree: t.unit(),
  Hash: t.unit()
});
var Lifecycle = t.enum("Lifecycle", {
  Init: t.unit(),
  OnConnect: t.unit(),
  OnDisconnect: t.unit()
});
var MiscModuleExport = t.enum("MiscModuleExport", {
  get TypeAlias() {
    return TypeAlias;
  }
});
var NameMapping = t.object("NameMapping", {
  sourceName: t.string(),
  canonicalName: t.string()
});
var ProductType2 = t.object("ProductType", {
  get elements() {
    return t.array(ProductTypeElement);
  }
});
var ProductTypeElement = t.object("ProductTypeElement", {
  name: t.option(t.string()),
  get algebraicType() {
    return AlgebraicType2;
  }
});
var RawColumnDefV8 = t.object("RawColumnDefV8", {
  colName: t.string(),
  get colType() {
    return AlgebraicType2;
  }
});
var RawColumnDefaultValueV10 = t.object("RawColumnDefaultValueV10", {
  colId: t.u16(),
  value: t.byteArray()
});
var RawColumnDefaultValueV9 = t.object("RawColumnDefaultValueV9", {
  table: t.string(),
  colId: t.u16(),
  value: t.byteArray()
});
var RawConstraintDataV9 = t.enum("RawConstraintDataV9", {
  get Unique() {
    return RawUniqueConstraintDataV9;
  }
});
var RawConstraintDefV10 = t.object("RawConstraintDefV10", {
  sourceName: t.option(t.string()),
  get data() {
    return RawConstraintDataV9;
  }
});
var RawConstraintDefV8 = t.object("RawConstraintDefV8", {
  constraintName: t.string(),
  constraints: t.u8(),
  columns: t.array(t.u16())
});
var RawConstraintDefV9 = t.object("RawConstraintDefV9", {
  name: t.option(t.string()),
  get data() {
    return RawConstraintDataV9;
  }
});
var RawIndexAlgorithm = t.enum("RawIndexAlgorithm", {
  BTree: t.array(t.u16()),
  Hash: t.array(t.u16()),
  Direct: t.u16()
});
var RawIndexDefV10 = t.object("RawIndexDefV10", {
  sourceName: t.option(t.string()),
  accessorName: t.option(t.string()),
  get algorithm() {
    return RawIndexAlgorithm;
  }
});
var RawIndexDefV8 = t.object("RawIndexDefV8", {
  indexName: t.string(),
  isUnique: t.bool(),
  get indexType() {
    return IndexType;
  },
  columns: t.array(t.u16())
});
var RawIndexDefV9 = t.object("RawIndexDefV9", {
  name: t.option(t.string()),
  accessorName: t.option(t.string()),
  get algorithm() {
    return RawIndexAlgorithm;
  }
});
var RawLifeCycleReducerDefV10 = t.object("RawLifeCycleReducerDefV10", {
  get lifecycleSpec() {
    return Lifecycle;
  },
  functionName: t.string()
});
var RawMiscModuleExportV9 = t.enum("RawMiscModuleExportV9", {
  get ColumnDefaultValue() {
    return RawColumnDefaultValueV9;
  },
  get Procedure() {
    return RawProcedureDefV9;
  },
  get View() {
    return RawViewDefV9;
  }
});
t.enum("RawModuleDef", {
  get V8BackCompat() {
    return RawModuleDefV8;
  },
  get V9() {
    return RawModuleDefV9;
  },
  get V10() {
    return RawModuleDefV10;
  }
});
var RawModuleDefV10 = t.object("RawModuleDefV10", {
  get sections() {
    return t.array(RawModuleDefV10Section);
  }
});
var RawModuleDefV10Section = t.enum("RawModuleDefV10Section", {
  get Typespace() {
    return Typespace;
  },
  get Types() {
    return t.array(RawTypeDefV10);
  },
  get Tables() {
    return t.array(RawTableDefV10);
  },
  get Reducers() {
    return t.array(RawReducerDefV10);
  },
  get Procedures() {
    return t.array(RawProcedureDefV10);
  },
  get Views() {
    return t.array(RawViewDefV10);
  },
  get Schedules() {
    return t.array(RawScheduleDefV10);
  },
  get LifeCycleReducers() {
    return t.array(RawLifeCycleReducerDefV10);
  },
  get RowLevelSecurity() {
    return t.array(RawRowLevelSecurityDefV9);
  },
  get CaseConversionPolicy() {
    return CaseConversionPolicy;
  },
  get ExplicitNames() {
    return ExplicitNames;
  }
});
var RawModuleDefV8 = t.object("RawModuleDefV8", {
  get typespace() {
    return Typespace;
  },
  get tables() {
    return t.array(TableDesc);
  },
  get reducers() {
    return t.array(ReducerDef);
  },
  get miscExports() {
    return t.array(MiscModuleExport);
  }
});
var RawModuleDefV9 = t.object("RawModuleDefV9", {
  get typespace() {
    return Typespace;
  },
  get tables() {
    return t.array(RawTableDefV9);
  },
  get reducers() {
    return t.array(RawReducerDefV9);
  },
  get types() {
    return t.array(RawTypeDefV9);
  },
  get miscExports() {
    return t.array(RawMiscModuleExportV9);
  },
  get rowLevelSecurity() {
    return t.array(RawRowLevelSecurityDefV9);
  }
});
var RawProcedureDefV10 = t.object("RawProcedureDefV10", {
  sourceName: t.string(),
  get params() {
    return ProductType2;
  },
  get returnType() {
    return AlgebraicType2;
  },
  get visibility() {
    return FunctionVisibility;
  }
});
var RawProcedureDefV9 = t.object("RawProcedureDefV9", {
  name: t.string(),
  get params() {
    return ProductType2;
  },
  get returnType() {
    return AlgebraicType2;
  }
});
var RawReducerDefV10 = t.object("RawReducerDefV10", {
  sourceName: t.string(),
  get params() {
    return ProductType2;
  },
  get visibility() {
    return FunctionVisibility;
  },
  get okReturnType() {
    return AlgebraicType2;
  },
  get errReturnType() {
    return AlgebraicType2;
  }
});
var RawReducerDefV9 = t.object("RawReducerDefV9", {
  name: t.string(),
  get params() {
    return ProductType2;
  },
  get lifecycle() {
    return t.option(Lifecycle);
  }
});
var RawRowLevelSecurityDefV9 = t.object("RawRowLevelSecurityDefV9", {
  sql: t.string()
});
var RawScheduleDefV10 = t.object("RawScheduleDefV10", {
  sourceName: t.option(t.string()),
  tableName: t.string(),
  scheduleAtCol: t.u16(),
  functionName: t.string()
});
var RawScheduleDefV9 = t.object("RawScheduleDefV9", {
  name: t.option(t.string()),
  reducerName: t.string(),
  scheduledAtColumn: t.u16()
});
var RawScopedTypeNameV10 = t.object("RawScopedTypeNameV10", {
  scope: t.array(t.string()),
  sourceName: t.string()
});
var RawScopedTypeNameV9 = t.object("RawScopedTypeNameV9", {
  scope: t.array(t.string()),
  name: t.string()
});
var RawSequenceDefV10 = t.object("RawSequenceDefV10", {
  sourceName: t.option(t.string()),
  column: t.u16(),
  start: t.option(t.i128()),
  minValue: t.option(t.i128()),
  maxValue: t.option(t.i128()),
  increment: t.i128()
});
var RawSequenceDefV8 = t.object("RawSequenceDefV8", {
  sequenceName: t.string(),
  colPos: t.u16(),
  increment: t.i128(),
  start: t.option(t.i128()),
  minValue: t.option(t.i128()),
  maxValue: t.option(t.i128()),
  allocated: t.i128()
});
var RawSequenceDefV9 = t.object("RawSequenceDefV9", {
  name: t.option(t.string()),
  column: t.u16(),
  start: t.option(t.i128()),
  minValue: t.option(t.i128()),
  maxValue: t.option(t.i128()),
  increment: t.i128()
});
var RawTableDefV10 = t.object("RawTableDefV10", {
  sourceName: t.string(),
  productTypeRef: t.u32(),
  primaryKey: t.array(t.u16()),
  get indexes() {
    return t.array(RawIndexDefV10);
  },
  get constraints() {
    return t.array(RawConstraintDefV10);
  },
  get sequences() {
    return t.array(RawSequenceDefV10);
  },
  get tableType() {
    return TableType;
  },
  get tableAccess() {
    return TableAccess;
  },
  get defaultValues() {
    return t.array(RawColumnDefaultValueV10);
  },
  isEvent: t.bool()
});
var RawTableDefV8 = t.object("RawTableDefV8", {
  tableName: t.string(),
  get columns() {
    return t.array(RawColumnDefV8);
  },
  get indexes() {
    return t.array(RawIndexDefV8);
  },
  get constraints() {
    return t.array(RawConstraintDefV8);
  },
  get sequences() {
    return t.array(RawSequenceDefV8);
  },
  tableType: t.string(),
  tableAccess: t.string(),
  scheduled: t.option(t.string())
});
var RawTableDefV9 = t.object("RawTableDefV9", {
  name: t.string(),
  productTypeRef: t.u32(),
  primaryKey: t.array(t.u16()),
  get indexes() {
    return t.array(RawIndexDefV9);
  },
  get constraints() {
    return t.array(RawConstraintDefV9);
  },
  get sequences() {
    return t.array(RawSequenceDefV9);
  },
  get schedule() {
    return t.option(RawScheduleDefV9);
  },
  get tableType() {
    return TableType;
  },
  get tableAccess() {
    return TableAccess;
  }
});
var RawTypeDefV10 = t.object("RawTypeDefV10", {
  get sourceName() {
    return RawScopedTypeNameV10;
  },
  ty: t.u32(),
  customOrdering: t.bool()
});
var RawTypeDefV9 = t.object("RawTypeDefV9", {
  get name() {
    return RawScopedTypeNameV9;
  },
  ty: t.u32(),
  customOrdering: t.bool()
});
var RawUniqueConstraintDataV9 = t.object("RawUniqueConstraintDataV9", {
  columns: t.array(t.u16())
});
var RawViewDefV10 = t.object("RawViewDefV10", {
  sourceName: t.string(),
  index: t.u32(),
  isPublic: t.bool(),
  isAnonymous: t.bool(),
  get params() {
    return ProductType2;
  },
  get returnType() {
    return AlgebraicType2;
  }
});
var RawViewDefV9 = t.object("RawViewDefV9", {
  name: t.string(),
  index: t.u32(),
  isPublic: t.bool(),
  isAnonymous: t.bool(),
  get params() {
    return ProductType2;
  },
  get returnType() {
    return AlgebraicType2;
  }
});
var ReducerDef = t.object("ReducerDef", {
  name: t.string(),
  get args() {
    return t.array(ProductTypeElement);
  }
});
var SumType2 = t.object("SumType", {
  get variants() {
    return t.array(SumTypeVariant);
  }
});
var SumTypeVariant = t.object("SumTypeVariant", {
  name: t.option(t.string()),
  get algebraicType() {
    return AlgebraicType2;
  }
});
var TableAccess = t.enum("TableAccess", {
  Public: t.unit(),
  Private: t.unit()
});
var TableDesc = t.object("TableDesc", {
  get schema() {
    return RawTableDefV8;
  },
  data: t.u32()
});
var TableType = t.enum("TableType", {
  System: t.unit(),
  User: t.unit()
});
var TypeAlias = t.object("TypeAlias", {
  name: t.string(),
  ty: t.u32()
});
var Typespace = t.object("Typespace", {
  get types() {
    return t.array(AlgebraicType2);
  }
});
t.enum("ViewResultHeader", {
  RowData: t.unit(),
  RawSql: t.string()
});

// ../../betterspace/src/server/env.ts
var isTestMode = () => process.env.SPACETIMEDB_TEST_MODE === "true";

// ../../betterspace/src/server/test.ts
var DEFAULT_HTTP_URL = "http://localhost:3000";
var DEFAULT_MODULE_NAME = "betterspace";
var DEFAULT_WS_URL = "ws://localhost:3000";
var CONNECT_TIMEOUT_MS = 1e4;
var IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/u;
var REMOTE_MODULE = {
  procedures: [],
  reducers: [],
  tables: {},
  versionInfo: { cliVersion: "2.0.0" }
};
var toHttpUrl = (wsUrl) => {
  if (wsUrl.startsWith("ws://"))
    return `http://${wsUrl.slice("ws://".length)}`;
  if (wsUrl.startsWith("wss://"))
    return `https://${wsUrl.slice("wss://".length)}`;
  return wsUrl;
};
var parseJsonResponse = async (response) => {
  const text = await response.text();
  if (!response.ok) {
    const message = text.trim().length > 0 ? text : response.statusText;
    throw new Error(`HTTP_${String(response.status)}: ${message}`);
  }
  if (text.trim().length === 0)
    return null;
  return JSON.parse(text);
};
var getReducerParamMap = (schema) => {
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
var getSchema = async (ctx) => {
  const response = await fetch(`${ctx.baseHttpUrl}/v1/database/${ctx.moduleName}/schema?version=9`);
  return parseJsonResponse(response);
};
var createConnectedUser = async (ctx) => {
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
var ensureIdentifier = (value, kind) => {
  const valid = IDENTIFIER_RE.test(value);
  if (!valid)
    throw new Error(`INVALID_${kind}: ${value}`);
  return value;
};
var normalizeReducerArgs = (ctx, reducerName, args) => {
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
var getSqlFields = (schema) => {
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
var rowToObject = (row, fields) => {
  if (!Array.isArray(row) || fields.length === 0 || fields.length !== row.length)
    return row;
  const result = {}, rowValues = row;
  for (let i2 = 0;i2 < fields.length; i2 += 1) {
    const fieldName = fields[i2], value = rowValues[i2];
    if (fieldName)
      result[fieldName] = value;
  }
  return result;
};
var postSql = async (ctx, query, token) => {
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
var postReducer = async (ctx, request) => {
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
var createTestContext = async (options) => {
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
  for (let i2 = 1;i2 < userCount; i2 += 1)
    pendingUsers.push(createConnectedUser(ctx));
  const additionalUsers = await Promise.all(pendingUsers);
  for (const user of additionalUsers)
    ctx.users.push(user);
  return ctx;
};
var createTestUser = async (ctx) => {
  const user = await createConnectedUser(ctx);
  ctx.users.push(user);
  return user;
};
var asUser = async (_ctx, user, fn) => fn(user);
var callReducer = async (ctx, name, ...rest) => {
  const [args, user] = rest, activeUser = user ?? ctx.defaultUser, safeName = ensureIdentifier(name, "REDUCER_NAME"), callArgs = normalizeReducerArgs(ctx, safeName, args);
  return postReducer(ctx, { args: callArgs, reducerName: safeName, token: activeUser.token });
};
var queryTable = async (ctx, tableName, user) => {
  const activeUser = user ?? ctx.defaultUser, safeTableName = ensureIdentifier(tableName, "TABLE_NAME"), sql = `SELECT * FROM ${safeTableName}`, results = await postSql(ctx, sql, activeUser.token);
  if (results.length === 0)
    return [];
  const [first] = results, rows = first?.rows ?? [], fields = getSqlFields(first?.schema), mapped = [];
  for (const row of rows)
    mapped.push(rowToObject(row, fields));
  return mapped;
};
var cleanup = async (ctx) => {
  if (ctx.reducerParams.has("reset_all_data"))
    await postReducer(ctx, { args: [], reducerName: "reset_all_data", token: ctx.defaultUser.token });
  for (const user of ctx.users)
    user.connection.disconnect();
  ctx.users.length = 0;
};
// ../../betterspace/src/server/test-discover.ts
var DEFAULT_HTTP_URL2 = "http://localhost:3000";
var DEFAULT_MODULE_NAME2 = "betterspace";
var parseSchemaResponse = async (response) => {
  const text = await response.text();
  if (!response.ok) {
    const message = text.trim().length > 0 ? text : response.statusText;
    throw new Error(`DISCOVER_MODULES_FAILED: ${message}`);
  }
  return JSON.parse(text);
};
var pickNames = (rows) => {
  const names = [];
  for (const row of rows ?? []) {
    const { name } = row;
    if (name)
      names.push(name);
  }
  return names;
};
var discoverModules = async (options) => {
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
