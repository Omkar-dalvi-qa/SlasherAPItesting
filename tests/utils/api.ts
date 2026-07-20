import * as fs from 'fs';
import * as path from 'path';

const cfg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../config.json'), 'utf-8')
);

// global-setup writes tokens here; process.env changes in global-setup
// are not visible to worker processes, so we read from the file instead.
let _fileToken = '';
let _fileRefresh = '';
try {
  const authFile = path.resolve(process.cwd(), 'test-results/.auth.json');
  console.log(`[api.ts] cwd=${process.cwd()} authFile=${authFile} exists=${fs.existsSync(authFile)}`);
  if (fs.existsSync(authFile)) {
    const auth = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
    _fileToken   = auth.authToken    ?? '';
    _fileRefresh = auth.refreshToken ?? '';
    console.log(`[api.ts] loaded token from file (length=${_fileToken.length})`);
  } else {
    console.warn(`[api.ts] auth file NOT found — AUTH_TOKEN will be empty`);
  }
} catch (e) {
  console.error(`[api.ts] error reading auth file: ${e}`);
}

export const config = {
  version:          cfg.apiVersion       ?? 'v1',
  langId:           cfg.langId           ?? '1',
  deviceId:         cfg.deviceId         ?? 'playwright-test-device',
  countryCode:      cfg.countryCode      ?? 'AE',
  testAccountEmail: cfg.testAccountEmail ?? '',
  authToken:        process.env.AUTH_TOKEN    ?? _fileToken   ?? cfg.authToken ?? '',
  refreshToken:     process.env.REFRESH_TOKEN ?? _fileRefresh ?? '',
};

export function apiPath(segment: string): string {
  return `/api/${config.version}${segment}`;
}

export function baseQuery(extra: Record<string, string> = {}): Record<string, string> {
  return { lang_id: config.langId, deviceId: config.deviceId, ...extra };
}
