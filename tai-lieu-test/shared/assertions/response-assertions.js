const { expect } = require('@playwright/test');

async function expectBusinessSuccess(response) {
  expect(response.ok(), `HTTP ${response.status()} ${response.url()}`).toBeTruthy();
  const body = await response.json();
  expect(String(body?.status?.code), JSON.stringify(body?.status || body)).toBe('200');
  return body;
}

async function expectBusinessError(response, expectedCode) {
  const body = await response.json();
  expect(String(body?.status?.code)).toBe(String(expectedCode));
  return body;
}

module.exports = { expectBusinessError, expectBusinessSuccess };
