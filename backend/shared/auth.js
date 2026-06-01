// ============================================================================
// backend/shared/auth.js
// ----------------------------------------------------------------------------
// When HTTP API Gateway validates a JWT (via its built-in Cognito JWT authorizer),
// it places the decoded claims into `event.requestContext.authorizer.jwt.claims`.
//
// This helper extracts the bits we typically need: the Cognito user `sub`
// (a permanent UUID for the user) and their email.
// ============================================================================

function getUser(event) {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  if (!claims) return null;
  return {
    sub:   claims.sub,        // Cognito user ID — use this everywhere as foreign key
    email: claims.email,      // present because we requested the `email` scope
  };
}

module.exports = { getUser };
