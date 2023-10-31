import type { CustomRequestConfig } from './interface';

declare module 'axios' {
  export interface AxiosRequestConfig extends CustomRequestConfig {}
}

export {};
