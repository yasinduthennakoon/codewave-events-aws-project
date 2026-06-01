# Frontend

React 18 + Vite SPA. Talks to the five backend microservices over HTTPS and to Cognito directly for sign-up / sign-in.

## Local development

```bash
npm install
cp .env.example .env       # then fill in real values from your backend deploy
npm run dev                 # http://localhost:5173
```

### Where the .env values come from

After deploying the backend, run:

```bash
STAGE=dev

aws ssm get-parameter --name /cloudwave/$STAGE/cognito/userPoolId --query Parameter.Value --output text
aws ssm get-parameter --name /cloudwave/$STAGE/cognito/clientId   --query Parameter.Value --output text
```

The four HTTP API URLs are printed by `serverless deploy` for each service (look for the `endpoint:` line in the output). You can also retrieve them later:

```bash
cd backend/services/auth-service
npx serverless info --stage dev
```

## Production build

```bash
npm run build       # outputs to ./dist
```

Upload `dist/` to an S3 bucket and serve it through CloudFront for the public frontend. The `frontend-deploy.yml` GitHub Actions workflow does this automatically.

## Pages

| Route                  | Auth | What                                                  |
|------------------------|------|-------------------------------------------------------|
| `/`                    | —    | List of all events                                    |
| `/login`               | —    | Cognito login (USER_PASSWORD_AUTH)                    |
| `/register`            | —    | Sign-up + email-confirmation two-step                 |
| `/events/:id`          | —    | Event detail + "register for this event" button       |
| `/events/new`          | ✓    | Create event; uploads banner via pre-signed S3 URL    |
| `/my-registrations`    | ✓    | The signed-in user's registrations                    |

## How the API client picks a base URL

Each microservice has its own HTTP API endpoint. `src/api/client.js` keeps one base URL per service (`VITE_API_AUTH`, `VITE_API_EVENTS`, etc.) and routes each call to the right one. This is how a real microservice frontend would work — there is no single "backend URL".
