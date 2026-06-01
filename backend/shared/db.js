// ============================================================================
// backend/shared/db.js
// ----------------------------------------------------------------------------
// MongoDB connection helper for Lambda.
//
// WHY THIS PATTERN?
//   Every cold-start of a Lambda costs ~100-500ms to set up a Mongo connection.
//   AWS Lambda freezes the container between invocations and reuses it for
//   subsequent ("warm") invocations. By declaring `cachedClient` *outside* the
//   handler function, we keep the connection alive across invocations on the
//   same container — Mongo only reconnects on a cold start.
//
//   Also: in serverless.yml we set `context.callbackWaitsForEmptyEventLoop=false`
//   so the open Mongo socket does NOT keep the Lambda alive after we respond.
// ============================================================================

const { MongoClient } = require('mongodb');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

// Module-level cache: survives across warm invocations on the same container.
let cachedClient = null;
let cachedUri = null;

const ssm = new SSMClient({});

/**
 * Reads the Mongo connection string from SSM Parameter Store (SecureString).
 * Cached after first call.
 */
async function getMongoUri() {
  if (cachedUri) return cachedUri;

  const stage = process.env.STAGE || 'dev';
  const paramName = `/cloudwave/${stage}/mongo/uri`;

  const res = await ssm.send(new GetParameterCommand({
    Name: paramName,
    WithDecryption: true, // SecureString
  }));

  cachedUri = res.Parameter.Value;
  return cachedUri;
}

/**
 * Returns a connected MongoClient. Lazy + cached.
 */
async function getDb() {
  if (cachedClient) {
    return cachedClient.db(); // uses DB name from URI
  }

  const uri = await getMongoUri();

  // Connection options tuned for Lambda: shorter timeouts, no buffering.
  cachedClient = new MongoClient(uri, {
    maxPoolSize: 5,                 // Lambda containers are small; keep pool tight
    serverSelectionTimeoutMS: 5000, // fail fast on misconfig
  });

  await cachedClient.connect();
  return cachedClient.db();
}

module.exports = { getDb };
