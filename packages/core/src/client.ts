import type { AxiosInstance } from 'axios';
import type {
  HttpClientDataHandler,
  HttpClientOptions,
  RequestConfig,
} from './interface';
import axios, { AxiosError } from 'axios';
import adapters from 'axios/unsafe/adapters/adapters';
import { compose, ensureArray, isFunction, isObject } from './utils';
import {
  createErrorHandler,
  type ErrorChainHandler,
  type ErrorChainType,
} from './error-handle';

const defaultDataHandle: HttpClientDataHandler = (data) => data.data;

export class HttpClient {
  public http: AxiosInstance;

  private _options: HttpClientOptions;

  private chains: Record<ErrorChainType, ErrorChainHandler[]> = {
    serverError: [],
    unauthorized: [],
    accessDenied: [],
  };

  constructor(options: HttpClientOptions) {
    const {
      handle = defaultDataHandle,
      adapter = adapters.getAdapter(['xhr', 'http']),
      baseURL = '/',
      onError,
      errorHandler,
      decorator = [],
      ...defaultConfig
    } = options;

    const createAdapter = compose(...ensureArray(decorator));

    const handleError = isFunction(errorHandler)
      ? errorHandler
      : isObject(errorHandler)
      ? createErrorHandler(errorHandler)
      : onError ?? createErrorHandler();

    const reportError = (error: AxiosError) => {
      return handleError(error, this) ?? Promise.reject(error);
    };

    this.http = axios.create({
      baseURL,
      adapter: createAdapter(adapter),
      ...defaultConfig,
    });

    this.http.interceptors.response.use(
      (response) => {
        const { config, request, data } = response;
        switch (config.contentBody) {
          case 'response':
            return response;
          case 'data':
            return data;
          default: {
            return handle(data, (code, message, customProps) => {
              const error = AxiosError.from(
                { name: 'BizError', message },
                code.toString(),
                config,
                request,
                response,
                customProps
              );
              return reportError(error);
            });
          }
        }
      },
      (error) => reportError(error)
    );

    this._options = {
      handle,
      adapter,
      baseURL,
      errorHandler: handleError,
      decorator,
      ...defaultConfig,
    };
  }

  chain(type: ErrorChainType, cb: ErrorChainHandler): void;
  chain(type: ErrorChainType, error: AxiosError): ReturnType<ErrorChainHandler>;
  chain(type: ErrorChainType, params: ErrorChainHandler | AxiosError) {
    if (isFunction(params)) {
      this.chains[type].push(params);
    } else {
      const chains = this.chains[type];
      return this.runChain(params, chains[Symbol.iterator]());
    }
  }

  private runChain(
    error: AxiosError,
    iterator: IterableIterator<ErrorChainHandler>
  ): ReturnType<ErrorChainHandler> {
    const { value, done } = iterator.next();
    return done ? undefined : value(error, (e) => this.runChain(e ?? error, iterator));
  }

  request<T = any>(config: RequestConfig): Promise<T> {
    return this.http.request(config);
  }

  get<T = any>(url: string, params?: any, config?: RequestConfig): Promise<T> {
    return this.request({ method: 'GET', url, params, ...config });
  }

  delete<T = any>(url: string, params?: any, config?: RequestConfig): Promise<T> {
    return this.request({ method: 'DELETE', url, params, ...config });
  }

  head<T = any>(url: string, params?: any, config?: RequestConfig): Promise<T> {
    return this.request({ method: 'HEAD', url, params, ...config });
  }

  options<T = any>(url: string, params?: any, config?: RequestConfig): Promise<T> {
    return this.request({ method: 'OPTIONS', url, params, ...config });
  }

  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request({ method: 'POST', url, data, ...config });
  }

  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request({ method: 'PUT', url, data, ...config });
  }

  patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request({ method: 'PATCH', url, data, ...config });
  }

  clone(options: HttpClientOptions): HttpClient {
    const client = new (this.constructor as typeof HttpClient)({
      ...this._options,
      ...options,
    });
    client.chains = this.chains;
    return client;
  }
}
