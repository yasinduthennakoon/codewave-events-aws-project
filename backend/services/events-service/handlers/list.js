// ============================================================================
// handlers/list.js  —  GET /events  (public)
// ----------------------------------------------------------------------------
// Returns the 100 most recent events. No auth required so anyone can browse.
// ============================================================================

const { getDb } = require('../../../shared/db');
const { ok, serverError } = require('../../../shared/response');

module.exports.handler = async () => {
  try {
    const db = await getDb();
    const events = await db
      .collection('events')
      .find({})
      .sort({ date: 1 })   // soonest first
      .limit(100)
      .toArray();
    return ok({ events });
  } catch (err) {
    console.error('list events error:', err);
    return serverError(err.message);
  }
};
