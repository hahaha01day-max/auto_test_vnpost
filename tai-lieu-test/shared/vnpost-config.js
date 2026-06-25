const { API_BASE_URL, BASE_URL } = require('./config');

const isLocal = BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1');

module.exports = { API_BASE_URL, BASE_URL, isLocal };
