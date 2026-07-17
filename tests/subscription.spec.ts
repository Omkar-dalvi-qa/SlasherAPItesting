import { test, expect } from '@playwright/test';
import { apiPath, baseQuery, config } from './utils/api';
import { expectSuccessEnvelope } from './utils/assertions';

test.describe('Subscription', () => {
  test('GET /subscription/plans returns available plans', async ({ request }) => {
    const res = await request.get(apiPath('/subscription/plans'), {
      params: baseQuery(),
      headers: { 'x-country-code': config.countryCode },
    });
    const json = await expectSuccessEnvelope(res);
    // data is an object {features, planTypes, plans, is_payment_gateway_enabled}, not a flat array.
    expect(Array.isArray(json.data.plans)).toBe(true);
    expect(json.data.plans.length).toBeGreaterThan(0);
    expect(Array.isArray(json.data.features)).toBe(true);
    expect(json.data).toHaveProperty('is_payment_gateway_enabled');
  });
});
