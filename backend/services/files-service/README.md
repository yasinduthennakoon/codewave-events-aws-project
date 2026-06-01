# files-service

Owns the S3 uploads bucket and the CloudFront distribution that fronts it. One endpoint mints pre-signed PUT URLs.

## Endpoints

| Method | Path                       | Auth | Body                            |
|--------|----------------------------|------|---------------------------------|
| POST   | `/files/presigned-url`     | JWT  | `{ filename, contentType }`     |

Returns:

```json
{
  "uploadUrl":  "https://s3.amazonaws.com/...?X-Amz-Signature=...",
  "publicUrl":  "https://d1xyz.cloudfront.net/uploads/<sub>/<uuid>-banner.png",
  "key":        "uploads/<sub>/<uuid>-banner.png",
  "expiresIn":  300
}
```

The browser then `PUT`s the file bytes to `uploadUrl` with a matching `Content-Type` header.

## SSM parameters published

- `/cloudwave/${stage}/s3/uploadsBucket`
- `/cloudwave/${stage}/cloudfront/domain`

## SSM parameters consumed

- `/cloudwave/${stage}/cognito/userPoolId`
- `/cloudwave/${stage}/cognito/clientId`

## Deploy

```bash
npm install
npx serverless deploy --stage dev
```

## Notes

- Bucket is **private** — all reads go through CloudFront via Origin Access Control.
- First deploy can take 5–10 min while CloudFront propagates.
- URL expires in 5 minutes. Tune `URL_EXPIRY_SECONDS` in the handler if needed.
- Object keys are namespaced per user-sub (`uploads/<sub>/<uuid>-<name>`) so users cannot overwrite each other.
