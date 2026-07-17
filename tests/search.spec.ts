import { test, expect } from '@playwright/test';
import { apiPath, baseQuery } from './utils/api';
import { expectSuccessEnvelope } from './utils/assertions';

test.describe('Search', () => {
  test('GET /search returns matching shows', async ({ request }) => {
    const res = await request.get(apiPath('/search'), {
      params: baseQuery({ q: 'the other', page: '1', limit: '20' }),
    });
    const json = await expectSuccessEnvelope(res);
    expect(json.data).toHaveProperty('results');
    expect(Array.isArray(json.data.results)).toBe(true);
    if (json.data.results.length) {
      expect(json.data.results[0]).toHaveProperty('title');
      expect(json.data.results[0]).toHaveProperty('entity_type');
    }
  });

  test('GET /search/suggestions returns suggestion list', async ({ request }) => {
    const res = await request.get(apiPath('/search/suggestions'), {
      params: baseQuery({ q: 'other' }),
    });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(false);
  });
});
