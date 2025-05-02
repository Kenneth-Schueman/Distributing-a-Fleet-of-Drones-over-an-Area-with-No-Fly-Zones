import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/integration',
  webServer: {
    command: 'vite',
    port: 5173,  // Adjust if your Vite project runs on a different port
    timeout: 60000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
});