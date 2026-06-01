// ============================================================================
// auth/cognito.js
// ----------------------------------------------------------------------------
// All auth operations proxy through our backend auth-service (API Gateway →
// Lambda → Cognito). The browser never talks to Cognito directly, which keeps
// the Cognito client secret server-side and lets the backend enforce any
// additional business logic before or after each auth step.
// ============================================================================

const BASE = import.meta.env.VITE_API_AUTH;

// Shared POST helper — mirrors the pattern in api/client.js.
async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
  return data;
}

// ---- sign up ---------------------------------------------------------------
// Calls POST /auth/register → backend creates the Cognito user and triggers
// the verification email with a 6-digit code.
export function signUp(email, password) {
  return post('/auth/register', { email, password });
}

// ---- confirm sign-up with the 6-digit code ---------------------------------
// Calls POST /auth/confirm → backend calls Cognito ConfirmSignUp.
export function confirmSignUp(email, code) {
  return post('/auth/confirm', { email, code });
}

// ---- sign in ---------------------------------------------------------------
// Calls POST /auth/login → backend calls Cognito InitiateAuth and returns the
// three JWTs. We attach email (known from the form) so AuthContext can store
// it alongside the token without needing to decode the JWT.
export async function signIn(email, password) {
  const tokens = await post('/auth/login', { email, password });
  return { ...tokens, email };
}

// ---- sign out --------------------------------------------------------------
// Session is client-side only (JWT in localStorage). No server call needed.
export function signOut() {}
