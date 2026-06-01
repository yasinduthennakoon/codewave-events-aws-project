# events-service

Event CRUD against MongoDB. Public reads, JWT-protected writes (owner-only for update/delete).

## Endpoints

| Method | Path             | Auth | Body                                          |
|--------|------------------|------|-----------------------------------------------|
| GET    | `/events`        | —    | —                                             |
| GET    | `/events/{id}`   | —    | —                                             |
| POST   | `/events`        | JWT  | `{ title, description, date, bannerUrl? }`    |
| PUT    | `/events/{id}`   | JWT  | any subset of the above (owner only)          |
| DELETE | `/events/{id}`   | JWT  | — (owner only; also deletes its registrations)|

## SSM parameters consumed

- `/cloudwave/${stage}/cognito/userPoolId`
- `/cloudwave/${stage}/cognito/clientId`
- `/cloudwave/${stage}/mongo/uri` (read at runtime)

## Deploy

```bash
npm install
npx serverless deploy --stage dev
```

## Notes

- JWT validation is done by HTTP API Gateway natively — Lambdas only see authenticated requests for protected routes.
- `event.ownerSub` is set from the Cognito `sub` claim; this is what update/delete check.
