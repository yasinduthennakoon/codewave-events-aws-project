// ============================================================================
// handlers/update.js  —  PUT /events/{id}  (JWT required, owner only)
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

    const body = JSON.parse(event.body || '{}');

    // Whitelist of fields the user is allowed to change
    const updates = {};
    if (body.title)       updates.title       = body.title;
    if (body.description) updates.description = body.description;
    if (body.date)        updates.date        = new Date(body.date);
    if (body.bannerUrl !== undefined) updates.bannerUrl = body.bannerUrl;

    if (Object.keys(updates).length === 0) {
      return badRequest('No updatable fields provided');
    }

    const db = await getDb();

    // Verify ownership BEFORE updating
    const existing = await db.collection('events').findOne({ _id: new ObjectId(id) });
    if (!existing) return notFound('Event not found');
    if (existing.ownerSub !== user.sub) return forbidden('You do not own this event');

    await db.collection('events').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } },
    );

    const updated = await db.collection('events').findOne({ _id: new ObjectId(id) });
    return ok({ event: updated });
  } catch (err) {
    console.error('update event error:', err);
    return serverError(err.message);
  }
};
