// ============================================================================
// handlers/confirm.js  —  POST /auth/confirm
// ----------------------------------------------------------------------------
// Verifies the 6-digit code Cognito emailed during sign-up. After this,
// the user account is CONFIRMED and can be used to log in.
//
// Body: { email, code }
// ============================================================================

const {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

const { ok, badRequest, serverError } = require('../../../shared/response');

const cognito = new CognitoIdentityProviderClient({});

module.exports.handler = async (event) => {
  try {
    const { email, code } = JSON.parse(event.body || '{}');

    if (!email || !code) return badRequest('email and code are required');

    await cognito.send(new ConfirmSignUpCommand({
      ClientId: process.env.USER_POOL_CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
    }));

    return ok({ message: 'Account confirmed. You can now log in.' });
  } catch (err) {
    console.error('confirm error:', err);
    if (err.name === 'CodeMismatchException')       return badRequest('Incorrect confirmation code');
    if (err.name === 'ExpiredCodeException')        return badRequest('Code expired — request a new one');
    if (err.name === 'NotAuthorizedException')      return badRequest('User already confirmed');
    return serverError(err.message);
  }
};
