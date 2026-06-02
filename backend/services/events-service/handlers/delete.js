// ============================================================================
// handlers/delete.js  —  DELETE /events/{id}  (JWT required, owner only)
// ============================================================================

const { ObjectId } = require('mongodb');
const { getDb } = require('../shared/db');
const { getUser } = require('../shared/auth');
const {
  ok, notFound, badRequest, unauthorized, forbidden, serverError,
} = require('../shared/response');

module.exports.handler = async (event) => {
  try {
    const user = getUser(event);
    if (!user) return unauthorized();

    const { id } = event.pathParameters || {};
    if (!ObjectId.isValid(id)) return badRequest('Invalid event id');

    const db = await getDb();

    const existing = await db.collection('events').findOne({ _id: new ObjectId(id) });
    if (!existing) return notFound('Event not found');
    if (existing.ownerSub !== user.sub) return forbidden('You do not own this event');

    await db.collection('events').deleteOne({ _id: new ObjectId(id) });
    // We also clean up registrations for this event — keeps data tidy for the demo.
    await db.collection('registrations').deleteMany({ eventId: id });

    return ok({ message: 'Event deleted' });
  } catch (err) {
    console.error('delete event error:', err);
    return serverError(err.message);
  }
};
