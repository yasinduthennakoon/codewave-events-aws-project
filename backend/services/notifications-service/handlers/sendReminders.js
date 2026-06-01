// ============================================================================
// handlers/sendReminders.js  —  triggered by EventBridge daily at 09:00 UTC
// ----------------------------------------------------------------------------
// This is the MEDIUM CHALLENGE requirement from the bootcamp brief:
// "A scheduled job runs daily, identifies upcoming events, sends reminder emails."
//
// Flow:
//   1. Compute the UTC window for "tomorrow" (00:00 to 23:59).
//   2. Query MongoDB for events whose date falls in that window.
//   3. For each event, fetch all its registrations.
//   4. Send one reminder email per registration via SES.
//
// To manually invoke for testing:
//   aws lambda invoke --function-name cloudwave-notifications-dev-sendReminders out.json
// ============================================================================

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { getDb } = require('../../../shared/db');

const ses = new SESClient({});

module.exports.handler = async () => {
  const db = await getDb();

  // ---- Find events happening "tomorrow" (UTC) ------------------------------
  const now = new Date();
  const tomorrowStart = new Date(now);
  tomorrowStart.setUTCDate(now.getUTCDate() + 1);
  tomorrowStart.setUTCHours(0, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setUTCHours(23, 59, 59, 999);

  const events = await db.collection('events').find({
    date: { $gte: tomorrowStart, $lte: tomorrowEnd },
  }).toArray();

  console.log(`Found ${events.length} event(s) happening tomorrow.`);

  let emailsSent = 0;

  // ---- For each event, email every registered user ------------------------
  for (const evt of events) {
    const regs = await db.collection('registrations')
      .find({ eventId: evt._id.toString() })
      .toArray();

    for (const reg of regs) {
      try {
        await ses.send(new SendEmailCommand({
          Source: process.env.FROM_EMAIL,
          Destination: { ToAddresses: [reg.userEmail] },
          Message: {
            Subject: { Data: `Reminder: "${evt.title}" is tomorrow!` },
            Body: {
              Text: {
                Data:
`Hi,

This is a friendly reminder that "${evt.title}" takes place tomorrow at ${evt.date.toUTCString()}.

${evt.description}

See you there!
— CloudWave Events`,
              },
            },
          },
        }));
        emailsSent++;
      } catch (err) {
        // We log but don't throw — one failure shouldn't stop other reminders.
        console.error('Failed to email', reg.userEmail, err.message);
      }
    }
  }

  console.log(`sendReminders done. Emails sent: ${emailsSent}`);
  return { events: events.length, emailsSent };
};
