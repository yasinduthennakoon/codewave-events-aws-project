# registrations-service

Event registrations. Writes to MongoDB then enqueues an SQS message so the email goes out asynchronously.

## Endpoints

| Method | Path                          | Auth | Description                                  |
|--------|-------------------------------|------|----------------------------------------------|
| POST   | `/events/{id}/register`       | JWT  | Register the caller for an event             |
| GET    | `/my-registrations`           | JWT  | List the caller's registrations              |

## SSM parameters consumed

- `/cloudwave/${stage}/cognito/userPoolId`
- `/cloudwave/${stage}/cognito/clientId`
- `/cloudwave/${stage}/sqs/registrationQueueArn`
- `/cloudwave/${stage}/sqs/registrationQueueUrl`
- `/cloudwave/${stage}/mongo/uri` (read at runtime)

## Deploy

```bash
npm install
npx serverless deploy --stage dev
```

## Notes

- Prevents duplicate registrations: same `userSub` + `eventId` returns 409.
- Returns 201 as soon as the SQS message is accepted — does NOT wait for email.
- If SQS is unreachable, the registration is rolled back? **No, it isn't** — that's the demo's intentional simplification. In production wrap both writes in a transaction or use the [transactional outbox pattern](https://microservices.io/patterns/data/transactional-outbox.html).
