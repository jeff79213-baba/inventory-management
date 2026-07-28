import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
  },
  webServer: {
    command: 'npx serve public -p 8080 --no-clipboard',
    port: 8080,
    reuseExistingServer: false,
  },
});
