import * as fs from 'fs';
import * as path from 'path';

const cfg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../config.json'), 'utf-8')
);

export const config = {
  version:      cfg.apiVersion   ?? 'v1',
  langId:       cfg.langId       ?? '1',
  deviceId:     cfg.deviceId     ?? 'playwright-test-device',
  countryCode:  cfg.countryCode  ?? 'AE',
  // AUTH_TOKEN and REFRESH_TOKEN are minted fresh each run by global-setup.ts
  // and written to process.env — they cannot live in config.json
  authToken:    process.env.AUTH_TOKEN    ?? cfg.authToken ?? '',
  refreshToken: process.env.REFRESH_TOKEN ?? '',
};

export function apiPath(segment: string): string {
  return `/api/${config.version}${segment}`;
}

export function baseQuery(extra: Record<string, string> = {}): Record<string, string> {
  return { lang_id: config.langId, deviceId: config.deviceId, ...extra };
}
