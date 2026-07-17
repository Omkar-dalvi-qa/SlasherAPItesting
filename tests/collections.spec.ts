import { test, expect } from '@playwright/test';
import { apiPath, baseQuery, config } from './utils/api';
import { expectSuccessEnvelope } from './utils/assertions';

// Update these if the catalog structure changes.
const CATEGORY_SLUG = 'exclusive';    // from /home/categories/movie → vc_slug field
const COLLECTION_ID = '46';           // "BEYOND HUMAN MIND" — from /collections/get-cataloglist
const COLLECTION_SLUG = 'beyond-human-mind';
const LG_TYPE = 'movie';
const C_TYPE = 'genre';
const LGC_SLUG = 'action';

const authHeaders = () => ({
  Authorization: config.authToken,
  'x-country-code': config.countryCode,
});

test.describe('Collections', () => {
  test('GET /collections/get-cataloglist returns catalog list', async ({ request }) => {
    const res = await request.get(apiPath('/collections/get-cataloglist'), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
  });

  // data is a collection object {id, title, link, items:[...]}, not a flat array.
  test('GET /collections/category/:slug/all-items returns all items for a category', async ({ request }) => {
    const res = await request.get(apiPath(`/collections/category/${CATEGORY_SLUG}/all-items`), {
      params: baseQuery({ pageNo: '1', pageSize: '20' }),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(json.data).toHaveProperty('id');
    expect(json.data).toHaveProperty('title');
    expect(json.data).toHaveProperty('items');
    expect(Array.isArray(json.data.items)).toBe(true);
  });

  test('GET /collections/:slug returns a collection', async ({ request }) => {
    const res = await request.get(apiPath(`/collections/${COLLECTION_SLUG}`), {
      params: baseQuery({ offset: '0', limit: '5', section: '1' }),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(json.data).toBeTruthy();
  });

  // data is a collection object {id, title, link, items:[...]}, not a flat array.
  test('GET /collections/:slug/items returns items in a collection', async ({ request }) => {
    const res = await request.get(apiPath(`/collections/${COLLECTION_SLUG}/items`), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(json.data).toHaveProperty('id');
    expect(json.data).toHaveProperty('title');
    expect(json.data).toHaveProperty('items');
    expect(Array.isArray(json.data.items)).toBe(true);
  });

  // data is a collection object {id, title, link, items:[...]}, not a flat array.
  test('GET /collections/:slug/all-items returns all items in a collection', async ({ request }) => {
    const res = await request.get(apiPath(`/collections/${COLLECTION_SLUG}/all-items`), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(json.data).toHaveProperty('id');
    expect(json.data).toHaveProperty('title');
    expect(json.data).toHaveProperty('items');
    expect(Array.isArray(json.data.items)).toBe(true);
  });

  test('GET /collections/:lgtype/:ctype/:slug returns filtered collection', async ({ request }) => {
    const res = await request.get(apiPath(`/collections/${LG_TYPE}/${C_TYPE}/${LGC_SLUG}`), {
      params: baseQuery({ genreIds: '1', languageIds: '1', tagIds: '1', pageNo: '1', pageSize: '20' }),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
  });

  // data is a collection object {id, title, link, items:[...]}, not a flat array.
  test('GET /collections/:collectionId/:slug returns paginated collection', async ({ request }) => {
    const res = await request.get(apiPath(`/collections/${COLLECTION_ID}/${COLLECTION_SLUG}`), {
      params: baseQuery({ pageNo: '1', pageSize: '20' }),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(json.data).toHaveProperty('id');
    expect(json.data).toHaveProperty('title');
    expect(json.data).toHaveProperty('items');
    expect(Array.isArray(json.data.items)).toBe(true);
  });
});
