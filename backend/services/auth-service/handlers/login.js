// ============================================================================
// handlers/login.js  —  POST /auth/login
// ----------------------------------------------------------------------------
// Exchanges email + password for three JWTs from Cognito:
//   - IdToken      → identity claims (email, sub). This is what API Gateway
//                    validates as the JWT authorizer.
//   - AccessToken  → for calling Cognito's own APIs (we don't use this here).
//   - RefreshToken → exchange for a new IdToken when it expires (~1h later).
//
// Body: { email, password }
// ============================================================================

const {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

const { ok, badRequest, unauthorized, serverError } = require('../shared/response');

const cognito = new CognitoIdentityProviderClient({});

module.exports.handler = async (event) => {
  try {
    const { email, password } = JSON.parse(event.body || '{}');

    if (!email || !password) return badRequest('email and password are required');

    const res = await cognito.send(new InitiateAuthCommand({
      ClientId: process.env.USER_POOL_CLIENT_ID,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    }));

    // res.AuthenticationResult contains the three tokens.
    return ok({
      idToken:      res.AuthenticationResult.IdToken,
      accessToken:  res.AuthenticationResult.AccessToken,
      refreshToken: res.AuthenticationResult.RefreshToken,
      expiresIn:    res.AuthenticationResult.ExpiresIn,
    });
  } catch (err) {
    console.error('login error:', err);
    if (err.name === 'NotAuthorizedException') return unauthorized('Incorrect email or password');
    if (err.name === 'UserNotConfirmedException') return badRequest('Please confirm your email first');
    if (err.name === 'UserNotFoundException') return unauthorized('Incorrect email or password');
    return serverError(err.message);
  }
};
