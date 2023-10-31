declare module 'axios/unsafe/adapters/adapters' {
  const adapters: {
    getAdapter: (types: string[]) => any;
  };

  export default adapters;
}
