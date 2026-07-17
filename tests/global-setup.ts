import * as dotenv from 'dotenv';

dotenv.config();


export default async function globalSetup(): Promise<void> {
  const serverUrl = process.env.SERVER_URL;
  const email = process.env.TEST_ACCOUNT_EMAIL;
  const otp = process.env.TEST_ACCOUNT_OTP;

  if (!serverUrl || !email || !otp) {
    console.warn(
      '[global-setup] SERVER_URL / TEST_ACCOUNT_EMAIL / TEST_ACCOUNT_OTP not fully set; ' +
        'auth-protected tests will fail until they are.'
    );
    return;
  }

  const version = process.env.API_VERSION ?? 'v1';
  const langId = process.env.LANG_ID ?? '1';
  const deviceId = process.env.DEVICE_ID ?? 'playwright-test-device';

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const deviceInfo = {
    os: 'Linux',
    device_name: 'playwright-ci',
    device_type: 'Automation',
    app_version: 'playwright-test-runner',
  };

  const loginRegisterUrl = new URL(`${serverUrl}/api/${version}/auth/user/login-register`);
  loginRegisterUrl.searchParams.set('resend', 'N');
  loginRegisterUrl.searchParams.set('lang_id', langId);
  loginRegisterUrl.searchParams.set('deviceId', deviceId);

  const loginRes = await fetch(loginRegisterUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email_or_mobile: email, type: 'login', ...deviceInfo }),
  });

  if (!loginRes.ok) {
    console.warn(`[global-setup] POST /auth/user/login-register failed with ${loginRes.status}; auth-protected tests will fail.`);
    return;
  }

  const verifyUrl = new URL(`${serverUrl}/api/${version}/auth/user/verify_otp`);
  verifyUrl.searchParams.set('lang_id', langId);
  verifyUrl.searchParams.set('deviceId', deviceId);

  const verifyRes = await fetch(verifyUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ otp, email_or_mobile: email, device_id: deviceId, ...deviceInfo }),
  });

  if (!verifyRes.ok) {
    console.warn(`[global-setup] POST /auth/user/verify_otp failed with ${verifyRes.status}; auth-protected tests will fail.`);
    return;
  }

  const json = (await verifyRes.json()) as { token?: string; refresh_token?: string };
  if (!json.token) {
    console.warn('[global-setup] verify_otp response missing token field.');
    return;
  }

  process.env.AUTH_TOKEN = json.token;
  if (json.refresh_token) {
    process.env.REFRESH_TOKEN = json.refresh_token;
  }
}
