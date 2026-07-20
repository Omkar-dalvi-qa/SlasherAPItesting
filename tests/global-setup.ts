import * as fs from 'fs';
import * as path from 'path';

const cfg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../config.json'), 'utf-8')
);

function jwtSecsLeft(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf-8'));
    return typeof payload.exp === 'number' ? payload.exp - Math.floor(Date.now() / 1000) : 0;
  } catch {
    return 0;
  }
}

export default async function globalSetup(): Promise<void> {
  const serverUrl   = cfg.serverUrl   as string;
  const version     = cfg.apiVersion  ?? 'v2';
  const langId      = cfg.langId      ?? '1';
  const deviceId    = cfg.deviceId    ?? 'playwright-test-device';
  const countryCode = cfg.countryCode ?? 'AE';

  const saveTokens = (token: string, refresh: string) => {
    const authFile = path.resolve(process.cwd(), 'test-results/.auth.json');
    fs.mkdirSync(path.dirname(authFile), { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify({ authToken: token, refreshToken: refresh }));
    process.env.AUTH_TOKEN = token;
    console.log(`[global-setup] token saved (${Math.floor(jwtSecsLeft(token) / 60)}m left)`);
  };

  const accessToken  = (cfg.authToken    ?? '') as string;
  const refreshToken = (cfg.refreshToken ?? '') as string;

  // ── Step 1: access token still valid? use it directly (no API call needed) ──
  const secsLeft = jwtSecsLeft(accessToken);
  console.log(`[global-setup] access token secsLeft=${secsLeft}`);
  if (secsLeft > 60) {
    saveTokens(accessToken, refreshToken);
    return;
  }

  // ── Step 2: access token expired → use refresh token to get a new one ────
  // /auth/user/refresh-token is NOT geo-blocked by Cloudflare (Jenkins reaches
  // it and gets 401/200, never 403), so this works from any country.
  console.log(`[global-setup] access token expired — calling refresh-token endpoint`);
  if (!refreshToken) {
    throw new Error('[global-setup] access token expired and no refreshToken in config.json. Update config.json with fresh tokens.');
  }

  const refreshUrl = new URL(`${serverUrl}/api/${version}/auth/user/refresh-token`);
  refreshUrl.searchParams.set('lang_id', langId);
  refreshUrl.searchParams.set('deviceId', deviceId);

  const res = await fetch(refreshUrl.toString(), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-country-code': countryCode },
    body:    JSON.stringify({ refresh_token: refreshToken }),
  });
  console.log(`[global-setup] refresh-token → ${res.status}`);

  if (res.ok) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await res.json() as any;
    const newToken: string | undefined   = json.token   ?? json.data?.token   ?? json.access_token;
    const newRefresh: string | undefined = json.refresh_token ?? json.data?.refresh_token ?? refreshToken;
    if (newToken) {
      saveTokens(newToken, newRefresh ?? refreshToken);
      console.log(`[global-setup] refresh succeeded`);
      return;
    }
  }

  const body = await res.text().catch(() => '');
  throw new Error(
    `[global-setup] refresh-token failed ${res.status}: ${body}\n` +
    'Both tokens are expired/invalid. Run locally to get fresh tokens and update config.json.'
  );
}
