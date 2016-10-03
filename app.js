// global imports
var fs = require('fs.extra');
var path = require('path');
var bodyparser = require('body-parser')

// create application
var express = require('express');
app = express();
// set directory
app.dir = __dirname;
// set configuration
app.config = JSON.parse(fs.readFileSync('placing/config.json', 'utf8'));
// set logger
app.logger = require(path.join(app.dir, app.config['base-dir'], app.config['logger-code']));
// set database
app.database = require(path.join(app.dir, app.config['base-dir'], app.config['db-code']));
// set emailer
app.emailer = require(path.join(app.dir, app.config['base-dir'], app.config['email-code']));
// support parameter encodings
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
// set view rendering engine
app.set('view engine', 'pug');
// set view pages
app.set('views', path.join(app.dir, app.config['base-dir'], app.config['views-dir']));
app.use(express.static(path.join(app.dir, path.join(app.config['base-dir'], 'public'))));
var views = require(path.join(app.dir, app.config['base-dir'], app.config['views-code']));
app.use('/', views);

// 404 error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});
// default error handler depends on the environment
app.set('env', app.config["server-env"]);
if (app.get('env') == 'development') {
	// development mode prints stack trace
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render('response', {
			message: err.message,
			error: err
		});
		app.logger.error(err.status + ": " + err.message);
	});
} else {
	// production mode does not print stack trace to the user
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render('response', {
			message: "",
			error: {}
		});
		app.logger.error(err.status + ": " + err.message);
	});
}

// export the module
module.exports = app;
