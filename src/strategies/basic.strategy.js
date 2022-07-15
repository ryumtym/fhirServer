const { BasicStrategy } = require('passport-http');

module.exports.strategy = new BasicStrategy((username, password, done) => {
    console.log(username,password)
	if (username === 'user' && password === 'pass') {
		return done(null, {});
	} else {
		return done(new Error('Invalid Username/Password'));
	}
});