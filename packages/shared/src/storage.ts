import jsCookie from 'js-cookie';
import { isDef } from './check';

const serializers = /*#__PURE__*/ {
  boolean: {
    read: (v: string) => v === 'true',
    write: (v: boolean) => String(v),
  },
  object: {
    read: (v: string) => JSON.parse(v),
    write: (v: object) => JSON.stringify(v),
  },
  number: {
    read: (v: string) => Number.parseFloat(v),
    write: (v: number) => String(v),
  },
  any: {
    read: (v: string) => v,
    write: (v: any) => String(v),
  },
  string: {
    read: (v: string) => v,
    write: (v: string) => String(v),
  },
  map: {
    read: (v: string) => new Map(JSON.parse(v)),
    write: (v: Map<any, any>) => JSON.stringify(Array.from(v.entries())),
  },
  set: {
    read: (v: string) => new Set(JSON.parse(v)),
    write: (v: Set<any>) => JSON.stringify(Array.from(v.values())),
  },
};

function guessSerializerType(rawInit: unknown) {
  switch (true) {
    case !isDef(rawInit):
      return 'any';
    case rawInit instanceof Set:
      return 'set';
    case rawInit instanceof Map:
      return 'map';
    case typeof rawInit === 'boolean':
      return 'boolean';
    case typeof rawInit === 'string':
      return 'string';
    case typeof rawInit === 'object':
      return 'object';
    case Array.isArray(rawInit):
      return 'object';
    case !Number.isNaN(rawInit):
      return 'number';
    default:
      return 'any';
  }
}

interface Storage {
  getItem(key: string): any;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function createStorage(storage: Storage): {
  write<T = unknown>(key: string, value: T | null, parse?: (v: T) => string): void;
  read<T = unknown>(key: string): T | undefined;
  read<T = unknown>(key: string, value: null, parse?: (v: string) => T): T | null;
  read<T = unknown>(key: string, value: T, parse?: (v: string) => T): T;
  remove(key: string): void;
} {
  return {
    write: <T = unknown>(
      key: string,
      value: T | null,
      parse?: (v: T) => string
    ): void => {
      if (value == null) {
        storage.removeItem(key);
        return;
      }
      if (!isDef(parse)) {
        const type = guessSerializerType(value);
        parse = serializers[type].write as (v: T) => string;
      }
      storage.setItem(key, parse(value));
    },
    read: <T = unknown>(
      key: string,
      defaultValue?: T | null,
      parse?: (v: string) => T
    ): T | null | undefined => {
      if (!isDef(parse)) {
        const type = guessSerializerType(defaultValue);
        parse = serializers[type].read as (v: string) => T;
      }
      const value = storage.getItem(key);
      return isDef(value) ? parse(value) : defaultValue;
    },
    remove: (key: string): void => storage.removeItem(key),
  };
}

/**
 * localStorage 存取封装
 */
export const local = /*#__PURE__*/ createStorage(localStorage);

/**
 * sessionStorage 存取封装
 */
export const session = /*#__PURE__*/ createStorage(sessionStorage);

/**
 * cookie 存取封装
 */
export const cookie = /*#__PURE__*/ createStorage({
  getItem: (key) => jsCookie.get(key),
  setItem: (key, value) => jsCookie.set(key, value),
  removeItem: (key) => jsCookie.remove(key),
});
