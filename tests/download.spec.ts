import { test, expect } from '@playwright/test';
import { apiPath, baseQuery, config } from './utils/api';
import { expectSuccessEnvelope } from './utils/assertions';

const MOVIE_ID = '444'; // "The Others" — confirmed present via /search

test.describe('Download', () => {
  test('GET /download/:type/:id returns download link for a movie', async ({ request }) => {
    const res = await request.get(apiPath(`/download/movie/${MOVIE_ID}`), {
      params: baseQuery(),
      headers: {
        Authorization: config.authToken,
        'x-country-code': config.countryCode,
      },
    });
    const json = await expectSuccessEnvelope(res);
    expect(json).toHaveProperty('code', 'DOWNLOAD_LINK');
    expect(json.data).toHaveProperty('responseMeta');
    expect(json.data.responseMeta).toHaveProperty('introUrl');
    expect(json.data.responseMeta).toHaveProperty('title');
  });
});
