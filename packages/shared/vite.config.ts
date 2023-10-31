import { defineConfig } from 'vite';
import LibTypes from 'vite-plugin-lib-types';

export default defineConfig({
  plugins: [LibTypes()],
  build: {
    target: 'ES2018',
    sourcemap: true,
    minify: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['cjs', 'es'],
    },
    emptyOutDir: true,
  },
});
