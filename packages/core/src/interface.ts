import type { AxiosError, AxiosAdapter, AxiosRequestConfig } from 'axios';
import type { ErrorHandler, ErrorHandlerOptions } from './error-handle';

import type { AxiosRequestHeaders, AxiosResponse } from 'axios';

export type RequestHeaders = AxiosRequestHeaders;

export interface RequestConfig<T = any> extends AxiosRequestConfig<T> {}

export interface RequestResponse<T = any> extends AxiosResponse<T> {
  config: RequestConfig<T> & { headers: RequestHeaders };
}

export interface RequestPromise<T = any> extends Promise<RequestResponse<T>> {}

export type RequestAdapter = (config: RequestConfig) => RequestPromise;

export type RequestAdapterDecorator = (adapter: RequestAdapter) => RequestAdapter;

export type SkipStrategy = (error: AxiosError) => boolean;

export interface SkipStrategyMap {
  all: SkipStrategy;
  biz: SkipStrategy;
}

export interface CustomRequestConfig {
  /**
   * @default 'biz'
   */
  contentBody?: 'data' | 'response' | 'biz';
  /**
   * @default false
   */
  skipErrorHandle?: boolean;
  /**
   * @default 'biz'
   */
  skipStrategy?: keyof SkipStrategyMap;
}

export type HttpClientDataHandler = (
  data: any,
  reportError: (
    code: number,
    message: string,
    customProps?: Record<string, unknown>
  ) => unknown
) => unknown;

export interface HttpClientOptions extends RequestConfig {
  /**
   * 自定义接口数据处理逻辑
   *
   * @param data - 接口返回的原始数据
   * @param reportError - 报告错误，例如接口返回的原始数据存在错误码时，可以使用此方法报告错误
   */
  handle?: HttpClientDataHandler;
  /**
   * 当接口调用发生错误时，注册此方法会被调用
   *
   * @deprecated use `errorHandler` instead of
   *
   * @param error - axios 错误对象
   */
  onError?: ErrorHandler;
  /**
   * 当接口调用发生错误时，如何错误处理策略
   *
   * @param error - axios 错误对象
   */
  errorHandler?: ErrorHandler | ErrorHandlerOptions;
  /**
   * axios 适配装饰器
   */
  decorator?: RequestAdapterDecorator | RequestAdapterDecorator[];
}
