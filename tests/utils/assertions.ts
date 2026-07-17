import { APIResponse, expect } from '@playwright/test';


export async function expectSuccessEnvelope(response: APIResponse) {
  expect(response.ok(), `Expected 2xx, got ${response.status()}: ${await response.text()}`).toBeTruthy();
  const json = await response.json();
  expect(json).toHaveProperty('status');
  expect(json.status).toBe(true);
  return json;
}

/** For endpoints (sitemap-v1) that return raw XML instead of the JSON envelope. */
export async function expectXml(response: APIResponse) {
  expect(response.ok(), `Expected 2xx, got ${response.status()}`).toBeTruthy();
  const contentType = response.headers()['content-type'] ?? '';
  expect(contentType).toContain('xml');
  const body = await response.text();
  expect(body.trim().startsWith('<?xml')).toBeTruthy();
  return body;
}
