import { test } from '@playwright/test';
import { apiPath, baseQuery } from './utils/api';
import { expectXml } from './utils/assertions';

test.describe('sitemap-v1', () => {
  test('GET /sitemap.xml returns a sitemap index', async ({ request }) => {
    const res = await request.get(apiPath('/sitemap/sitemap.xml'), { params: baseQuery() });
    await expectXml(res);
  });

  test('GET /core.xml returns core urlset', async ({ request }) => {
    const res = await request.get(apiPath('/sitemap/core.xml'), { params: baseQuery() });
    await expectXml(res);
  });

  test('GET /movies.xml returns movies urlset', async ({ request }) => {
    const res = await request.get(apiPath('/sitemap/movies.xml'), { params: baseQuery() });
    await expectXml(res);
  });

  test('GET /series.xml returns series urlset', async ({ request }) => {
    const res = await request.get(apiPath('/sitemap/series.xml'), { params: baseQuery() });
    await expectXml(res);
  });


  test('GET /catalogue.xml (v2) returns catalogue urlset', async ({ request }) => {
    const res = await request.get('/api/v2/sitemap/catalogue.xml', { params: baseQuery() });
    await expectXml(res);
  });

  test('GET /categories.xml returns categories urlset', async ({ request }) => {
    const res = await request.get(apiPath('/sitemap/categories.xml'), { params: baseQuery() });
    await expectXml(res);
  });

  test('GET /genres.xml returns genres urlset', async ({ request }) => {
    const res = await request.get(apiPath('/sitemap/genres.xml'), { params: baseQuery() });
    await expectXml(res);
  });

  test('GET /languages.xml returns languages urlset', async ({ request }) => {
    const res = await request.get(apiPath('/sitemap/languages.xml'), { params: baseQuery() });
    await expectXml(res);
  });

  test('GET /tags.xml returns tags urlset', async ({ request }) => {
    const res = await request.get(apiPath('/sitemap/tags.xml'), { params: baseQuery() });
    await expectXml(res);
  });

  test('GET /talent.xml returns talent urlset', async ({ request }) => {
    const res = await request.get(apiPath('/sitemap/talent.xml'), { params: baseQuery() });
    await expectXml(res);
  });

  test('GET /live.xml returns live urlset', async ({ request }) => {
    const res = await request.get(apiPath('/sitemap/live.xml'), { params: baseQuery() });
    await expectXml(res);
  });
});
