import { test, expect } from '@playwright/test';
import { apiPath, baseQuery, config } from './utils/api';
import { expectSuccessEnvelope } from './utils/assertions';

const deviceInfo = {
  os: 'Linux',
  device_name: 'playwright-ci',
  device_type: 'Automation',
  app_version: 'playwright-test-runner',
};

test.describe('Auth', () => {
  // Serial mode: tests run in order. freshToken is set by refresh-token first,
  // then used by every subsequent test. device/logout and device/remove run last.
  test.describe.configure({ mode: 'serial' });

  let freshToken = config.authToken;

  const authHeaders = () => ({
    Authorization: freshToken,
    'x-country-code': config.countryCode,
  });

  // ── 1. FIRST: refresh token ──────────────────────────────────────────────
  // global-setup.ts saves REFRESH_TOKEN automatically after verify_otp,
  // so this test never skips in Jenkins.
  test('POST /auth/user/refresh-token returns new access token', async ({ request }) => {
    test.skip(!config.refreshToken, 'REFRESH_TOKEN not set — add testAccountEmail/testAccountOtp in config.json so global-setup can mint one');

    const res = await request.post(apiPath('/auth/user/refresh-token'), {
      params: baseQuery(),
      headers: { 'x-country-code': config.countryCode },
      data: { refresh_token: config.refreshToken },
    });
    const json = await expectSuccessEnvelope(res);
    expect(json).toHaveProperty('token');
    freshToken = json.token; // all subsequent tests use this fresh token
  });

  // ── 2. Login flow ────────────────────────────────────────────────────────
  test('POST /auth/user/login-register sends OTP', { tag: '@mutating' }, async ({ request }) => {
    const email = config.testAccountEmail;
    test.skip(!email, 'testAccountEmail not set in config.json');

    const res = await request.post(apiPath('/auth/user/login-register'), {
      params: { ...baseQuery(), resend: 'N' },
      data: { email_or_mobile: email, type: 'login', ...deviceInfo },
    });
    const json = await expectSuccessEnvelope(res);
    expect(json).toHaveProperty('status', true);
  });

  test('POST /auth/user/login-register returns error when email missing', async ({ request }) => {
    const res = await request.post(apiPath('/auth/user/login-register'), {
      params: { ...baseQuery(), resend: 'N' },
      data: { type: 'login', ...deviceInfo },
    });
    expect(res.ok()).toBe(false);
    const json = await res.json();
    expect(json.status).toBe(false);
  });

  test('POST /auth/user/verify_otp returns error for wrong OTP', async ({ request }) => {
    const email = config.testAccountEmail;
    test.skip(!email, 'testAccountEmail not set in config.json');

    const res = await request.post(apiPath('/auth/user/verify_otp'), {
      params: baseQuery(),
      data: { otp: '000000', email_or_mobile: email, device_id: config.deviceId, ...deviceInfo },
    });
    expect(res.ok()).toBe(false);
    const json = await res.json();
    expect(json.status).toBe(false);
    expect(json).toHaveProperty('message');
  });

  test('POST /auth/user/is-email-or-mobile-exist returns true for registered email', async ({ request }) => {
    const email = config.testAccountEmail;
    test.skip(!email, 'testAccountEmail not set in config.json');

    const res = await request.post(apiPath('/auth/user/is-email-or-mobile-exist'), {
      params: { ...baseQuery(), resend: 'N' },
      headers: { 'x-country-code': config.countryCode },
      data: { email_or_mobile: email },
    });
    const json = await expectSuccessEnvelope(res);
    expect(json).toHaveProperty('status', true);
  });

  test('POST /auth/user/upsert-user updates user profile', { tag: '@mutating' }, async ({ request }) => {
    const email = config.testAccountEmail;
    test.skip(!email, 'testAccountEmail not set in config.json');

    const res = await request.post(apiPath('/auth/user/upsert-user'), {
      params: baseQuery(),
      headers: authHeaders(),
      data: {
        email,
        first_name: 'Playwright',
        last_name: 'Bot',
        dob: '2000-01-01',
        gender: 'male',
        is_subscribe_newsletter: false,
        user_country_code: '+971',
      },
    });
    const json = await expectSuccessEnvelope(res);
    expect(json).toHaveProperty('status', true);
  });

  // ── 3. QR flow ───────────────────────────────────────────────────────────
  // generate → scan → status → cancel all share qrSessionId.
  let qrSessionId = '';

  test('POST /auth/qr/generate creates a QR session', async ({ request }) => {
    const res = await request.post(apiPath('/auth/qr/generate'), {
      params: baseQuery(),
      headers: { 'x-country-code': config.countryCode },
      data: { device_info: 'playwright-test-runner', device_id: config.deviceId },
    });
    const json = await expectSuccessEnvelope(res);
    expect(json.data).toHaveProperty('sessionId');
    qrSessionId = json.data.sessionId;
  });

  test('POST /auth/qr/scan scans the QR session', { tag: '@mutating' }, async ({ request }) => {
    const res = await request.post(apiPath('/auth/qr/scan'), {
      params: baseQuery(),
      headers: authHeaders(),
      data: {
        sessionId: qrSessionId,
        device_name: 'playwright-ci',
        os: 'Linux',
        app_version: 'playwright-test-runner',
        device_type: 'Automation',
        auto_confirm: false,
      },
    });
    const json = await expectSuccessEnvelope(res);
    expect(json).toHaveProperty('status', true);
  });

  test('GET /auth/qr/status returns session status', async ({ request }) => {
    const res = await request.get(apiPath('/auth/qr/status'), {
      params: baseQuery({ sessionId: qrSessionId }),
      headers: { 'x-country-code': config.countryCode },
    });
    const json = await expectSuccessEnvelope(res);
    expect(json.data).toHaveProperty('qrStatus');
    expect(json.data).toHaveProperty('sessionId');
  });

  test('POST /auth/qr/cancel cancels the QR session', async ({ request }) => {
    const res = await request.post(apiPath('/auth/qr/cancel'), {
      params: baseQuery(),
      headers: { 'x-country-code': config.countryCode },
      data: { sessionId: qrSessionId },
    });
    const json = await expectSuccessEnvelope(res);
    expect(json).toHaveProperty('status', true);
  });

  // ── 4. Device management ─────────────────────────────────────────────────
  test('GET /auth/device/list returns device list', async ({ request }) => {
    const res = await request.get(apiPath('/auth/device/list'), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(json.data).toHaveProperty('activeDevices');
    expect(Array.isArray(json.data.activeDevices)).toBe(true);
  });

  test('GET /auth/device/current returns current device', async ({ request }) => {
    const res = await request.get(apiPath('/auth/device/current'), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(json.data).toBeTruthy();
  });

  test('GET /auth/device/activity records device as active', async ({ request }) => {
    const res = await request.get(apiPath('/auth/device/activity'), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(json).toHaveProperty('code', 'DEVICE_ACTIVITY_UPDATED');
  });

  test('POST /auth/device/activity records device activity', { tag: '@mutating' }, async ({ request }) => {
    const res = await request.post(apiPath('/auth/device/activity'), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(json).toHaveProperty('status', true);
  });

  test('POST /auth/device/check-online checks device online status', async ({ request }) => {
    const res = await request.post(apiPath('/auth/device/check-online'), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(json).toHaveProperty('status', true);
  });

  test('POST /auth/device/get-active-device-by-user returns active devices', async ({ request }) => {
    const res = await request.post(apiPath('/auth/device/get-active-device-by-user'), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.devices)).toBe(true);
  });

  test('GET /auth/device/max-limit returns max device limit', async ({ request }) => {
    const res = await request.get(apiPath('/auth/device/max-limit'), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(json.data).toHaveProperty('maxDevices');
  });

  test('POST /auth/device/activate activates current device', { tag: '@mutating' }, async ({ request }) => {
    const res = await request.post(apiPath('/auth/device/activate'), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(json).toHaveProperty('status', true);
  });

  // ── 5. Other auth endpoints ──────────────────────────────────────────────
  test('POST /auth/me documents expected token-type rejection', async ({ request }) => {
    const res = await request.post(apiPath('/auth/me'), {
      params: baseQuery(),
      headers: { 'x-country-code': config.countryCode },
      data: { token: freshToken },
    });
    const json = await res.json();
    expect(json).toHaveProperty('status', false);
    expect(json).toHaveProperty('code', 'INVALID_OR_EXPIRED_TOKEN');
  });

  test('POST /auth/link-empty-auth-token documents already-linked rejection', { tag: '@mutating' }, async ({ request }) => {
    const email = config.testAccountEmail;
    test.skip(!email, 'testAccountEmail not set in config.json');

    const res = await request.post(apiPath('/auth/link-empty-auth-token'), {
      params: baseQuery(),
      headers: { Authorization: freshToken },
      data: { email },
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('status', false);
    expect(json).toHaveProperty('code', 'USER_ALREADY_HAS_EMAIL');
  });

});
