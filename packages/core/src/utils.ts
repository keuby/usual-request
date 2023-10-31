export type Fn<P extends unknown[], R> = (...p: P) => R;
export type LooseObject = Record<string, any>;
export type Callable = Fn<any[], any>;

export const noop: Callable = () => void 0;

export function isArray(value: unknown): value is any[] {
  return Array.isArray(value);
}

export function isFunction(val: unknown): val is Callable {
  return typeof val === 'function';
}

export function isObject(val: unknown): val is Record<string, unknown> {
  return isDef(val) && typeof val === 'object';
}

export function isPromise(obj: any): obj is Promise<unknown> {
  return isDef(obj) && isFunction(obj.then) && isFunction(obj.catch);
}

export function isDef<T>(val: T): val is NonNullable<T> {
  return val !== null && val !== undefined;
}

export function ensureArray<T>(val: T | T[]): T[] {
  return isArray(val) ? val : [val];
}

export function compose<P extends unknown[], R1, R2>(
  f1: Fn<[R1], R2>,
  f2: Fn<P, R1>
): (...p: P) => R2;
export function compose<P extends unknown[], R1, R2, R3>(
  f1: Fn<[R2], R3>,
  f2: Fn<[R1], R2>,
  f3: Fn<P, R1>
): (...p: P) => R3;
export function compose<P extends unknown[], R1, R2, R3, R4>(
  f1: Fn<[R3], R4>,
  f2: Fn<[R2], R3>,
  f3: Fn<[R1], R2>,
  f4: Fn<P, R1>
): (...p: P) => R4;
export function compose<P extends unknown[], R1, R2, R3, R4, R5>(
  f1: Fn<[R4], R5>,
  f2: Fn<[R3], R4>,
  f3: Fn<[R2], R3>,
  f4: Fn<[R1], R2>,
  f5: Fn<P, R1>
): (...p: P) => R5;
export function compose<P extends unknown[], R>(...fns: Fn<P, R>[]): Fn<P, R>;
export function compose(...fns: Callable[]): Callable {
  const [first, rest] = [fns.pop(), fns.reverse()];
  return first
    ? function (this: any, ...p) {
        const r = first.apply(this, p);
        return rest.length > 0 ? rest.reduce((t, fn) => fn.call(this, t), r) : r;
      }
    : noop;
}
