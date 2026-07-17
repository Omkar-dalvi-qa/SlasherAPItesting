import { test, expect } from '@playwright/test';
import { apiPath, baseQuery } from './utils/api';
import { expectSuccessEnvelope } from './utils/assertions';

test.describe('Home', () => {
  test('GET /is-voucher-available checks a voucher code', async ({ request }) => {
    const res = await request.get(apiPath('/home/is-voucher-available'), {
      params: baseQuery({ voucher_code: '0XGO20AM7FK' }),
    });
    const json = await expectSuccessEnvelope(res);
    expect(json.data).toHaveProperty('isAvailable');
  });

  test('GET /onboarding/:locale_name returns onboarding banners', async ({ request }) => {
    const res = await request.get(apiPath('/home/onboarding/en'), { params: baseQuery() });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
  });

  test('GET /onboarding-one returns onboarding slides', async ({ request }) => {
    const res = await request.get(apiPath('/home/onboarding-one'), { params: baseQuery() });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
    if (json.data.length) {
      expect(json.data[0]).toHaveProperty('heading');
      expect(json.data[0]).toHaveProperty('card_image');
    }
  });

  test('GET /onboarding-two returns onboarding slides', async ({ request }) => {
    const res = await request.get(apiPath('/home/onboarding-two'), { params: baseQuery() });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
  });

  test('GET /banners/:page returns banners for a page', async ({ request }) => {
    const res = await request.get(apiPath('/home/banners/movie'), { params: baseQuery() });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
    if (json.data.length) {
      expect(json.data[0]).toHaveProperty('show_id');
      expect(json.data[0]).toHaveProperty('show_type');
    }
  });

  test('GET /categories/:page returns categories for a page', async ({ request }) => {
    const res = await request.get(apiPath('/home/categories/movie'), { params: baseQuery() });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
  });

  test('GET /categories-test/:page returns categories for a page', async ({ request }) => {
    const res = await request.get(apiPath('/home/categories-test/movie'), { params: baseQuery() });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
  });

  test('GET /show-by-tag/:page/:tag_id returns shows for a tag', async ({ request }) => {
    const res = await request.get(apiPath('/home/show-by-tag/1/1'), { params: baseQuery() });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
    if (json.data.length) {
      expect(json.data[0]).toHaveProperty('show_id');
      expect(json.data[0]).toHaveProperty('tag_id');
    }
  });

  test('GET /on-boarding-images returns onboarding image list', async ({ request }) => {
    const res = await request.get(apiPath('/home/on-boarding-images'), { params: baseQuery() });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
  });

  test('GET /search returns matching shows', async ({ request }) => {
    const res = await request.get(apiPath('/home/search'), {
      params: baseQuery({ q: 'the', page: '1', limit: '20' }),
    });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
    if (json.data.length) {
      expect(json.data[0]).toHaveProperty('video_show_id');
      expect(json.data[0]).toHaveProperty('video_show_title');
    }
  });

  test('GET /location returns geo-ip data', async ({ request }) => {
    const res = await request.get(apiPath('/home/location'), { params: baseQuery() });
    const json = await expectSuccessEnvelope(res);
    expect(json.data).toHaveProperty('country');
  });

  test('GET /language returns supported languages', async ({ request }) => {
    const res = await request.get(apiPath('/home/language'), { params: baseQuery() });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data[0]).toHaveProperty('lang_id');
    expect(json.data[0]).toHaveProperty('lang_name');
  });

  test('GET /genre-list returns genres', async ({ request }) => {
    const res = await request.get(apiPath('/home/genre-list'), { params: baseQuery() });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
    if (json.data.length) {
      expect(json.data[0]).toHaveProperty('genre_id');
      expect(json.data[0]).toHaveProperty('genre_slug');
    }
  });

  test('GET /tag-list returns tags', async ({ request }) => {
    const res = await request.get(apiPath('/home/tag-list'), { params: baseQuery() });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
    if (json.data.length) {
      expect(json.data[0]).toHaveProperty('tag_id');
      expect(json.data[0]).toHaveProperty('tag_slug');
    }
  });

  test('GET /avatars-list returns avatars', async ({ request }) => {
    const res = await request.get(apiPath('/home/avatars-list'), { params: baseQuery() });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
    if (json.data.length) {
      expect(json.data[0]).toHaveProperty('avatar_id');
      expect(json.data[0]).toHaveProperty('image_url');
    }
  });

  test('GET /countries returns country list', async ({ request }) => {
    const res = await request.get(apiPath('/home/countries'), { params: baseQuery() });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data[0]).toHaveProperty('country_code');
    expect(json.data[0]).toHaveProperty('iso_code');
  });

  test('GET /get-category-list returns paginated categories', async ({ request }) => {
    const res = await request.get(apiPath('/home/get-category-list'), {
      params: baseQuery({ page: '1', limit: '10' }),
    });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
  });

  test('GET /get-master-category-list returns master categories', async ({ request }) => {
    const res = await request.get(apiPath('/home/get-master-category-list'), {
      params: baseQuery({ isAll: '1', status: 'Y' }),
    });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
    if (json.data.length) {
      expect(json.data[0]).toHaveProperty('category_id');
      expect(json.data[0]).toHaveProperty('category_slug');
    }
  });

  test('POST /mobile_app_store returns store config for a key', async ({ request }) => {
    const res = await request.post(apiPath('/home/mobile_app_store'), {
      params: baseQuery(),
      data: { store_key: 'google_play_store' },
    });
    const json = await expectSuccessEnvelope(res);
    expect(json.data).toHaveProperty('store_key', 'google_play_store');
  });

  test('GET /mobile_app_store/all returns all store configs', async ({ request }) => {
    const res = await request.get(apiPath('/home/mobile_app_store/all'), { params: baseQuery() });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data[0]).toHaveProperty('store_key');
  });
});
