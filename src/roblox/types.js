class RobloxApiError extends Error {
  constructor(message, status, body, endpoint) {
    super(message);
    this.name = 'RobloxApiError';
    this.status = status;
    this.body = body;
    this.endpoint = endpoint;
  }
  get isRateLimit() { return this.status === 429; }
  get isNotFound() { return this.status === 404; }
}

module.exports = { RobloxApiError };
