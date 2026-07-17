import { test, expect } from '@playwright/test';
import { apiPath, baseQuery, config } from './utils/api';
import { expectSuccessEnvelope } from './utils/assertions';

// Movie confirmed present in the sitemap (/api/v2/sitemap/movies.xml) as "the-lullaby-120".
const MOVIE_ID = '120';

const authHeaders = () => ({
  Authorization: config.authToken,
  'x-country-code': config.countryCode,
});

const countryHeader = () => ({
  'x-country-code': config.countryCode,
});

test.describe('Movie', () => {
  // Authenticated requests without an active subscription return status:false from this
  // endpoint. Use no auth header so the test verifies public browsing access instead.
  test('GET /movie/single/:movieId returns movie details', async ({ request }) => {
    const res = await request.get(apiPath(`/movie/single/${MOVIE_ID}`), {
      params: baseQuery(),
      headers: countryHeader(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(json.data).toHaveProperty('show_id');
    expect(json.data).toHaveProperty('name');
    expect(json.data).toHaveProperty('slug');
  });

  test('GET /movie/related/:movieId returns related movies', async ({ request }) => {
    const res = await request.get(apiPath(`/movie/related/${MOVIE_ID}`), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
  });

  // Returns data:[] with status:false when the movie has no download options — that
  // is a valid business response, so we only assert the envelope shape and array type.
  test('GET /movie/:movieId/available_downloads returns download options', async ({ request }) => {
    const res = await request.get(apiPath(`/movie/${MOVIE_ID}/available_downloads`), {
      params: baseQuery(),
      headers: countryHeader(),
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty('status');
    expect(json).toHaveProperty('data');
    expect(Array.isArray(json.data)).toBe(true);
  });

  // Requires an active subscription — asserts shape only; data.video_url checked when available.
  test('GET /movie/video/:movieId returns video info', async ({ request }) => {
    const res = await request.get(apiPath(`/movie/video/${MOVIE_ID}`), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty('status');
    expect(json).toHaveProperty('message');
    if (json.status) {
      // Response uses fileUrl (primary) and hls_group (HLS stream), not video_url.
      expect(json.data).toHaveProperty('fileUrl');
    }
  });

  // Requires an active subscription — asserts shape only; data.download_url checked when available.
  test('GET /movie/download/:movieId returns download info', async ({ request }) => {
    const res = await request.get(apiPath(`/movie/download/${MOVIE_ID}`), {
      params: baseQuery(),
      headers: authHeaders(),
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty('status');
    expect(json).toHaveProperty('message');
    if (json.status) {
      expect(json.data).toHaveProperty('download_url');
    }
  });
});
