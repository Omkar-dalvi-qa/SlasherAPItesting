export const config = {
  version: process.env.API_VERSION ?? 'v1',
  langId: process.env.LANG_ID ?? '1',
  deviceId: process.env.DEVICE_ID ?? 'playwright-test-device',
  authToken: process.env.AUTH_TOKEN ?? '',
  refreshToken: process.env.REFRESH_TOKEN ?? '',
  countryCode: process.env.X_COUNTRY_CODE ?? 'AE',
};

export function apiPath(segment: string): string {
  return `/api/${config.version}${segment}`;
}

export function baseQuery(extra: Record<string, string> = {}): Record<string, string> {
  return { lang_id: config.langId, deviceId: config.deviceId, ...extra };
}
