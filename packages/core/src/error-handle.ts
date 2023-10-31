import type { SkipStrategyMap } from './interface';
import { isAxiosError, type AxiosError } from 'axios';
import { isFunction, isPromise } from './utils';
import type { HttpClient } from './client';

function getErrorMessage(error: AxiosError, client: HttpClient): string | null {
  return error ? error.message : null;
}

export const skipStrategyMap = {
  all: (error: AxiosError) => {
    return !!error.config?.skipErrorHandle;
  },
  biz: (error: AxiosError) => {
    const isSkip = !!error.config?.skipErrorHandle;
    if (isSkip) {
      const status = error.response?.status;
      return !!status && status >= 200 && status < 300;
    }
    return false;
  },
};

export type ErrorHandler = (error: AxiosError, client: HttpClient) => any;
export type ErrorChainHandler = (
  error: AxiosError,
  next: (error?: AxiosError) => void
) => void | string | null | Promise<void | string | null>;

export type ErrorChainType = 'unauthorized' | 'accessDenied' | 'serverError';

export interface ErrorHandlerOptions {
  parseError?(error: AxiosError, client: HttpClient): any;
  /**
   * 获取错误提示信息，返回 null 不显示错误提示
   */
  getErrorMessage?(error: AxiosError, client: HttpClient): string | null | void;
  showErrorMessage?(msg: string, client: HttpClient): void;
  skipStrategy?: keyof typeof skipStrategyMap;
  skipErrorHandle?(error: AxiosError, client: HttpClient): boolean;
  onServerError?: ErrorChainHandler;
  onUnauthorized?: ErrorChainHandler;
  onAccessDenied?: ErrorChainHandler;
  /** @deprecated use {@link onAccessDenied} instead of */
  onPermissionDenied?: ErrorChainHandler;
}

const defaultOptions: Required<ErrorHandlerOptions> = {
  parseError: (e) => e,
  getErrorMessage: getErrorMessage,
  skipStrategy: 'biz',
  skipErrorHandle: skipStrategyMap.biz,
  showErrorMessage: (msg) => console.error(`[@knx/http]: response error: ${msg}`),
  onUnauthorized: (_, next) => next(_),
  onAccessDenied: (_, next) => next(_),
  onPermissionDenied: (_, next) => next(_),
  onServerError: (_, next) => next(_),
};

export function createErrorHandler(options: ErrorHandlerOptions = {}): ErrorHandler {
  const mergedOptions = Object.assign({}, defaultOptions);
  if (isFunction(options)) {
    mergedOptions.showErrorMessage = options;
  } else {
    const { skipErrorHandle, skipStrategy, ...restOptions } = options;
    Object.assign(mergedOptions, restOptions);
    if (skipErrorHandle) {
      mergedOptions.skipErrorHandle = skipErrorHandle;
    } else if (skipStrategy) {
      const strategy = skipStrategyMap[skipStrategy];
      mergedOptions.skipErrorHandle = strategy ?? skipStrategyMap.all;
    }
  }

  const {
    parseError,
    skipErrorHandle,
    getErrorMessage: customGetErrorMessage,
    showErrorMessage,
    onServerError,
    onPermissionDenied,
    onUnauthorized,
    onAccessDenied = onPermissionDenied,
  } = mergedOptions;

  function isSkipError(error: AxiosError, client: HttpClient) {
    if (isAxiosError(error)) {
      const strategy = error.config?.skipStrategy;
      if (strategy && strategy in skipStrategyMap) {
        return skipStrategyMap[strategy](error);
      } else {
        return skipErrorHandle(error, client);
      }
    }
    return true;
  }

  function next(error: AxiosError, client: HttpClient): string | null | void;
  function next(
    error: AxiosError,
    client: HttpClient,
    chainType: ErrorChainType
  ): ReturnType<ErrorChainHandler>;
  function next(
    error: AxiosError,
    client: HttpClient,
    chainType?: ErrorChainType
  ): ReturnType<ErrorChainHandler> {
    const errMsg: ReturnType<ErrorChainHandler> = chainType
      ? client.chain(chainType, error)
      : void 0;

    const handleErrMsg = (msg: void | string | null) => {
      if (
        msg === undefined ||
        (msg = customGetErrorMessage(error, client)) === undefined
      ) {
        msg = getErrorMessage(error, client);
      }
      return msg;
    };

    return isPromise(errMsg) ? errMsg.then(handleErrMsg) : handleErrMsg(errMsg);
  }

  return async (err, client) => {
    if (!isSkipError(err, client)) {
      const status = err.response?.status ?? 0;
      const errMsg =
        status === 401
          ? await onUnauthorized(err, (e = err) => next(e, client, 'unauthorized'))
          : status === 403
          ? await onAccessDenied(err, (e = err) => next(e, client, 'accessDenied'))
          : status >= 500
          ? await onServerError(err, (e = err) => next(e, client, 'serverError'))
          : next(err, client);
      errMsg && showErrorMessage(errMsg, client);
    }
    return Promise.reject(await parseError(err, client));
  };
}
