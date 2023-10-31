declare module '@usual-request/core' {
  export interface CustomRequestConfig {
    /**
     * 是否添加 Authorization 请求头
     *
     * @default 'Authorization'
     */
    tokenHeader?: string | false;
  }
}

export {};
