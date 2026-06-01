# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**CloudWave Events Platform** — a teaching project for an AWS Serverless Bootcamp. It is a minimal, full-stack event-management application built with a serverless microservice backend on AWS and a React frontend. The codebase is intentionally simple: the goal is to **showcase AWS services**, not production-grade features.

## Architecture

This is a **monorepo** with two top-level workspaces:

- `backend/` — Node.js Lambda functions, organized as **5 independent Serverless Framework v3 services** (microservices). Each service has its own `serverless.yml` and deploys independently.
- `frontend/` — React + Vite SPA that consumes the backend HTTP APIs.

### Backend microservices

| Service                  | Owns                                                       | HTTP Routes                                       |
|--------------------------|------------------------------------------------------------|---------------------------------------------------|
| `auth-service`           | Cognito User Pool, Cognito App Client                      | `POST /auth/register`, `/auth/confirm`, `/auth/login` |
| `events-service`         | Event CRUD against MongoDB                                 | `GET/POST/PUT/DELETE /events`                     |
| `registrations-service`  | Event registrations; writes to MongoDB + enqueues SQS msg  | `POST /events/{id}/register`, `GET /my-registrations` |
| `files-service`          | S3 bucket + CloudFront distribution; issues pre-signed URLs| `POST /files/presigned-url`                       |
| `notifications-service`  | SQS queue (consumer), EventBridge daily schedule, SES sender | none (event-driven only)                       |

### Cross-service contracts

Services do NOT import each other's code. They share **only ARNs and IDs**, published via **SSM Parameter Store** under `/cloudwave/${stage}/`. For example:

- `auth-service` publishes `/cloudwave/${stage}/cognito/userPoolId`, `/cognito/userPoolArn`, `/cognito/clientId`.
- `notifications-service` publishes `/cloudwave/${stage}/sqs/registrationQueueUrl`, `/sqs/registrationQueueArn`.
- `files-service` publishes `/cloudwave/${stage}/s3/uploadsBucket`, `/cloudfront/domain`.

Consumer services read these at deploy time using `${ssm:/path}` in `serverless.yml`.

### Deployment order

Services have a dependency graph. Deploy in this order on first deploy:

1. `auth-service` (publishes Cognito IDs)
2. `notifications-service` (publishes SQS ARN; safe to deploy before having producers)
3. `files-service` (publishes bucket + CloudFront)
4. `events-service` (consumes Cognito ARN for JWT authorizer)
5. `registrations-service` (consumes Cognito ARN + SQS ARN)

After the first deploy, any service can be redeployed independently as long as its consumed parameters still exist.

## Tech Stack

- **Runtime**: Node.js 20.x on AWS Lambda
- **API**: AWS HTTP API (NOT REST API) — v2 payload, JWT authorizer built in
- **IaC**: Serverless Framework v3 (one stack per microservice)
- **Database**: MongoDB Atlas (connection string in SSM)
- **Auth**: AWS Cognito User Pool (USER_PASSWORD_AUTH flow)
- **Storage**: S3 + CloudFront (pre-signed PUT for uploads, public read via CloudFront)
- **Email**: AWS SES (sandbox by default — verify sender & test recipient emails)
- **Async**: SQS (registration confirmation pipeline)
- **Scheduling**: EventBridge (daily rule → Lambda for reminder emails)
- **Secrets**: SSM Parameter Store (kept simple; switchable to Secrets Manager)
- **Logging**: CloudWatch Logs (auto-enabled by Lambda)
- **CI/CD**: GitHub Actions (deploy each service on push to `main`)
- **Frontend**: React 18 + Vite + React Router + amazon-cognito-identity-js

## Code Conventions

- **One handler per file** inside `services/<name>/handlers/`. Filename = function name.
- Handlers use **CommonJS** (`module.exports.handler = ...`) — easier with serverless-framework defaults.
- Frontend uses **ES Modules** (`import`/`export`) via Vite.
- **Comments are educational**, not just descriptive. Explain *why* an AWS-specific pattern is used (e.g. "we cache the Mongo client outside the handler so the connection survives between Lambda warm invocations").
- HTTP responses use a single helper `backend/shared/response.js` with `ok()`, `created()`, `badRequest()`, `unauthorized()`, `notFound()`, `serverError()`.
- MongoDB connection uses the **connection-caching pattern** in `backend/shared/db.js`.
- No TypeScript. No bundler for backend (raw Node, dependencies installed per-service).
- All IAM permissions are **per-function** in `serverless.yml` under `iamRoleStatements` or `provider.iam.role.statements`.

## Common Commands

### Initial setup
```bash
# Install root + workspace dependencies
npm install

# Seed required SSM parameters (Mongo URI, SES sender, JWT secret)
# See backend/README.md for the exact parameter names.
```

### Deploy a single backend service
```bash
cd backend/services/auth-service
npx serverless deploy --stage dev
```

### Deploy all backend services (in order)
```bash
npm run deploy:backend  # runs the deploy-order script
```

### Run frontend locally
```bash
cd frontend
npm run dev
```

### Frontend build + deploy to S3/CloudFront (optional)
```bash
cd frontend
npm run build
aws s3 sync dist/ s3://<frontend-bucket> --delete
```

## Things to Watch Out For

1. **SES sandbox mode**: by default SES only sends to verified addresses. Either verify recipient emails in the SES console or request production access.
2. **MongoDB Atlas IP allowlist**: since we use no VPC, Lambdas come from many random AWS IPs. Set the Atlas Network Access to `0.0.0.0/0` for the demo, or use Atlas's AWS PrivateLink in production.
3. **Cognito email verification**: the user pool is configured to require email confirmation. The `POST /auth/confirm` endpoint takes the code Cognito emails after sign-up.
4. **CloudFront propagation**: first `files-service` deploy may take 5–10 minutes for the CloudFront distribution to come up.
5. **Region**: everything is hardcoded to `us-east-1`. To change, update each `serverless.yml` and the frontend's Cognito config.
6. **HTTP API CORS**: configured to `*` for the demo — lock down for real deployments.
7. **First-time SSM parameter writes**: services need permission to write to `/cloudwave/*`. This is set up in each `serverless.yml`.

## File-Tree Map

```
cloudwave-events-platform/
├── CLAUDE.md                       <- you are here
├── README.md                       <- top-level docs for humans
├── package.json                    <- workspace root (orchestrates deploys)
├── .github/workflows/              <- CI/CD
├── docs/architecture.md            <- text-based architecture diagram + notes
├── backend/
│   ├── shared/                     <- code copied into each service (db.js, response.js)
│   └── services/
│       ├── auth-service/
│       ├── events-service/
│       ├── registrations-service/
│       ├── files-service/
│       └── notifications-service/
└── frontend/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api/client.js           <- fetch wrapper that injects JWT
        ├── auth/                   <- Cognito login glue
        ├── pages/                  <- one file per route
        └── components/
```

## When Adding New Features

- A new HTTP endpoint goes in the **smallest service that owns the relevant data**. Don't add new microservices casually — the split above is deliberate.
- A new background job goes in `notifications-service` if it's email/notification-related, otherwise create a new function under whichever service owns the trigger.
- Anything that needs a secret reads it from SSM at cold start (see `backend/shared/db.js` for the pattern).

## Demoing This to Students

Suggested talk-track order for a recorded demo:

1. Architecture diagram (`docs/architecture.md`).
2. Show the 5 `serverless.yml` files — point out each AWS service.
3. Walk through one full flow: user registers → confirms → logs in → browses events → creates an event → uploads a banner via pre-signed URL → another user registers for the event → SQS message → confirmation email.
4. Show the EventBridge schedule firing (you can manually invoke `notifications-service` → `sendReminders` to demo without waiting 24h).
5. Show CloudWatch Logs for each service.
6. Push a tiny change to `main` and let GitHub Actions deploy it live.
