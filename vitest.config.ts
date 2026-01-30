import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['packages/*/src/**/*.test.ts'],
    alias: {
      '@mockingboard/shared': './packages/shared/src/index.ts',
    },
  },
});
