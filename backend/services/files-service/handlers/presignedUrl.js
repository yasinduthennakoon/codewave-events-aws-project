// ============================================================================
// handlers/presignedUrl.js  —  POST /files/presigned-url  (JWT required)
// ----------------------------------------------------------------------------
// Mints a pre-signed S3 PUT URL the browser can use to upload directly to S3.
// Returns both:
//   - uploadUrl   → PUT to this URL with the file bytes within 5 min
//   - publicUrl   → the CloudFront URL where the file will be readable
//
// Body: { filename, contentType }
// Example response:
//   {
//     uploadUrl: "https://s3.amazonaws.com/...?X-Amz-Signature=...",
//     publicUrl: "https://d12345.cloudfront.net/uploads/<user-sub>/<uuid>-banner.png",
//     key: "uploads/<user-sub>/<uuid>-banner.png"
//   }
// ============================================================================

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { randomUUID } = require('crypto');

const { getUser } = require('../shared/auth');
const { ok, badRequest, unauthorized, serverError } = require('../shared/response');

const s3 = new S3Client({});

// 5-minute window — long enough for slow uploads, short enough to limit abuse.
const URL_EXPIRY_SECONDS = 300;

module.exports.handler = async (event) => {
  try {
    const user = getUser(event);
    if (!user) return unauthorized();

    const { filename, contentType } = JSON.parse(event.body || '{}');
    if (!filename || !contentType) {
      return badRequest('filename and contentType are required');
    }

    // Scope object keys per user-sub for tidiness + simple ownership semantics.
    // Prepend a UUID so users can't overwrite each other's files even if
    // they pick identical filenames.
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `uploads/${user.sub}/${randomUUID()}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.UPLOADS_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: URL_EXPIRY_SECONDS });
    const publicUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;

    return ok({ uploadUrl, publicUrl, key, expiresIn: URL_EXPIRY_SECONDS });
  } catch (err) {
    console.error('presigned-url error:', err);
    return serverError(err.message);
  }
};
