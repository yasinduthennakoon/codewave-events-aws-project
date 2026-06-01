// ============================================================================
// handlers/processRegistrationQueue.js
// ----------------------------------------------------------------------------
// SQS-triggered Lambda. Each invocation receives a batch of up to 5 messages
// (configured in serverless.yml). For each message, we send a confirmation
// email via SES.
//
// Message shape (whatever the producer in registrations-service puts on the queue):
//   {
//     userEmail:  "alice@example.com",
//     eventTitle: "DevOps Meetup",
//     eventDate:  "2026-06-15T18:00:00.000Z",
//   }
//
// PARTIAL BATCH FAILURE HANDLING
//   If a single message fails, we return its messageId in `batchItemFailures`
//   so SQS retries only that one — not the whole batch. This requires
//   ReportBatchItemFailures to be enabled (it is by default on serverless v3
//   when you return that shape).
// ============================================================================

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({});

module.exports.handler = async (event) => {
  const batchItemFailures = [];

  // SQS delivers messages in event.Records — one entry per message.
  for (const record of event.Records) {
    try {
      const payload = JSON.parse(record.body);
      await sendConfirmationEmail(payload);
      console.log('Sent confirmation to', payload.userEmail);
    } catch (err) {
      console.error('Failed to process message', record.messageId, err);
      // Tell SQS this specific message failed — it will be retried.
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};

async function sendConfirmationEmail({ userEmail, eventTitle, eventDate }) {
  const dateStr = new Date(eventDate).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  await ses.send(new SendEmailCommand({
    Source: process.env.FROM_EMAIL,
    Destination: { ToAddresses: [userEmail] },
    Message: {
      Subject: { Data: `You're registered: ${eventTitle}` },
      Body: {
        Text: {
          Data:
`Hi,

You're confirmed for "${eventTitle}" on ${dateStr}.

See you there!
— CloudWave Events`,
        },
      },
    },
  }));
}
