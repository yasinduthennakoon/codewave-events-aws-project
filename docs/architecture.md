# Architecture

CloudWave Events Platform — high-level diagram and per-flow walkthroughs.

> For a rendered version, see [`architecture.svg`](./architecture.svg). The ASCII diagram below is the same content in text form (works in any editor / terminal).

## High-level diagram

```
                       ┌────────────────────────────────┐
                       │            Browser             │
                       │      (React + Vite SPA)        │
                       └──────────────┬─────────────────┘
                                      │ HTTPS
                                      │
              ┌───────────────────────┼────────────────────────┐
              │                       │                        │
              ▼                       ▼                        ▼
   ┌──────────────────┐   ┌────────────────────────┐   ┌────────────────────┐
   │  CloudFront CDN  │   │     HTTP API Gateway   │   │   AWS Cognito      │
   │ (frontend  +     │   │  (5 separate APIs —    │   │  (User Pool +      │
   │  uploads bucket) │   │  one per microservice) │   │   App Client)      │
   └────────┬─────────┘   └────────────┬───────────┘   └─────────┬──────────┘
            │                          │                         │
            │                JWT auth  │   issuerUrl /.well-known/jwks.json
            │                          │                         │
            ▼                          ▼                         │
   ┌──────────────────┐    ┌────────────────────────────────────┘
   │   S3 (uploads)   │    │
   │  PUT via         │    ▼
   │  pre-signed URL  │  ┌──────────────────────────┐
   └──────────────────┘  │  Lambda functions        │
                         │  (5 microservices):      │
                         │  • auth-service          │
                         │  • events-service        │
                         │  • registrations-service │──┐
                         │  • files-service         │  │
                         │  • notifications-service │  │
                         └─────────────┬────────────┘  │
                                       │               │
              ┌────────────────────────┼───────────────┼──────────────────────────┐
              │                        │               │                          │
              ▼                        ▼               ▼                          ▼
    ┌──────────────────┐   ┌────────────────────┐  ┌──────────────────┐   ┌──────────────────┐
    │  MongoDB Atlas   │   │  SQS Queue +       │  │  AWS SES         │   │  EventBridge     │
    │  (events,        │   │  Dead-Letter Queue │  │  (transactional  │   │  (daily cron     │
    │  registrations)  │   │                    │  │   email)         │   │  → reminder fn)  │
    └──────────────────┘   └─────────┬──────────┘  └────────▲─────────┘   └────────┬─────────┘
                                     │                      │                      │
                                     │ trigger              │ SendEmail            │ schedule
                                     ▼                      │                      ▼
                              ┌──────────────────────────────────────────────────────┐
                              │           notifications-service Lambdas              │
                              │  processRegistrationQueue.js  +  sendReminders.js    │
                              └──────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────────────┐
    │  Cross-cutting:                                                             │
    │    • SSM Parameter Store — Cognito IDs, SQS ARN, S3 bucket, Mongo URI       │
    │    • CloudWatch Logs    — every Lambda emits structured logs                │
    │    • IAM               — per-function, least-privilege policies             │
    │    • GitHub Actions    — path-filtered deploys per microservice             │
    └─────────────────────────────────────────────────────────────────────────────┘
```

## How each AWS service is used (one-line summary)

| Service          | What we use it for                                                  |
|------------------|---------------------------------------------------------------------|
| **Cognito**      | User directory + JWT issuer; HTTP API validates JWTs natively       |
| **API Gateway**  | HTTP API (v2) — cheaper & faster than REST, built-in JWT authorizer |
| **Lambda**       | All compute. Node.js 20.x. One function per HTTP route + 2 async    |
| **MongoDB Atlas**| Application data (`events`, `registrations` collections)            |
| **S3**           | Event banner storage; bucket is private (CF-only read)              |
| **CloudFront**   | Public CDN delivery for files in S3; OAC signs origin requests      |
| **SES**          | Transactional emails — registration confirmations + reminders       |
| **SQS**          | Decouples registration from email sending; provides retry + DLQ     |
| **EventBridge**  | Daily cron firing the reminder-sender Lambda                        |
| **SSM**          | Shared config: Cognito IDs, SQS ARN, Mongo URI (SecureString)       |
| **CloudWatch**   | Logs (auto) + can build dashboards/alarms in the console            |
| **IAM**          | Per-function role with narrowly scoped permissions                  |

## Flow 1 — Sign-up, confirm, log in

```
Browser  POST /auth/register {email, password}
   │
   ▼
auth-service Lambda  ──►  Cognito SignUp        ──► email with 6-digit code
                                                    sent to user

Browser  POST /auth/confirm {email, code}
   │
   ▼
auth-service Lambda  ──►  Cognito ConfirmSignUp

Browser  POST /auth/login {email, password}
   │
   ▼
auth-service Lambda  ──►  Cognito InitiateAuth  ──► returns IdToken (JWT)
                                                    + AccessToken
                                                    + RefreshToken
Browser stores IdToken in localStorage and sends as
`Authorization: Bearer <idToken>` on every protected call.
```

## Flow 2 — Create an event with a banner image (the pre-signed URL pattern)

```
Browser
   │
   │ 1.  POST /files/presigned-url      (with JWT)
   ▼
files-service Lambda  ──►  signs an S3 PUT URL
                           returns { uploadUrl, publicUrl }
   │
   │ 2.  PUT  uploadUrl     (file bytes go DIRECTLY to S3,
   │                         Lambda never sees the file)
   ▼
S3 bucket  ←  banner image
   │
   │ 3.  POST /events       (with JWT, body includes the publicUrl)
   ▼
events-service Lambda  ──►  MongoDB insert
```

## Flow 3 — Register for an event (SQS — bonus async pattern)

```
Browser
   │
   │ POST /events/{id}/register
   ▼
registrations-service Lambda
   │
   ├─► MongoDB insert (registrations)
   │
   ├─► SQS SendMessage  ──►  RegistrationQueue
   │                              │
   │                              ▼
   │                       (trigger on Lambda invocation)
   │                              │
   │                              ▼
   │                       notifications-service::processRegistrationQueue
   │                              │
   │                              ▼
   │                       SES SendEmail  ──►  user inbox
   │
   ▼
Returns 201 immediately — no SES latency on user's request.
```

If `processRegistrationQueue` throws, SQS retries up to 3 times, then the
message lands in the dead-letter queue (`RegistrationDLQ`) for inspection.

## Flow 4 — Daily reminder emails (EventBridge — mandatory medium challenge)

```
EventBridge rule (cron 0 9 * * ? *)
   │
   │ every day at 09:00 UTC
   ▼
notifications-service::sendReminders Lambda
   │
   ├─► MongoDB query: events where date is "tomorrow"
   │
   ├─► For each event, query registrations
   │
   └─► For each registration: SES SendEmail
```

You can demo this immediately without waiting 24 hours by manually invoking
the function from the console or:

```bash
aws lambda invoke \
  --function-name cloudwave-notifications-dev-sendReminders \
  /tmp/out.json && cat /tmp/out.json
```

## Service-to-service contract (SSM Parameter Store)

The five microservices never import each other's code. They share **only IDs
and ARNs**, published in SSM at deploy time:

| Parameter                                       | Publisher              | Consumers                   |
|-------------------------------------------------|------------------------|-----------------------------|
| `/cloudwave/dev/cognito/userPoolId`             | auth-service           | events, registrations, files|
| `/cloudwave/dev/cognito/userPoolArn`            | auth-service           | (reserved for future use)   |
| `/cloudwave/dev/cognito/clientId`               | auth-service           | events, registrations, files|
| `/cloudwave/dev/sqs/registrationQueueArn`       | notifications-service  | registrations               |
| `/cloudwave/dev/sqs/registrationQueueUrl`       | notifications-service  | registrations               |
| `/cloudwave/dev/s3/uploadsBucket`               | files-service          | (reserved)                  |
| `/cloudwave/dev/cloudfront/domain`              | files-service          | (reserved)                  |
| `/cloudwave/dev/mongo/uri`                      | **operator** (manual)  | events, registrations, notifications |
| `/cloudwave/dev/ses/fromEmail`                  | **operator** (manual)  | notifications               |

The two "operator (manual)" parameters are set once with `aws ssm put-parameter`
— see the root README for exact commands.
