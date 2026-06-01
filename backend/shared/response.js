// ============================================================================
// backend/shared/response.js
// ----------------------------------------------------------------------------
// Tiny helpers to build HTTP API v2 Lambda responses with consistent shape
// and CORS headers. Every handler returns one of these.
// ============================================================================

// CORS headers — `*` is fine for a demo; lock down origin in production.
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

function build(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

module.exports = {
  ok:           (body)    => build(200, body),
  created:      (body)    => build(201, body),
  badRequest:   (message) => build(400, { error: message }),
  unauthorized: (message) => build(401, { error: message || 'Unauthorized' }),
  forbidden:    (message) => build(403, { error: message || 'Forbidden' }),
  notFound:     (message) => build(404, { error: message || 'Not Found' }),
  conflict:     (message) => build(409, { error: message }),
  serverError:  (message) => build(500, { error: message || 'Internal Server Error' }),
};
