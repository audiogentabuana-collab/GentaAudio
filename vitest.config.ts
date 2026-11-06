import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    server: { deps: { inline: [/server-only/] } },
    alias: { 'server-only': path.resolve(__dirname, 'tests/stubs/empty.ts') },
  },
});
