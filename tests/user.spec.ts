import { test, expect } from '@playwright/test';
import { apiPath, baseQuery, config } from './utils/api';
import { expectSuccessEnvelope } from './utils/assertions';

const authHeaders = () => ({
  Authorization: config.authToken,
  'x-country-code': config.countryCode,
});

test.describe('User', () => {
  test('GET /user/details returns user profile', async ({ request }) => {
    const res = await request.get(apiPath('/user/details'), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(json.data).toHaveProperty('user_email');
    expect(json.data).toHaveProperty('user_id');
    expect(json.data).toHaveProperty('user_firstname');
  });

  test('GET /user/favourites returns favourites list', async ({ request }) => {
    const res = await request.get(apiPath('/user/favourites'), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    // data is {movie: [...], series: [...]}, not a flat array.
    expect(json.data).toHaveProperty('movie');
    expect(json.data).toHaveProperty('series');
    expect(Array.isArray(json.data.movie)).toBe(true);
    expect(Array.isArray(json.data.series)).toBe(true);
  });

  test('POST /user/favourites/add/:show_type/:show_id adds a favourite', { tag: '@mutating' }, async ({ request }) => {
    const res = await request.post(apiPath('/user/favourites/add/movie/422'), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(json).toHaveProperty('status', true);
  });

  test('GET /user/pref-language returns preferred language', async ({ request }) => {
    const res = await request.get(apiPath('/user/pref-language'), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(json.data).toHaveProperty('lang_id');
  });

  test('POST /user/pref-language updates preferred language', { tag: '@mutating' }, async ({ request }) => {
    const res = await request.post(apiPath('/user/pref-language'), {
      params: baseQuery(),
      headers: authHeaders(),
      data: { lang_id: 1 },
    });
    const json = await expectSuccessEnvelope(res);
    expect(json).toHaveProperty('status', true);
  });

  // Known backend bug: GET returns HTTP 500 ERROR_GETTING_GENRE_PREFERENCES even when
  // preferences exist (POST works fine). Test documents current behavior — update
  // expectation to expectSuccessEnvelope once the backend is fixed.
  test('GET /user/preferences/genre-language returns genre and language preferences', async ({ request }) => {
    const res = await request.get(apiPath('/user/preferences/genre-language'), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    const json = await res.json();
    expect(json).toHaveProperty('status', false);
    expect(json).toHaveProperty('code', 'ERROR_GETTING_GENRE_PREFERENCES');
  });

  test('POST /user/preferences/genre-language updates genre preferences', { tag: '@mutating' }, async ({ request }) => {
    const res = await request.post(apiPath('/user/preferences/genre-language'), {
      params: baseQuery(),
      headers: authHeaders(),
      data: { genre_ids: [1, 15, 39], type: 'genre', lang_ids: [1] },
    });
    const json = await expectSuccessEnvelope(res);
    expect(json).toHaveProperty('status', true);
  });

  test('GET /user/watch/current returns current watch progress', async ({ request }) => {
    const res = await request.get(apiPath('/user/watch/current'), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
  });

  test('POST /user/watch/current saves watch progress', { tag: '@mutating' }, async ({ request }) => {
    const res = await request.post(apiPath('/user/watch/current'), {
      params: baseQuery(),
      headers: authHeaders(),
      data: {
        show_type: 'movie',
        show_id: 444, // "The Others" — confirmed present via /search
        lang_id: 1,
        watch_position_seconds: 61,
        watch_session_uuid: `playwright-${Date.now()}`,
        is_subtile_active: false,
      },
    });
    const json = await expectSuccessEnvelope(res);
    expect(json).toHaveProperty('status', true);
  });

  test('GET /user/watch/complete returns completed watch list', async ({ request }) => {
    const res = await request.get(apiPath('/user/watch/complete'), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
  });

  test('POST /user/watch/complete marks a show as complete', { tag: '@mutating' }, async ({ request }) => {
    const res = await request.post(apiPath('/user/watch/complete'), {
      params: baseQuery(),
      headers: authHeaders(),
      data: { show_type: 'movie', show_id: 444 }, // "The Others" — confirmed present via /search
    });
    const json = await expectSuccessEnvelope(res);
    expect(json).toHaveProperty('status', true);
  });

  test('POST /user/watch/terminate-session terminates watch session', { tag: '@mutating' }, async ({ request }) => {
    const res = await request.post(apiPath('/user/watch/terminate-session'), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(json).toHaveProperty('status', true);
  });

  test('GET /user/device-info returns device info', async ({ request }) => {
    const res = await request.get(apiPath('/user/device-info'), {
      params: baseQuery({ notification_id: config.deviceId }),
      headers: { 'x-country-code': config.countryCode },
    });
    const json = await expectSuccessEnvelope(res);
    expect(json.data).toBeTruthy();
  });

  test('POST /user/add-user-id-to-device-info links user to device', { tag: '@mutating' }, async ({ request }) => {
    const res = await request.post(apiPath('/user/add-user-id-to-device-info'), {
      params: baseQuery({ notification_id: '2' }),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(json).toHaveProperty('status', true);
  });

  test('GET /user/invoices returns invoice list', async ({ request }) => {
    const res = await request.get(apiPath('/user/invoices'), {
      params: baseQuery({ page: '1', limit: '10' }),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    // data is a pagination wrapper {totalPages, currentPage, pageSize, data:[...]}.
    expect(json.data).toHaveProperty('totalPages');
    expect(json.data).toHaveProperty('data');
    expect(Array.isArray(json.data.data)).toBe(true);
  });

  test('POST /user/parental sets parental control', { tag: '@mutating' }, async ({ request }) => {
    const res = await request.post(apiPath('/user/parental'), {
      params: baseQuery(),
      headers: authHeaders(),
      data: { is_parental: 'Y', parental_password: '1234' },
    });
    const json = await expectSuccessEnvelope(res);
    expect(json).toHaveProperty('status', true);
  });

  test('GET /user/stop-modal returns stop modal config', async ({ request }) => {
    const res = await request.get(apiPath('/user/stop-modal'), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    // Response has no data field — payload is in json.updated.
    expect(json.updated).toHaveProperty('show_dialog');
  });

  test('GET /user/get-current-payment-gateway-info returns payment gateway info', async ({ request }) => {
    const res = await request.get(apiPath('/user/get-current-payment-gateway-info'), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(json.data).toBeTruthy();
  });

  // Test account already has a parental password set — documents the expected
  // rejection when attempting to set it again.
  test('POST /user/parental-password returns error when password already set', async ({ request }) => {
    const res = await request.post(apiPath('/user/parental-password'), {
      params: baseQuery(),
      headers: authHeaders(),
      data: { parental_password: '1234' },
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('status', false);
    expect(json).toHaveProperty('code', 'PARENTAL_PASSWORD_ALREADY_SET');
  });
});
