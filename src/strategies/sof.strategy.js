const smartBearerStrategy = require('@asymmetrik/sof-strategy');

module.exports.strategy = smartBearerStrategy({
	introspectionUrl: process.env.INTROSPECTION_URL,
	clientId: process.env.CLIENT_ID,
	clientSecret: process.env.CLIENT_SECRET,
});