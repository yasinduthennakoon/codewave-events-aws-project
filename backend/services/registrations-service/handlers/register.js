// ============================================================================
// handlers/register.js  —  POST /events/{id}/register  (JWT required)
// ----------------------------------------------------------------------------
// HARD CHALLENGE (bonus) — demonstrates the asynchronous pattern:
//
//   1. Insert the registration document into MongoDB.
//   2. Push a message onto the SQS queue with the user's email + event info.
//   3. Return 201 immediately. The user-facing latency does NOT depend on SES.
//
//   The actual email is sent by the SQS-triggered Lambda in
//   notifications-service. If SES is slow or temporarily down, the message
//   is retried automatically by SQS — and after 3 failed attempts it lands
//   in the dead-letter queue for inspection.
// ============================================================================

const { ObjectId } = require('mongodb');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const { getDb } = require('../shared/db');
const { getUser } = require('../shared/auth');
const {
  created, badRequest, notFound, conflict, unauthorized, serverError,
} = require('../shared/response');

const sqs = new SQSClient({});

module.exports.handler = async (event) => {
  try {
    const user = getUser(event);
    if (!user) return unauthorized();

    const { id: eventId } = event.pathParameters || {};
    if (!ObjectId.isValid(eventId)) return badRequest('Invalid event id');

    const db = await getDb();

    // ---- Verify the event exists -----------------------------------------
    const evt = await db.collection('events').findOne({ _id: new ObjectId(eventId) });
    if (!evt) return notFound('Event not found');

    // ---- Prevent duplicate registrations ---------------------------------
    const existing = await db.collection('registrations').findOne({
      eventId: eventId,
      userSub: user.sub,
    });
    if (existing) return conflict('You are already registered for this event');

    // ---- 1. Persist the registration -------------------------------------
    const registration = {
      eventId,
      userSub:    user.sub,
      userEmail:  user.email,
      eventTitle: evt.title,
      eventDate:  evt.date,
      createdAt:  new Date(),
    };
    const result = await db.collection('registrations').insertOne(registration);

    // ---- 2. Enqueue a confirmation-email job -----------------------------
    // Notice we don't `await SES` here — SES is invoked by the consumer
    // Lambda in notifications-service. This makes registration FAST and
    // resilient to email-provider outages.
    await sqs.send(new SendMessageCommand({
      QueueUrl:    process.env.REGISTRATION_QUEUE_URL,
      MessageBody: JSON.stringify({
        userEmail:  user.email,
        eventTitle: evt.title,
        eventDate:  evt.date,
      }),
    }));

    return created({
      registration: { ...registration, _id: result.insertedId },
      message: 'Registered. A confirmation email is on its way.',
    });
  } catch (err) {
    console.error('register-for-event error:', err);
    return serverError(err.message);
  }
};
