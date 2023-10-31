import { defineConfig } from 'vite';
import LibTypes from 'vite-plugin-lib-types';
import fs from 'fs/promises';

function buildMatchExpression(module: string | string[]): RegExp {
  const expression = Array.isArray(module)
    ? module.length === 0
      ? null
      : `(?:${module.join('|')})`
    : module;
  return new RegExp(
    `\\s?declare ${
      expression ? `(?:module ['"]${expression}['"]|global)` : 'global'
    }\\s?{[\\s\\S]*\n}\\s?`,
    'g'
  );
}

const importDefaultCode = `
var __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { "default": mod };
};
`;

export default defineConfig({
  plugins: [
    LibTypes({
      async transform(code) {
        const declareCode = await fs.readFile('./src/declare.ts', 'utf-8');
        const matchExpression = buildMatchExpression('axios');
        let matched: RegExpMatchArray | null;
        while ((matched = matchExpression.exec(declareCode))) {
          const matchedContent = matched[0];
          code += matchedContent;
        }
        return code;
      },
    }),
    {
      name: 'cjs-require-adapter',
      renderChunk(code, _, options) {
        if (options.format === 'cjs') {
          code = code
            .replace(/['"]use strict['"]/, '$&' + importDefaultCode)
            .replace(/require\((['"]([^'"]+)['"])\)/g, (_, $1, $2) =>
              $2.startsWith('.') ? _ : `__importDefault(require(${$1})).default`
            );
        }
        return code;
      },
    },
  ],
  build: {
    target: 'ES2018',
    sourcemap: true,
    minify: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['cjs', 'es'],
    },
    emptyOutDir: true,
    rollupOptions: {
      external: [/^axios/],
    },
  },
});
