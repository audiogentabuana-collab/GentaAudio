import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    server: { deps: { inline: [/server-only/] } },
    alias: { 'server-only': path.resolve(import.meta.dirname, 'tests/stubs/empty.ts') },
  },
});
