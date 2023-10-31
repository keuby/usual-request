import { defineConfig } from 'vite';
import LibTypes from 'vite-plugin-lib-types';
import pkg from './package.json';

export default defineConfig({
  plugins: [LibTypes()],
  build: {
    target: 'ES2018',
    sourcemap: true,
    minify: false,
    lib: {
      entry: {
        'usual-request': './src/index.ts',
        decorators: './src/decorators.ts',
      },
      formats: ['cjs', 'es'],
    },
    emptyOutDir: true,
    rollupOptions: {
      external: Object.keys(pkg.dependencies),
    },
  },
});
