import * as fs from 'fs';
import * as path from 'path';

const cfg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../config.json'), 'utf-8')
);

export default async function globalSetup(): Promise<void> {
  const serverUrl = cfg.serverUrl;
  const email     = cfg.testAccountEmail;
  const otp       = cfg.testAccountOtp;

  console.log(`[global-setup] cwd=${process.cwd()}`);
  console.log(`[global-setup] serverUrl=${serverUrl} email=${email} otp=${otp ? '***' : '(empty)'}`);

  if (!serverUrl || !email || !otp) {
    throw new Error(
      '[global-setup] serverUrl / testAccountEmail / testAccountOtp not set in config.json'
    );
  }

  const version  = cfg.apiVersion ?? 'v1';
  const langId   = cfg.langId     ?? '1';
  const deviceId = cfg.deviceId   ?? 'playwright-test-device';

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

  // Log the raw response to see the exact JSON structure
  const rawBody = await verifyRes.text();
  console.log(`[global-setup] verify_otp raw response: ${rawBody.slice(0, 500)}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = JSON.parse(rawBody) as any;

  // Token can live at different depths depending on the API version
  const token: string | undefined =
    json.token ?? json.data?.token ?? json.result?.token ?? json.access_token;
  const refreshToken: string | undefined =
    json.refresh_token ?? json.data?.refresh_token ?? json.result?.refresh_token;

  if (!token) {
    throw new Error(
      `[global-setup] verify_otp response has no token. Keys found: ${Object.keys(json).join(', ')}`
    );
  }

  console.log(`[global-setup] token obtained (length=${token.length})`);

  // Write tokens to a file so Playwright worker processes can read them.
  // process.env set here is NOT visible to workers (separate process).
  const authFile = path.resolve(process.cwd(), 'test-results/.auth.json');
  console.log(`[global-setup] writing auth file → ${authFile}`);
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  fs.writeFileSync(authFile, JSON.stringify({
    authToken:    token,
    refreshToken: refreshToken ?? '',
  }));
  console.log(`[global-setup] auth file written OK`);

  // Also set for the global-setup process itself (teardown, etc.)
  process.env.AUTH_TOKEN = token;
  if (refreshToken) {
    process.env.REFRESH_TOKEN = refreshToken;
  }
}
