// ============================================================================
// handlers/get.js  —  GET /events/{id}  (public)
// ============================================================================

const { ObjectId } = require('mongodb');
const { getDb } = require('../shared/db');
const { ok, notFound, badRequest, serverError } = require('../shared/response');

module.exports.handler = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    if (!ObjectId.isValid(id)) return badRequest('Invalid event id');

    const db = await getDb();
    const evt = await db.collection('events').findOne({ _id: new ObjectId(id) });
    if (!evt) return notFound('Event not found');

    return ok({ event: evt });
  } catch (err) {
    console.error('get event error:', err);
    return serverError(err.message);
  }
};
