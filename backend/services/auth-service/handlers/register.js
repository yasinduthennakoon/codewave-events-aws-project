// ============================================================================
// handlers/register.js  —  POST /auth/register
// ----------------------------------------------------------------------------
// Calls Cognito SignUp. Cognito then emails the user a 6-digit confirmation
// code. The user must call /auth/confirm with that code before they can log in.
//
// Body: { email, password }
// ============================================================================

const {
  CognitoIdentityProviderClient,
  SignUpCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

const { ok, badRequest, serverError } = require('../../../shared/response');

const cognito = new CognitoIdentityProviderClient({});

module.exports.handler = async (event) => {
  try {
    const { email, password } = JSON.parse(event.body || '{}');

    if (!email || !password) {
      return badRequest('email and password are required');
    }

    // SignUp: creates the user in the "UNCONFIRMED" state and triggers the
    // verification email. We use the email as the Cognito username.
    await cognito.send(new SignUpCommand({
      ClientId: process.env.USER_POOL_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
      ],
    }));

    return ok({
      message: 'User created. Check your email for the confirmation code.',
      email,
    });
  } catch (err) {
    // Cognito throws typed errors — map common ones to 400 so clients can react.
    console.error('register error:', err);
    if (err.name === 'UsernameExistsException')   return badRequest('Email already registered');
    if (err.name === 'InvalidPasswordException')  return badRequest(err.message);
    if (err.name === 'InvalidParameterException') return badRequest(err.message);
    return serverError(err.message);
  }
};
