const Strategy = require('passport-http-bearer').Strategy;
const request = require('superagent');
const env = require('var');

/**
 * Bearer Strategy
 *
 * This strategy will handle requests with BearerTokens.  This is only a template and should be configured to
 * your AuthZ server specifications.
 *
 * Requires ENV variables for introspecting the tokenz
 * customize for node-oidc-provider
 */
module.exports.strategy = new Strategy(function (token, done) {
  if (!env.INTROSPECTION_URL) {
    return done(new Error('Invalid introspection endpoint.'));
  }

  request
    .post(process.env.INTROSPECTION_URL)
    .set('content-type', 'application/x-www-form-urlencoded')
    // .send({ token: token, client_id: process.env.CLIENT_ID,  client_secret: process.env.CLIENT_SECRET})
    .send({ token: token, client_id: process.env.CLIENT_ID})
    .then((introspectionResponse) => {
      const decoded_token = introspectionResponse.body;
      // console.log(token)
      // console.log(process.env.CLIENT_ID)
      // console.log(decoded_token);

      if (decoded_token.active) {
        // TODO: context could come in many forms, you need to decide how to handle it.
        // it could also be decodedToken.patient etc...
        let { scope, context, sub, user_id } = decoded_token;
        let user = { user_id, sub };

        // return scopes and context.  Both required
        return done(null, user, { scope, context });
      }
      // default return unauthorized
      return done(new Error('Invalid token'));
    });
});
