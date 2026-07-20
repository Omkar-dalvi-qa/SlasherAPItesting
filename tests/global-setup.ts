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
  const email       = cfg.testAccountEmail as string | undefined;
  const otp         = cfg.testAccountOtp   as string | undefined;

  const saveTokens = (token: string, refresh: string) => {
    const authFile = path.resolve(process.cwd(), 'test-results/.auth.json');
    fs.mkdirSync(path.dirname(authFile), { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify({ authToken: token, refreshToken: refresh }));
    process.env.AUTH_TOKEN = token;
    console.log(`[global-setup] token saved (${Math.floor(jwtSecsLeft(token) / 60)}m left)`);
  };

  // ── Step 1: existing token still valid? ─────────────────────────────────
  // Cheap local expiry check first, then verify the DB session is alive via
  // /user/details (this endpoint is NOT geo-blocked — Jenkins can reach it).
  const existingToken   = (cfg.authToken    ?? '') as string;
  const existingRefresh = (cfg.refreshToken ?? '') as string;

  if (existingToken && jwtSecsLeft(existingToken) > 60) {
    const checkUrl = new URL(`${serverUrl}/api/${version}/user/details`);
    checkUrl.searchParams.set('lang_id', langId);
    checkUrl.searchParams.set('deviceId', deviceId);
    const checkRes = await fetch(checkUrl.toString(), {
      headers: { Authorization: existingToken, 'x-country-code': countryCode },
    });
    console.log(`[global-setup] existing token check → ${checkRes.status}`);
    if (checkRes.ok) {
      saveTokens(existingToken, existingRefresh);
      return;
    }
    // 401 = session was revoked (teardown logged out). Fall through to get a new one.
  } else {
    console.log(`[global-setup] existing token absent or expired — getting fresh token`);
  }

  // ── Step 2: fresh OTP login ──────────────────────────────────────────────
  // Works from any non-geo-blocked machine (local, non-Finnish CI).
  // Silently skipped if geo-blocked (403) so Step 3 can handle Jenkins.
  if (email && otp) {
    const loginUrl = new URL(`${serverUrl}/api/${version}/auth/user/login-register`);
    loginUrl.searchParams.set('resend', 'N');
    loginUrl.searchParams.set('lang_id', langId);
    loginUrl.searchParams.set('deviceId', deviceId);

    const deviceInfo = { os: 'Linux', device_name: 'playwright-ci', device_type: 'Automation', app_version: 'playwright-test-runner' };

    const loginRes = await fetch(loginUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_or_mobile: email, type: 'login', ...deviceInfo }),
    });
    console.log(`[global-setup] login-register → ${loginRes.status}`);

    if (loginRes.ok) {
      const verifyUrl = new URL(`${serverUrl}/api/${version}/auth/user/verify_otp`);
      verifyUrl.searchParams.set('lang_id', langId);
      verifyUrl.searchParams.set('deviceId', deviceId);

      const verifyRes = await fetch(verifyUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp, email_or_mobile: email, device_id: deviceId, ...deviceInfo }),
      });
      console.log(`[global-setup] verify_otp → ${verifyRes.status}`);

      if (verifyRes.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const json = await verifyRes.json() as any;
        const token: string | undefined   = json.token   ?? json.data?.token   ?? json.access_token;
        const refresh: string | undefined = json.refresh_token ?? json.data?.refresh_token;
        if (token) {
          saveTokens(token, refresh ?? '');
          console.log(`[global-setup] OTP login succeeded`);
          return;
        }
      }
    } else if (loginRes.status !== 403) {
      console.warn(`[global-setup] login-register failed ${loginRes.status} (not geo-block)`);
    } else {
      console.log(`[global-setup] login-register geo-blocked (403) — trying refresh token`);
    }
  }

  // ── Step 3: refresh token ────────────────────────────────────────────────
  // /auth/user/refresh-token is NOT geo-blocked so Jenkins can reach it.
  // Works as long as teardown has not run (teardown invalidates refresh tokens too).
  // In Jenkins: always run with --project=main to skip teardown.
  if (existingRefresh) {
    const refreshUrl = new URL(`${serverUrl}/api/${version}/auth/user/refresh-token`);
    refreshUrl.searchParams.set('lang_id', langId);
    refreshUrl.searchParams.set('deviceId', deviceId);

    const refreshRes = await fetch(refreshUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-country-code': countryCode },
      body: JSON.stringify({ refresh_token: existingRefresh }),
    });
    console.log(`[global-setup] refresh-token → ${refreshRes.status}`);

    if (refreshRes.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = await refreshRes.json() as any;
      const token: string | undefined   = json.token   ?? json.data?.token   ?? json.access_token;
      const refresh: string | undefined = json.refresh_token ?? json.data?.refresh_token ?? existingRefresh;
      if (token) {
        saveTokens(token, refresh ?? existingRefresh);
        console.log(`[global-setup] refresh token succeeded`);
        return;
      }
    }
    const body = await refreshRes.text().catch(() => '');
    console.warn(`[global-setup] refresh-token failed ${refreshRes.status}: ${body}`);
  }

  throw new Error(
    '[global-setup] All auth methods failed.\n' +
    '  Local: teardown may have killed the session — run locally once to get fresh tokens.\n' +
    '  Jenkins: ensure --project=main is set (skip teardown) so the session stays alive.'
  );
}
