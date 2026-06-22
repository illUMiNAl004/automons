import { defineConfig } from 'vitest/config';

// The engine is pure TS, so tests run in a plain Node environment (no jsdom needed for M1).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
