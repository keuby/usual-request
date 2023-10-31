export type Fn<P extends unknown[], R> = (...p: P) => R;
export type LooseObject = Record<string, any>;
export type ElementOf<T> = T extends Array<infer E> ? E : never;
export type Callable = Fn<any[], any>;
export type UnPromise<T> = T extends Promise<infer R> ? R : unknown;
