import type { NormalizedTokenManager } from './token';
import { type RequestAdapterDecorator, isAxiosError } from '@usual-request/core';
import { isDef } from '@usual-request/shared';

/**
 * 创建鉴权 http 装饰器
 *
 * @param tokenManager - token 管理器，可以通过 `createTokenManager` 创建
 */
export const createAuthDecorator = (
  tokenManager: NormalizedTokenManager
): RequestAdapterDecorator => {
  let refreshing: Promise<string | null> | null = null;

  const getToken = async () => {
    const token = await tokenManager.getToken();
    return token
      ? { isRefreshed: false, token }
      : {
          isRefreshed: true,
          token: await (refreshing ??
            (refreshing = tokenManager
              .refreshToken()
              .then((res) => ((refreshing = null), res)))),
        };
  };

  return (adapter) => {
    return async (config) => {
      const { token, isRefreshed } = await getToken();
      let response: any;
      try {
        if (config.tokenHeader !== false && token) {
          config.headers![config.tokenHeader ?? 'Authorization'] = token;
        }
        response = await adapter(config);
      } catch (error: unknown) {
        if (!isAxiosError(error) || isRefreshed || error.response?.status !== 401) {
          throw error;
        }
        const token = await tokenManager.refreshToken();
        if (!isDef(token)) {
          throw error;
        }
        config.headers!.Authorization = token;
        response = await adapter(config);
      }

      return response;
    };
  };
};
