import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    include: ['packages/*/src/**/*.test.ts'],
    alias: {
      '@mockingboard/shared': path.resolve(
        __dirname,
        'packages/shared/src/index.ts',
      ),
      '@/': path.resolve(__dirname, 'packages/web/src') + '/',
    },
  },
});
