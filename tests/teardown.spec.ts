import { test, expect } from '@playwright/test';
import { apiPath, baseQuery, config } from './utils/api';
import { expectSuccessEnvelope } from './utils/assertions';

// Teardown tests run after ALL main tests complete (see playwright.config.ts projects).
// This means they can safely mutate or invalidate the current session without
// affecting any other test.

const authHeaders = () => ({
  Authorization: config.authToken,
  'x-country-code': config.countryCode,
});

// Uncomment when the test account has inactive devices to clean up.
// test('POST /auth/device/remove removes an inactive device', { tag: '@mutating' }, async ({ request }) => {
//   const listRes = await request.get(apiPath('/auth/device/list'), {
//     params: baseQuery(),
//     headers: authHeaders(),
//   });
//   const listJson = await listRes.json();
//   const inactiveDevice = listJson.data?.inactiveDevices?.[0];
//   test.skip(!inactiveDevice, 'No inactive devices — skipping');
//
//   const res = await request.post(apiPath('/auth/device/remove'), {
//     params: baseQuery(),
//     headers: authHeaders(),
//     data: { device_id: inactiveDevice.device_id },
//   });
//   const json = await expectSuccessEnvelope(res);
//   expect(json).toHaveProperty('status', true);
// });

// Log out the current session last — intentionally invalidates the JWT.
// Safe here because all main tests have already finished.
test('POST /auth/device/logout logs out the current session', { tag: '@mutating' }, async ({ request }) => {
  const currentRes = await request.get(apiPath('/auth/device/current'), {
    params: baseQuery(),
    headers: authHeaders(),
  });
  const currentJson = await currentRes.json();
  const deviceId = currentJson.data?.device_id;
  test.skip(!deviceId, 'Could not resolve current device_id');

  const res = await request.post(apiPath('/auth/device/logout'), {
    params: baseQuery(),
    headers: authHeaders(),
    data: { device_id: deviceId },
  });
  const json = await expectSuccessEnvelope(res);
  expect(json).toHaveProperty('status', true);
});
