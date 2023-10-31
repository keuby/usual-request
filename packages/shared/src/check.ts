import type { Callable, LooseObject } from './types';

export function isArray(value: unknown): value is any[] {
  return Array.isArray(value);
}

export function isFunction(val: unknown): val is Callable {
  return typeof val === 'function';
}

export function isObject(val: unknown): val is LooseObject {
  return isDef(val) && typeof val === 'object';
}
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date;
}

export function isPromise(obj: any): obj is Promise<unknown> {
  return isDef(obj) && isFunction(obj.then) && isFunction(obj.catch);
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

export function isSymbol(val: unknown): val is symbol {
  return typeof val === 'symbol';
}

export function hasOwn(val: object, key: string | symbol): key is never {
  return Object.hasOwnProperty.call(val, key);
}

export function isReactive(value: any): boolean {
  if (isReadonly(value)) {
    return isReactive(value['__v_raw' /* RAW */]);
  }
  return !!(value && value['__v_isReactive' /* IS_REACTIVE */]);
}

export function isReadonly(value: any): boolean {
  return !!(value && value['__v_isReadonly' /* IS_READONLY */]);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isDef<T>(val: T): val is NonNullable<T> {
  return val !== null && val !== undefined;
}
