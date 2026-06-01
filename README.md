# CloudWave Events Platform

A minimal, end-to-end **serverless event-management application** built as a teaching example for an AWS Serverless Bootcamp. The codebase is deliberately small and heavily commented — the point is to **demonstrate AWS services**, not to ship a polished product.

## Stack at a glance

| Layer            | Technology                                                                  |
|------------------|-----------------------------------------------------------------------------|
| Frontend         | React 18 + Vite + React Router                                              |
| Auth             | AWS Cognito (User Pool, USER_PASSWORD_AUTH)                                 |
| Backend          | AWS Lambda (Node.js 20.x) — 5 independent microservices                     |
| API              | AWS HTTP API (v2) with built-in Cognito JWT authorizer                      |
| Database         | MongoDB Atlas                                                               |
| File storage     | S3 (pre-signed PUT uploads) + CloudFront (CDN delivery)                     |
| Email            | AWS SES                                                                     |
| Async processing | SQS (registration confirmation pipeline)                                    |
| Scheduling       | EventBridge (daily reminder cron)                                           |
| Secrets/config   | SSM Parameter Store                                                         |
| Logging          | CloudWatch Logs                                                             |
| IaC              | Serverless Framework v3                                                     |
| CI/CD            | GitHub Actions                                                              |

## Repository layout

```
cloudwave-events-platform/
├── backend/
│   ├── shared/                            # code copied into each service
│   └── services/
│       ├── auth-service/                  # Cognito + register/confirm/login
│       ├── events-service/                # Event CRUD
│       ├── registrations-service/         # Register for event + SQS producer
│       ├── files-service/                 # S3 + CloudFront + pre-signed URLs
│       └── notifications-service/         # SQS consumer + EventBridge schedule
├── frontend/                              # React + Vite SPA
├── .github/workflows/                     # CI/CD pipelines
├── docs/architecture.md                   # Architecture diagram
├── CLAUDE.md                              # Guidance for Claude Code agents
└── README.md
```

Each backend service is an **independent Serverless stack**. They share contracts only via SSM Parameter Store under `/cloudwave/${stage}/`.

## Prerequisites

- Node.js 20+
- AWS CLI configured with credentials that can create IAM roles, Lambda, API Gateway, Cognito, S3, CloudFront, SQS, EventBridge, SES, and SSM resources
- MongoDB Atlas cluster (free M0 is fine)
- An email address you've verified in AWS SES (for the `FROM` address)
- For the demo, verify each test user's email in SES too (SES sandbox restriction)

## One-time setup

### 1. Set SSM parameters

The services read these at deploy time. Set them once per stage:

```bash
STAGE=dev

aws ssm put-parameter --name "/cloudwave/$STAGE/mongo/uri" \
  --value "mongodb+srv://USER:PASS@cluster.mongodb.net/cloudwave?retryWrites=true&w=majority" \
  --type SecureString --overwrite

aws ssm put-parameter --name "/cloudwave/$STAGE/ses/fromEmail" \
  --value "noreply@yourdomain.com" \
  --type String --overwrite
```

### 2. Install dependencies

```bash
npm install                                  # root
cd backend && npm install                    # backend workspace
cd ../frontend && npm install                # frontend
# each service has its own deps too:
cd ../backend/services/auth-service && npm install
# repeat for events-service, registrations-service, files-service, notifications-service
```

### 3. Deploy backend (first-time order matters)

```bash
cd backend/services/auth-service && npx serverless deploy --stage dev
cd ../notifications-service && npx serverless deploy --stage dev
cd ../files-service && npx serverless deploy --stage dev
cd ../events-service && npx serverless deploy --stage dev
cd ../registrations-service && npx serverless deploy --stage dev
```

A helper script `npm run deploy:backend` does this in order.

### 4. Configure frontend

After the auth-service deploys, copy the Cognito IDs into `frontend/.env`:

```bash
cd frontend
cp .env.example .env
# Edit .env with the values from `aws ssm get-parameter --name /cloudwave/dev/cognito/...`
npm run dev
```

## How the AWS services connect (5-minute mental model)

1. **User signs up** → frontend calls `POST /auth/register` → auth-service Lambda calls Cognito `SignUp` → Cognito emails a 6-digit code.
2. **User confirms** → `POST /auth/confirm` → Cognito `ConfirmSignUp`.
3. **User logs in** → `POST /auth/login` → Cognito `InitiateAuth` → returns JWT.
4. **Frontend stores JWT** and attaches it to every protected request as `Authorization: Bearer ...`.
5. **HTTP API Gateway** validates the JWT against the Cognito User Pool *before* invoking the Lambda — no code needed.
6. **Event create with banner**:
   - Frontend asks `POST /files/presigned-url` → files-service returns a pre-signed S3 PUT URL.
   - Frontend uploads the file directly to S3 (Lambda never sees the bytes).
   - Frontend calls `POST /events` with the CloudFront URL of the uploaded file.
7. **Register for event**:
   - `POST /events/{id}/register` → registrations-service writes to Mongo, then `SendMessage` to SQS.
   - SQS triggers a Lambda in notifications-service → SES sends a confirmation email.
8. **Daily reminders**:
   - EventBridge rule fires every morning → invokes notifications-service `sendReminders` Lambda → finds tomorrow's events → SES emails registered users.

## Deliverables checklist (from the bootcamp spec)

- [x] Deployed application (frontend + backend)
- [x] Source code on GitHub
- [x] Architecture diagram → `docs/architecture.md`
- [x] README with setup instructions, API endpoints, architecture explanation
- [x] CI/CD pipeline → `.github/workflows/`
- [x] EventBridge integration → `notifications-service/handlers/sendReminders.js`
- [x] SQS integration (bonus) → `registrations-service` → `notifications-service/handlers/processRegistrationQueue.js`

## API Endpoints

All under `https://<api-id>.execute-api.us-east-1.amazonaws.com`.

| Method | Path                              | Auth | Service                |
|--------|-----------------------------------|------|------------------------|
| POST   | `/auth/register`                  | —    | auth-service           |
| POST   | `/auth/confirm`                   | —    | auth-service           |
| POST   | `/auth/login`                     | —    | auth-service           |
| GET    | `/events`                         | —    | events-service         |
| GET    | `/events/{id}`                    | —    | events-service         |
| POST   | `/events`                         | JWT  | events-service         |
| PUT    | `/events/{id}`                    | JWT  | events-service         |
| DELETE | `/events/{id}`                    | JWT  | events-service         |
| POST   | `/events/{id}/register`           | JWT  | registrations-service  |
| GET    | `/my-registrations`               | JWT  | registrations-service  |
| POST   | `/files/presigned-url`            | JWT  | files-service          |

## License

MIT — use freely for teaching.
