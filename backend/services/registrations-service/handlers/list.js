// ============================================================================
// handlers/list.js  —  GET /my-registrations  (JWT required)
// ----------------------------------------------------------------------------
// Returns all event registrations for the calling user.
// ============================================================================

const { getDb } = require('../../../shared/db');
const { getUser } = require('../../../shared/auth');
const { ok, unauthorized, serverError } = require('../../../shared/response');

module.exports.handler = async (event) => {
  try {
    const user = getUser(event);
    if (!user) return unauthorized();

    const db = await getDb();
    const registrations = await db
      .collection('registrations')
      .find({ userSub: user.sub })
      .sort({ eventDate: 1 })
      .toArray();

    return ok({ registrations });
  } catch (err) {
    console.error('list-my-registrations error:', err);
    return serverError(err.message);
  }
};
