import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./tests/global-setup'),
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  use: {
    baseURL: process.env.SERVER_URL,
    extraHTTPHeaders: {
      'x-country-code': process.env.X_COUNTRY_CODE ?? '',
    },
  },
  projects: [
    // All normal tests run first in parallel.
    {
      name: 'main',
      testIgnore: /teardown\.spec\.ts/,
    },
    // Teardown runs after main completes — safe to logout/mutate the current session.
    {
      name: 'teardown',
      testMatch: /teardown\.spec\.ts/,
      dependencies: ['main'],
    },
  ],
});
