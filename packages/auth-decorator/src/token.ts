import {
  isDef,
  isString,
  isFunction,
  isPromise,
  local,
  session,
  cookie,
} from '@usual-request/shared';

export type TokenChangeScene =
  | 'custom'
  | 'setToken'
  | 'readOnCookie'
  | 'readOnQuery'
  | 'readOnLocal'
  | 'readOnSession';

/**
 * Token 管理器，通过该实例来管理和维护 SDK Token 的获取和刷新
 */
export interface NormalizedTokenManager {
  /**
   * 获取一个 token，若已存在 token 则会直接返回缓存的 token
   */
  getToken(): Promise<string | null>;

  /**
   * 设置 token，并存储到 localStorage 中
   *
   * @param newToken - 设置的新 token
   */
  setToken(newToken: string | null): Promise<void>;

  /**
   * 同步获取 token
   */
  getTokenSync(): string | null;

  /**
   * 刷新 token，此操作会清除缓存的 token，并返回新的 token，通常用于 token 失效，或者重新登陆时调用
   */
  refreshToken(): Promise<string | null>;

  /**
   * 同步刷新 token，此操作会清除缓存的 token，并返回新的 token，通常用于 token 失效，或者重新登陆时调用
   */
  refreshTokenSync(): string | null;

  /**
   * 监听 token 改变事件
   * @param fn - token 改变时回调函数
   * @param options - 选项参数
   */
  onTokenChange(
    fn: (newToken: string | null, scene: TokenChangeScene) => Promise<void> | void,
    options?: {
      autoTrigger?: boolean;
      ignoreFirstTrigger?: boolean;
    }
  ): VoidFunction;

  /**
   * 判断 token 是否合法
   */
  getValidToken(): Promise<string | null>;

  /**
   * 判断 token 是否合法
   */
  getValidTokenSync(): string | null;

  /**
   * token 准备就绪
   */
  isReady(): Promise<boolean>;
}

export interface TokenManager {
  /**
   * 一个用于存储 token 的 localStorage key
   */
  key?: string;
  /**
   * 获取一个 token，若已存在 token 则会直接返回缓存的 token
   */
  getToken?(): string | null | Promise<string | null>;

  /**
   * token 发生变化时更新 token
   * @param newToken -  新 token
   */
  setToken?(newToken: string): Promise<void>;

  /**
   * 刷新 token，此操作会清除缓存的 token，并返回新的 token，通常用于 token 失效，或者重新登陆时调用
   */
  refreshToken?(): string | null | Promise<string | null>;

  /**
   * 判断 token 是否合法
   */
  isValidToken?(token: string): boolean;
}

export type TokenManagerParam =
  | string
  | (() => string | null | Promise<string | null>)
  | TokenManager;

/**
 * 创建默认 token 管理器，其获取 token 逻辑如下
 * 1. 若 cookie 中存在名为 token 的 key，则读取之，并存入 localStorage 中，并删除 cookie 中的 token key
 * 2. 若 localStorage 中存在 为 token 的key，则读取之，将值作为 token 值返回
 */
export function createTokenManager(): NormalizedTokenManager;
/**
 * 创建一个管理器
 * @param key - 一个 localStorage key
 */
export function createTokenManager(key: string): NormalizedTokenManager;
/**
 * 创建一个管理器
 * @param getToken - 一个返回 accessToken 的函数
 */
export function createTokenManager(
  getToken: () => string | Promise<string>
): NormalizedTokenManager;
/**
 * 创建一个管理器
 * @param options - token 管理器选项
 */
export function createTokenManager(options: TokenManager): NormalizedTokenManager;
export function createTokenManager(param: TokenManagerParam): NormalizedTokenManager;
export function createTokenManager(
  param: TokenManagerParam = 'token'
): NormalizedTokenManager {
  let token: string | null;
  let tokenPromise: Promise<string | null>;
  let isFirstTrigger = true;
  let lastScene: TokenChangeScene | null = null;
  const manager = {} as NormalizedTokenManager;
  const tokenChangedCbs: CallableFunction[] = [];

  async function triggerTokenChanged(newToken: string | null, scene: TokenChangeScene) {
    lastScene = scene;
    if (isFirstTrigger) {
      isFirstTrigger = false;
      return;
    }
    await Promise.all(
      tokenChangedCbs.map(async (cb) => {
        try {
          await cb(newToken, scene);
        } catch (error) {
          console.error('[@knx/http]: token changed callback execute error', error);
        }
      })
    );
  }

  function wrapTokenGetter(get: () => string | null | Promise<string | null>) {
    return async () => {
      const currentToken = await get();
      if (currentToken !== token) {
        token = currentToken;
        await triggerTokenChanged(currentToken, 'custom');
      }
      return currentToken;
    };
  }

  function createTokenGetter(key: string): () => Promise<string | null> {
    const parse = (raw: string): string => {
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    };

    return async () => {
      let currentToken: string | null = null;

      // read token from cookie
      currentToken = cookie.read<string>(key, null);
      if (isDef(currentToken)) {
        if (currentToken !== token) {
          token = currentToken;
          cookie.remove(key);
          local.write(key, currentToken, JSON.stringify);
          await triggerTokenChanged(currentToken, 'readOnCookie');
        }
        return currentToken;
      }

      // read token from url query
      const searchParams = new URLSearchParams(location.search);
      currentToken = searchParams.get(key);
      if (isDef(currentToken)) {
        if (currentToken !== token) {
          token = currentToken;
          searchParams.delete(key);
          const query = searchParams.toString();
          history.replaceState(
            history.state,
            '',
            `${location.pathname}${query ? '?' + query : query}${location.hash}`
          );
          local.write(key, currentToken, JSON.stringify);
          await triggerTokenChanged(currentToken, 'readOnQuery');
        }
        return currentToken;
      }

      // read token from localStorage
      currentToken = local.read(key, null, parse);
      if (isDef(currentToken)) {
        if (currentToken !== token) {
          token = currentToken;
          await triggerTokenChanged(currentToken, 'readOnLocal');
        }
        return currentToken;
      }

      // read token from sessionStorage
      currentToken = session.read(key, null, parse);
      if (isDef(currentToken)) {
        if (currentToken !== token) {
          token = currentToken;
          await triggerTokenChanged(currentToken, 'readOnSession');
        }
        return currentToken;
      }

      return currentToken;
    };
  }

  function createTokenSetter(key?: string): (newToken: string | null) => Promise<void> {
    return async (newToken) => {
      token = newToken;
      key && local.write(key, token, JSON.stringify);
      await (tokenPromise = new Promise<string | null>((resolve) => {
        triggerTokenChanged(token, 'setToken').then(() => {
          resolve(newToken);
        });
      }));
    };
  }

  let options: TokenManager;

  if (isString(param)) {
    const getToken = createTokenGetter(param);
    const setToken = createTokenSetter(param);
    options = {
      getToken,
      setToken,
      refreshToken: getToken,
    };
  } else if (isFunction(param)) {
    const getToken = wrapTokenGetter(param);
    const setToken = createTokenSetter();
    options = {
      getToken,
      setToken,
      refreshToken: getToken,
    };
  } else {
    options = param;
  }

  const {
    key = 'token',
    getToken = createTokenGetter(key),
    setToken = createTokenSetter(key),
    refreshToken = getToken,
    isValidToken = () => true,
  } = options;

  const handleResult = (newToken: string | null | Promise<string | null>) => {
    if (isPromise(newToken)) {
      tokenPromise = newToken.then((t) => (token = t));
    } else {
      token = newToken;
      tokenPromise = Promise.resolve(newToken);
    }
  };

  manager.setToken = setToken;

  manager.getToken = () => {
    if (token) return Promise.resolve(token);
    if (!isDef(tokenPromise)) handleResult(getToken());
    return tokenPromise;
  };

  manager.getTokenSync = () => {
    if (!isDef(tokenPromise)) handleResult(getToken());
    return token;
  };

  manager.getValidToken = async () => {
    const token = await manager.getToken();
    return token && isValidToken(token) ? token : null;
  };

  manager.getValidTokenSync = () => {
    const token = manager.getTokenSync();
    return token && isValidToken(token) ? token : null;
  };

  manager.refreshToken = () => {
    handleResult(refreshToken());
    return tokenPromise;
  };

  manager.refreshTokenSync = () => {
    handleResult(refreshToken());
    return token;
  };

  manager.onTokenChange = (cb, options = {}) => {
    isFirstTrigger = !!options.ignoreFirstTrigger;
    tokenChangedCbs.push(cb);
    if (options.autoTrigger && token) {
      Promise.resolve().then(() => cb(token, lastScene!));
    }
    return () => {
      const idx = tokenChangedCbs.indexOf(cb);
      idx >= 0 && tokenChangedCbs.splice(idx, 1);
    };
  };

  manager.isReady = async () => {
    try {
      await manager.getToken();
      return true;
    } catch {
      return false;
    }
  };

  return manager;
}

export interface JwtTokenData {
  identityId: string;
  expireDate: number;
  exp: number;
  iat: number;
  userId: string;
  jti: string;
}
