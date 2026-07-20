import * as fs from 'fs';
import * as path from 'path';

const cfg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../config.json'), 'utf-8')
);

// Decode a JWT and return its expiry timestamp (seconds). Returns 0 on error.
function jwtExp(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf-8'));
    return typeof payload.exp === 'number' ? payload.exp : 0;
  } catch {
    return 0;
  }
}

export default async function globalSetup(): Promise<void> {
  const serverUrl = cfg.serverUrl;
  const email     = cfg.testAccountEmail;
  const otp       = cfg.testAccountOtp;

  const version  = cfg.apiVersion ?? 'v1';
  const langId   = cfg.langId     ?? '1';
  const deviceId = cfg.deviceId   ?? 'playwright-test-device';

  console.log(`[global-setup] cwd=${process.cwd()}`);
  console.log(`[global-setup] serverUrl=${serverUrl} email=${email} otp=${otp ? '***' : '(empty)'}`);

  // Helper: persist tokens so worker processes can read them via test-results/.auth.json.
  const saveTokens = (token: string, refreshToken: string) => {
    const authFile = path.resolve(process.cwd(), 'test-results/.auth.json');
    fs.mkdirSync(path.dirname(authFile), { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify({ authToken: token, refreshToken }));
    process.env.AUTH_TOKEN = token;
    if (refreshToken) process.env.REFRESH_TOKEN = refreshToken;
    console.log(`[global-setup] auth file written → ${authFile}`);
  };

  // ── Step 1: check static authToken from config.json ─────────────────────
  // Decode the JWT locally — no API call, no geo-blocking.
  // Cloudflare blocks ALL requests from the CI server's country, so calling
  // /user/details to verify the token would always return 403 in Jenkins even
  // when the token itself is perfectly valid.
  if (cfg.authToken) {
    const exp = jwtExp(cfg.authToken);
    const nowSec = Math.floor(Date.now() / 1000);
    const secsLeft = exp - nowSec;
    console.log(`[global-setup] static token exp=${exp} secsLeft=${secsLeft}`);
    if (secsLeft > 60) {
      saveTokens(cfg.authToken, cfg.refreshToken ?? '');
      console.log(`[global-setup] static token valid (${Math.floor(secsLeft / 60)}m left) — done`);
      return;
    }
    console.log(`[global-setup] static token expired or expiring soon — trying refresh token next`);
  }

  // ── Step 2: use refresh token to mint a new access token ────────────────
  // This works even when the CI server is geo-blocked from the OTP endpoint,
  // because /auth/user/refresh-token does not go through country restrictions.
  // Try config.json first (set manually in Jenkins), then fall back to the
  // auth file written by the previous run (useful on local between sessions).
  let candidateRefreshToken = cfg.refreshToken ?? '';
  console.log(`[global-setup] cfg.refreshToken length=${candidateRefreshToken.length}`);
  if (!candidateRefreshToken) {
    try {
      const authFile = path.resolve(process.cwd(), 'test-results/.auth.json');
      console.log(`[global-setup] checking auth file for refresh token: ${authFile} exists=${fs.existsSync(authFile)}`);
      if (fs.existsSync(authFile)) {
        const saved = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
        console.log(`[global-setup] auth file refreshToken length=${(saved.refreshToken ?? '').length}`);
        candidateRefreshToken = saved.refreshToken ?? '';
        if (candidateRefreshToken) {
          console.log(`[global-setup] no refreshToken in config.json — using saved refresh token from auth file`);
        }
      }
    } catch (e) { console.error(`[global-setup] error reading auth file for refresh token: ${e}`); }
  }

  if (candidateRefreshToken) {
    const refreshUrl = new URL(`${serverUrl}/api/${version}/auth/user/refresh-token`);
    refreshUrl.searchParams.set('lang_id', langId);
    refreshUrl.searchParams.set('deviceId', deviceId);
    console.log(`[global-setup] trying refresh token → ${refreshUrl}`);
    const refreshRes = await fetch(refreshUrl.toString(), {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-country-code': cfg.countryCode ?? 'AE' },
      body:    JSON.stringify({ refresh_token: candidateRefreshToken }),
    });
    console.log(`[global-setup] refresh-token → ${refreshRes.status}`);
    if (refreshRes.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const refreshJson = await refreshRes.json() as any;
      const newToken: string | undefined =
        refreshJson.token ?? refreshJson.data?.token ?? refreshJson.access_token;
      const newRefresh: string | undefined =
        refreshJson.refresh_token ?? refreshJson.data?.refresh_token ?? candidateRefreshToken;
      if (newToken) {
        saveTokens(newToken, newRefresh ?? '');
        console.log(`[global-setup] refresh succeeded — new token (length=${newToken.length})`);
        return;
      }
      console.log(`[global-setup] refresh response missing token, keys: ${Object.keys(refreshJson).join(', ')}`);
    } else {
      const body = await refreshRes.text().catch(() => '(unreadable)');
      console.log(`[global-setup] refresh-token failed ${refreshRes.status}: ${body}`);
    }
  }

  // ── Step 3: OTP login ────────────────────────────────────────────────────
  // Not available from geo-blocked CI environments.  Falls back here only
  // when neither the static token nor the refresh token can be used.
  if (!serverUrl || !email || !otp) {
    throw new Error(
      '[global-setup] static token invalid, refresh token unavailable/failed, ' +
      'and OTP credentials (testAccountEmail / testAccountOtp) not set in config.json. ' +
      'Add refreshToken to config.json so Jenkins can re-authenticate without geo-blocked OTP.'
    );
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const deviceInfo = {
    os:           'Linux',
    device_name:  'playwright-ci',
    device_type:  'Automation',
    app_version:  'playwright-test-runner',
  };

  const loginRegisterUrl = new URL(`${serverUrl}/api/${version}/auth/user/login-register`);
  loginRegisterUrl.searchParams.set('resend', 'N');
  loginRegisterUrl.searchParams.set('lang_id', langId);
  loginRegisterUrl.searchParams.set('deviceId', deviceId);

  console.log(`[global-setup] POST ${loginRegisterUrl}`);
  const loginRes = await fetch(loginRegisterUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email_or_mobile: email, type: 'login', ...deviceInfo }),
  });
  console.log(`[global-setup] login-register → ${loginRes.status}`);

  if (!loginRes.ok) {
    const body = await loginRes.text().catch(() => '(unreadable)');
    throw new Error(`[global-setup] POST /auth/user/login-register failed ${loginRes.status}: ${body}`);
  }

  const verifyUrl = new URL(`${serverUrl}/api/${version}/auth/user/verify_otp`);
  verifyUrl.searchParams.set('lang_id', langId);
  verifyUrl.searchParams.set('deviceId', deviceId);

  console.log(`[global-setup] POST ${verifyUrl}`);
  const verifyRes = await fetch(verifyUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ otp, email_or_mobile: email, device_id: deviceId, ...deviceInfo }),
  });
  console.log(`[global-setup] verify_otp → ${verifyRes.status}`);

  if (!verifyRes.ok) {
    const body = await verifyRes.text().catch(() => '(unreadable)');
    throw new Error(`[global-setup] POST /auth/user/verify_otp failed ${verifyRes.status}: ${body}`);
  }

  const rawBody = await verifyRes.text();
  console.log(`[global-setup] verify_otp raw response: ${rawBody.slice(0, 500)}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = JSON.parse(rawBody) as any;

  const token: string | undefined =
    json.token ?? json.data?.token ?? json.result?.token ?? json.access_token;
  const refreshToken: string | undefined =
    json.refresh_token ?? json.data?.refresh_token ?? json.result?.refresh_token;

  if (!token) {
    throw new Error(
      `[global-setup] verify_otp response has no token. Keys found: ${Object.keys(json).join(', ')}`
    );
  }

  console.log(`[global-setup] OTP token obtained (length=${token.length})`);
  saveTokens(token, refreshToken ?? '');
}
