# notifications-service

The async/scheduling showcase. No HTTP endpoints — only event-driven Lambdas.

## Lambdas

| Function                       | Trigger             | Purpose                                       |
|--------------------------------|---------------------|-----------------------------------------------|
| `processRegistrationQueue`     | SQS                 | Sends a confirmation email per registration   |
| `sendReminders`                | EventBridge (cron)  | Daily — emails tomorrow's registered users    |

## AWS resources owned

- `RegistrationQueue` — main SQS queue
- `RegistrationDLQ` — dead-letter queue (failed messages after 3 retries)
- EventBridge scheduled rule firing at `cron(0 9 * * ? *)` (09:00 UTC daily)

## SSM parameters published

- `/cloudwave/${stage}/sqs/registrationQueueArn`
- `/cloudwave/${stage}/sqs/registrationQueueUrl`

## SSM parameters consumed (at runtime, not deploy time)

- `/cloudwave/${stage}/mongo/uri`
- `/cloudwave/${stage}/ses/fromEmail`

## Deploy

```bash
npm install
npx serverless deploy --stage dev
```

## Demoing without waiting

### Trigger an SQS-driven email manually

```bash
aws sqs send-message \
  --queue-url $(aws ssm get-parameter --name /cloudwave/dev/sqs/registrationQueueUrl --query Parameter.Value --output text) \
  --message-body '{"userEmail":"verified@example.com","eventTitle":"Demo","eventDate":"2026-12-01T18:00:00Z"}'
```

### Invoke the daily reminder Lambda manually

```bash
aws lambda invoke \
  --function-name cloudwave-notifications-dev-sendReminders \
  /tmp/out.json && cat /tmp/out.json
```

## SES sandbox gotcha

By default SES is in sandbox mode: it will only send to **verified** addresses. Either:

1. Verify every test recipient's email in the SES console, **or**
2. Request SES production access via the AWS console (takes ~24 h).
