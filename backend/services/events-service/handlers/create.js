// ============================================================================
// handlers/create.js  —  POST /events  (JWT required)
// ----------------------------------------------------------------------------
// Creates a new event owned by the calling user (taken from the JWT).
//
// Body: { title, description, date, bannerUrl? }
// ============================================================================

const { getDb } = require('../../../shared/db');
const { getUser } = require('../../../shared/auth');
const { created, badRequest, unauthorized, serverError } = require('../../../shared/response');

module.exports.handler = async (event) => {
  try {
    const user = getUser(event);
    if (!user) return unauthorized();

    const { title, description, date, bannerUrl } = JSON.parse(event.body || '{}');

    if (!title || !description || !date) {
      return badRequest('title, description, and date are required');
    }

    const doc = {
      title,
      description,
      date: new Date(date),     // ISO string → Date for proper sorting/$gte queries
      bannerUrl: bannerUrl || null,
      ownerSub:   user.sub,     // Cognito user ID — our foreign key everywhere
      ownerEmail: user.email,
      createdAt:  new Date(),
    };

    const db = await getDb();
    const result = await db.collection('events').insertOne(doc);

    return created({ event: { ...doc, _id: result.insertedId } });
  } catch (err) {
    console.error('create event error:', err);
    return serverError(err.message);
  }
};
