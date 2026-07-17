import { test, expect } from '@playwright/test';
import { apiPath, baseQuery } from './utils/api';
import { expectSuccessEnvelope } from './utils/assertions';

test.describe('extras', () => {
  test('GET /faqs returns FAQ list matching search', async ({ request }) => {
    const res = await request.get(apiPath('/extras/faqs'), {
      params: baseQuery({ search: 'What is Slasher' }),
    });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
    if (json.data.length) {
      expect(json.data[0]).toHaveProperty('faq_question');
      expect(json.data[0]).toHaveProperty('faq_answer');
    }
  });

  test('GET /content-complaints returns a list', async ({ request }) => {
    const res = await request.get(apiPath('/extras/content-complaints'), {
      params: baseQuery({ search: 'Compliance Report - December 2022' }),
    });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
  });

  test('GET /privacy-policy returns policy sections', async ({ request }) => {
    const res = await request.get(apiPath('/extras/privacy-policy'), { params: baseQuery() });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
    if (json.data.length) {
      expect(json.data[0]).toHaveProperty('pp_heading');
      expect(json.data[0]).toHaveProperty('pp_text');
    }
  });

  test('GET /terms-conditions returns terms sections', async ({ request }) => {
    const res = await request.get(apiPath('/extras/terms-conditions'), { params: baseQuery() });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
    if (json.data.length) {
      expect(json.data[0]).toHaveProperty('tc_heading');
      expect(json.data[0]).toHaveProperty('tc_text');
    }
  });

  test('GET /refund-policy responds with the envelope', async ({ request }) => {
    // Known bug (reported to backend dev): endpoint isn't implemented yet and returns
    // code: "API_NOT_READY", but status is still true instead of false. This test
    // documents today's actual (buggy) behavior - once status is fixed to false,
    // update this assertion and expectSuccessEnvelope() will start failing here as
    // the signal to do so.
    const res = await request.get(apiPath('/extras/refund-policy'), { params: baseQuery() });
    const json = await expectSuccessEnvelope(res);
    expect(json).toHaveProperty('message');
    expect(json).toHaveProperty('code', 'API_NOT_READY');
  });

  test('GET /about-us returns HTML content', async ({ request }) => {
    const res = await request.get(apiPath('/extras/about-us'), { params: baseQuery() });
    const json = await expectSuccessEnvelope(res);
    expect(typeof json.data).toBe('string');
    expect(json.data.length).toBeGreaterThan(0);
  });

  test('POST /parse-vtt parses a subtitle url', async ({ request }) => {
    const res = await request.post(apiPath('/extras/parse-vtt'), {
      params: baseQuery(),
      data: { subtitle: 'https://your-cdn.com/subs/episode1.en.vtt' },
    });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
  });

  
  test('POST /contact-us submits a contact request', { tag: '@mutating' }, async ({ request }) => {
    const res = await request.post(apiPath('/extras/contact-us'), {
      params: baseQuery(),
      data: {
        firstName: 'Playwright',
        lastName: 'Bot',
        email: 'qa+playwright@slasherplay.tv',
        subject: 'Other Reason',
        message: 'This is an automated daily API test run.',
        agreeToTerms: true,
      },
    });
    const json = await expectSuccessEnvelope(res);
    expect(json.data).toHaveProperty('id');
  });

  
  test('POST /contact-us/freshdesk creates a support ticket', { tag: '@mutating' }, async ({ request }) => {
    // Fetch a valid subject from the reasons list — the endpoint validates against this list.
    const reasonsRes = await request.get(apiPath('/extras/contact-us/reasons'), { params: baseQuery() });
    const reasonsJson = await reasonsRes.json();
    const firstReason = reasonsJson.data[0];
    const subject = typeof firstReason === 'string'
      ? firstReason
      : (firstReason.name ?? firstReason.reason ?? firstReason.subject ?? firstReason.title);

    const res = await request.post(apiPath('/extras/contact-us/freshdesk'), {
      params: baseQuery(),
      data: {
        first_name: 'Playwright',
        last_name: 'Bot',
        email: 'qa+playwright@slasherplay.tv',
        subject,
        message: 'This is an automated daily API test run.',
      },
    });
    const json = await expectSuccessEnvelope(res);
    expect(json.data).toHaveProperty('id');
  });

  test('GET /contact-us/reasons returns reason list', async ({ request }) => {
    const res = await request.get(apiPath('/extras/contact-us/reasons'), { params: baseQuery() });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
  });

  test('GET /unsubscribe/reasons returns reason list', async ({ request }) => {
    const res = await request.get(apiPath('/extras/unsubscribe/reasons'), { params: baseQuery() });
    const json = await expectSuccessEnvelope(res);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
  });
});
