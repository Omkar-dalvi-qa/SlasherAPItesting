import { defineConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const cfg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'config.json'), 'utf-8')
);

export default defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./tests/global-setup'),
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  use: {
    baseURL: cfg.serverUrl,
    extraHTTPHeaders: {
      'x-country-code': cfg.countryCode ?? '',
    },
  },
  projects: [
    {
      name: 'main',
      testIgnore: /teardown\.spec\.ts/,
    },
    {
      name: 'teardown',
      testMatch: /teardown\.spec\.ts/,
      dependencies: ['main'],
    },
  ],
});
