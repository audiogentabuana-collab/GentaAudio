import { defineConfig, devices } from '@playwright/test';

/**
 * E2E memakai production build + GAS_MOCK=true (Apps Script asli dijalankan
 * dengan Spreadsheet/Drive tiruan), jadi tidak butuh akun Google.
 */
const PORT = 3100;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'off',
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `rm -rf .mock-gas .next/cache && npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      GAS_MOCK: 'true',
      SESSION_SECRET: 'e2e-session-secret-0123456789abcdefghijklmnop',
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
      MOCK_ADMIN_USERNAME: 'admin',
      MOCK_ADMIN_PASSWORD: 'admin12345',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
});
