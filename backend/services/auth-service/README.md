# auth-service

Owns the Cognito User Pool and exposes three public HTTP endpoints for sign-up, confirmation, and login.

## Endpoints

| Method | Path             | Body                          | Description                             |
|--------|------------------|-------------------------------|-----------------------------------------|
| POST   | `/auth/register` | `{ email, password }`         | Creates Cognito user; sends 6-digit code|
| POST   | `/auth/confirm`  | `{ email, code }`             | Verifies the code                       |
| POST   | `/auth/login`    | `{ email, password }`         | Returns `idToken`, `accessToken`, `refreshToken` |

## SSM parameters published

- `/cloudwave/${stage}/cognito/userPoolId`
- `/cloudwave/${stage}/cognito/userPoolArn`
- `/cloudwave/${stage}/cognito/clientId`

## Deploy

```bash
npm install
npx serverless deploy --stage dev
```

## Notes

- Cognito automatically emails the confirmation code — no extra wiring needed.
- Password policy: min 8 chars, requires lowercase + a number. Edit in `serverless.yml`.
- Client uses `USER_PASSWORD_AUTH` flow (no secret) — appropriate for SPAs.
