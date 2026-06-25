const { API_BASE_URL } = require('../config');
const { expectBusinessSuccess } = require('../assertions/response-assertions');

const FORWARDED_HEADERS = [
  'authorization',
  'appid',
  'chainid',
  'shopid',
  'orgunitcode',
  'orgunittype',
];

function extractApiHeaders(request) {
  const source = request.headers();
  return Object.fromEntries(
    FORWARDED_HEADERS.filter((name) => source[name]).map((name) => [name, source[name]]),
  );
}

class BaseApi {
  constructor(request, headers = {}) {
    this.request = request;
    this.headers = headers;
  }

  async send(method, url, options = {}) {
    return this.request.fetch(`${API_BASE_URL}${url}`, {
      ...options,
      method,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    });
  }

  async sendSuccess(method, url, options = {}) {
    const response = await this.send(method, url, options);
    return expectBusinessSuccess(response);
  }
}

module.exports = { BaseApi, extractApiHeaders };
