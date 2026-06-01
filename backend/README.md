# Backend

5 independent Serverless Framework v3 stacks. Each one deploys on its own.

## Layout

```
backend/
├── shared/                          ← copied into each service's package
│   ├── db.js                        ← MongoDB connection + caching pattern
│   ├── response.js                  ← HTTP response helpers (CORS-enabled)
│   └── auth.js                      ← extracts user info from JWT authorizer claims
└── services/
    ├── auth-service/                ← Cognito + auth HTTP endpoints
    ├── events-service/              ← Event CRUD
    ├── registrations-service/       ← Registration HTTP endpoints + SQS producer
    ├── files-service/               ← S3 + CloudFront + pre-signed URLs
    └── notifications-service/       ← SQS consumer + EventBridge schedule
```

Each service's `serverless.yml` references `../../shared/**` in `package.patterns`, which means **the shared folder is copied into the deployed Lambda zip**. No symlinks, no monorepo magic — just files.

## Deploy order (first time only)

```bash
cd backend/services/auth-service          && npx serverless deploy --stage dev
cd ../notifications-service               && npx serverless deploy --stage dev
cd ../files-service                       && npx serverless deploy --stage dev
cd ../events-service                      && npx serverless deploy --stage dev
cd ../registrations-service               && npx serverless deploy --stage dev
```

Or use the helper:

```bash
cd <repo root>
bash scripts/deploy-backend.sh dev
```

After the first deploy, services can be redeployed in any order.

## Adding a new endpoint

1. Pick the smallest service that owns the relevant data.
2. Add a new file in `handlers/`.
3. Register it in the same service's `serverless.yml` under `functions:`.
4. Add an `httpApi` event (with or without the `cognitoAuthorizer`).
5. Redeploy that one service.
