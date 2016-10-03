// global imports
var fs = require('fs.extra');
var multer = require('multer');
var path = require('path');
var childprocess = require('child_process');
var router = require('express').Router();

// request for home page
router.get('/', function(req, res, next) {
	app.logger.debug('home page request received');
	return res.render('home');
});

// request for registration page
router.get('/add', function(req, res, next) {
	app.logger.debug('add registration page request received');
	return res.render('registration-add');
});

// request for adding a new registration
router.post('/add', function(req, res, next) {
	// get registration details
	var name = req.body.name;
	var email = req.body.email;
	app.logger.debug('add registration request received (name=' + name + ', email=' + email + ')');
	// add the registration to the database
	app.database.addUser(name, email, function(err, ret) {
		if (err)
			return res.render('response', { title: err.title, message: err.message });
		// notify the user by email if we're running in production
		if (app.config["server-env"] == 'production') {
			var fromName = app.config['email-name'];
			var fromAddress = app.config['email-address'];
			var fromPassword = app.config['email-password'];
			var fromServer = app.config['email-server'];
			var toName = name;
			var toAddress = email;
			var subject = 'Tag and Caption Prediction Challenge 2016 - Leaderboard registration';
			var text = fs.readFileSync(path.join(app.dir, app.config['base-dir'], app.config['email-dir'], app.config['email-registration-text']), 'utf8').replace('$token', ret.token).replace('$toName', toName).replace('$fromName', fromName).replace('$fromAddress', fromAddress);
			var html = fs.readFileSync(path.join(app.dir, app.config['base-dir'], app.config['email-dir'], app.config['email-registration-html']), 'utf8').replace('$token', ret.token).replace('$toName', toName).replace('$fromName', fromName).replace('$fromAddress', fromAddress);
			app.emailer.send(fromName, fromAddress, fromPassword, fromServer, toName, toAddress, subject, text, html, function(err, ret) {
				// whether or not the email was successfully sent, we don't have to do anything here, nor
				// can we do anything at this time. the token will also be shown on screen - the worst that
				// happened was that the email couldn't get sent or ended up in the user's spam box.
			});
		}
		return res.render('response', { title: ret.title, message: ret.message});
	});
});

// request for update registration page
router.get('/update', function(req, res, next) {
	app.logger.debug('update registration page request received');
	return res.render('registration-update');
});

// request for updating an existing registration
router.post('/update', function(req, res, next) {
	// get registration details
	var name = req.body.name;
	var email = req.body.email;
	var token = req.body.token;
	app.logger.debug('update registration request received (name=' + name + ', email=' + email + ', token=' + token + ')');
	// update the registration in the database
	app.database.updateUser(name, email, token, function(err, ret) {
		if (err)
			return res.render('response', { title: err.title, message: err.message });
		return res.render('response', { title: ret.title, message: ret.message});
	});
});

// request for unregistration page
router.get('/remove', function(req, res, next) {
	app.logger.debug('remove registration page request received');
	return res.render('registration-remove');
});

// request for removing an existing registration
router.post('/remove', function(req, res, next) {
	// get registration details
	var name = req.body.name;
	var email = req.body.email;
	var token = req.body.token;
	app.logger.debug('remove registration request received (name=' + name + ', email=' + email + ', token=' + token + ')');
	// remove the registration from the database
	app.database.removeUser(name, email, token, function(err, ret) {
		if (err)
			return res.render('response', { title: err.title, message: err.message });
		return res.render('response', { title: ret.title, message: ret.message});
	});
});

// request for submission page
router.get('/submit', function(req, res, next) {
	app.logger.debug('submission page request received');
	return res.render('submit');
});

// request for tag prediction leaderboard
router.get('/tag', function(req, res, next) {
	app.logger.debug('tag leaderboard page request received');
	// prepare leaderboard variables
	var title = 'Leaderboard - tag prediction subtask';
	var description = 'The top 10 submitted runs are shown, ranked by precision from high to low.';
	var score1 = 'Precision';
	var score2 = 'Recall';
	var score3 = 'Accuracy';
	// get leaderboard
	app.database.getLeaderboard('tag', 'DESC', 10, function(err, ret) {
		if (err)
			return res.render('leaderboard-tag', { title: title, description: description, score1: score1, score2: score2, score3: score3, valid: [], active: [], invalid: [] });
		return res.render('leaderboard-tag', { title: title, description: description, score1: score1, score2: score2, score3: score3, valid: ret.valid, active: ret.active, invalid: ret.invalid });
	});
});

// request for caption prediction leaderboard
router.get('/caption', function(req, res, next) {
	app.logger.debug('caption leaderboard page request received');
	// prepare leaderboard variables
	var title = 'Leaderboard - caption prediction subtask';
	var description = 'The top 10 submitted runs are shown, ranked by BLEU score from high to low.';
	var score1 = 'BLEU';
	// get leaderboard
	app.database.getLeaderboard('caption', 'DESC', 10, function(err, ret) {
		if (err)
			return res.render('leaderboard-caption', { title: title, description: description, score1: score1, valid: [], active: [], invalid: [] });
		return res.render('leaderboard-caption', { title: title, description: description, score1: score1, valid: ret.valid, active: ret.active, invalid: ret.invalid });
	});
});

// request for uploading a submission
// note: submitted runs are sent by post request, and post-upload validation checks mean
//       that useless uploads might occur (needs fixing)
// note: create the uploads directory first
try {
	app.logger.debug('opening uploads directory at ' + path.join(app.dir, app.config['base-dir'], app.config['upload-dir']));
	fs.mkdirpSync(path.join(app.dir, app.config['base-dir'], app.config['upload-dir']));
} catch (err) {
	app.logger.error('could not create uploads directory: ' + err);
}
var storage = multer.diskStorage({
	destination: function (req, file, callback) {
    	callback(null, path.join(app.dir, app.config['base-dir'], app.config['upload-dir']))
	},
	filename: function (req, file, callback) {
		callback(null, req.body.token + '-' + Date.now() + '.txt');
	}
});
var upload = multer({
	storage: storage
});
router.post('/submission', upload.single('run'), function (req, res, next) {
	// get submission details
	var token = req.body.token;
	var timestamp = path.parse(req.file.path).name.split('-')[1];
	var description = req.body.description.trim();
	var run = req.file.path;
	var subtask = req.body.subtask;
	app.logger.debug('run submission uploaded (token=' + token + ', timestamp=' + timestamp + ', run=' + run + ', subtask=' + subtask + ')');
	// check token
	app.database.existsToken(token, function(err, ret) {
		if (err) {
			// delete the file
			fs.unlinkSync(run);
			return res.render('response', { title: err.title, message: err.message });
		}
		// check if submission is allowed
		app.database.checkTimestamp(token, timestamp, subtask, function(err, ret) {
			if (err) {
				// delete the file
				fs.unlinkSync(run);
				return res.render('response', { title: err.title, message: err.message });
			}
			// get user's name and email
			app.database.getUser(token, function(err, ret) {
				if (err) {
					// delete the file
					fs.unlinkSync(run);
					return res.render('response', { title: err.title, message: err.message });
				}
				var name = ret.name;
				var email = ret.email;
				// add the basic details for the run
				app.database.addRun(token, timestamp, subtask, description, function(err, ret) {
					if (err) {
						// delete the file
						fs.unlinkSync(run);
						return res.render('response', { title: err.title, message: err.message });
					}
					// evaluate the submission in the background
					app.logger.debug('starting child process to evaluate submission ' + run);
					var child = childprocess.fork(path.join(app.dir, app.config['base-dir'], app.config['eval-code']), [], { });
		  			child.on('message', function (message) {
						// check if we received a progress update
						if (message.progress != null) {
							app.database.updateRun(token, timestamp, 0, subtask, null, null, null, message.progress, function(err, ret) {
								// no need to do anything
							});
							return;
						}
						// the submission has been processed
						var state = message.error ? -1 : 1;
						var score1 = message.error ? null : message.score1;
						var score2 = message.error ? null : message.score2;
						var score3 = message.error ? null : message.score3;
						var error = message.error ? message.message : '';
						app.logger.info('evaluated run (token=' + token + ', timestamp=' + timestamp + ', run=' + run + ', subtask=' + subtask + ', score1=' + score1 + ', score2=' + score2 + ', score3=' + score3 + ', error=' + error + ')');
						// replace the description by the error message, if there was any
						var comment = message.error ? message.message : description;
						// the submission was processed, add the results to the leaderboard
						app.database.updateRun(token, timestamp, state, subtask, score1, score2, score3, comment, function(err, ret) {
							// delete the run if processing of the file failed or if we had some database issue. in
							// the former case, the database will have been updated with the reason it failed, while
							// in the latter case it won't and it will forever say it's still being processed; sadly,
							// there's nothing we can do about it.
							if (message.error || err) {
								// delete the file
								fs.unlinkSync(run);
							}
							// notify the user by email if we're running in production
							// note: we send an email whenever a run has been processed, whether the processing was
							//       successful or not
							if (app.config["server-env"] == 'production') {
								var fromName = app.config['email-name'];
								var fromAddress = app.config['email-address'];
								var fromPassword = app.config['email-password'];
								var fromServer = app.config['email-server'];
								var toName = name;
								var toAddress = email;
								var subject = 'Tag and Caption Prediction Challenge 2016 - Leaderboard submission';
								var text = fs.readFileSync(path.join(app.dir, app.config['base-dir'], app.config['email-dir'], app.config['email-submission-text']), 'utf8').replace('$toName', toName).replace('$fromName', fromName).replace('$fromAddress', fromAddress);
								var html = fs.readFileSync(path.join(app.dir, app.config['base-dir'], app.config['email-dir'], app.config['email-submission-html']), 'utf8').replace('$toName', toName).replace('$fromName', fromName).replace('$fromAddress', fromAddress);
								if (message.error) {
									text = text.replace('$message', 'This is to let you know that we were unable to evaluate your $subtask run. The system found the following error: $error.');
									html = html.replace('$message', 'This is to let you know that we were unable to evaluate your $subtask run. The system found the following error: <b>$error</b>.');
									text = text.replace('$subtask', subtask).replace('$error', message.error);
									html = html.replace('$subtask', subtask).replace('$error', message.error);
								} else if (err) {
									if (subtask == 'tag') {
										text = text.replace('$message', 'This is to let you know that your run has been evaluated. However, we were unable to add your run to the Tag and Caption Prediction Challenge 2016 Leaderboard due to a database problem.\n\nYour $subtask prediction run resulted in a precision of $score1, a recall of $score2, and an accuracy of $score3.');
										html = html.replace('$message', 'This is to let you know that your run has been evaluated. However, we were unable to add your run to the Tag and Caption Prediction Challenge 2016 Leaderboard due to a database problem.<br/><br/>Your $subtask prediction run resulted in a precision of <b>$score1</b>, a recall of <b>$score2</b>, and an accuracy of <b>$score3</b>.');
									} else {
										text = text.replace('$message', 'This is to let you know that your run has been evaluated. However, we were unable to add your run to the Tag and Caption Prediction Challenge 2016 Leaderboard due to a database problem.\n\nYour $subtask prediction run resulted in a BLEU score of $score1.');
										html = html.replace('$message', 'This is to let you know that your run has been evaluated. However, we were unable to add your run to the Tag and Caption Prediction Challenge 2016 Leaderboard due to a database problem.<br/><br/>Your $subtask prediction run resulted in a BLEU score of <b>$score1</b>.');
									}
									text = text.replace('$subtask', subtask).replace('$score1', score1.toFixed(2)).replace('$score2', score2.toFixed(2)).replace('$score3', score3.toFixed(2));
									html = html.replace('$subtask', subtask).replace('$score1', score1.toFixed(2)).replace('$score2', score2.toFixed(2)).replace('$score3', score3.toFixed(2));
								} else {
									if (subtask == 'tag') {
										text = text.replace('$message', 'This is to let you know that your run has been evaluated and added to the Tag and Caption Prediction Challenge 2016 Leaderboard!\n\nYour $subtask prediction run resulted in a precision of $score1, a recall of $score2, and an accuracy of $score3.\n\nNote that only the top 10 runs are shown, so your run may not be visible if existing runs outperformed yours.');
										html = html.replace('$message', 'This is to let you know that your run has been evaluated and added to the Tag and Caption Prediction Challenge 2016 Leaderboard!<br/><br/>Your $subtask prediction run resulted a precision of <b>$score1</b> and a recall of <b>$score2</b>, and an accuracy of <b>$score3</b>.<br/><br/>Note that only the top 10 runs are shown, so your run may not be visible if existing runs outperformed yours.');
									} else {
										text = text.replace('$message', 'This is to let you know that your run has been evaluated and added to the Tag and Caption Prediction Challenge 2016 Leaderboard!\n\nYour $subtask prediction run resulted in a BLEU score of $score1.');
										html = html.replace('$message', 'This is to let you know that your run has been evaluated and added to the Tag and Caption Prediction Challenge 2016 Leaderboard!<br/><br/>Your $subtask prediction run resulted in a BLEU score of <b>$score1</b>.');
									}
									text = text.replace('$subtask', subtask).replace('$score1', score1.toFixed(2)).replace('$score2', score2.toFixed(2)).replace('$score3', score3.toFixed(2));
									html = html.replace('$subtask', subtask).replace('$score1', score1.toFixed(2)).replace('$score2', score2.toFixed(2)).replace('$score3', score3.toFixed(2));
								}
								app.emailer.send(fromName, fromAddress, fromPassword, fromServer, toName, toAddress, subject, text, html, function(err, ret) {
									// whether or not the email was successfully sent, we don't have to do anything here, nor
									// can we do anything at this time. the user will just have to check the leaderboard for
									// updates - the worst that happened was that the email couldn't get sent or ended up in
									// the user's spam box.
								});
							}
						});
					});
					child.send({ subtask: subtask, file: path.join(app.dir, app.config['base-dir'], app.config['eval-dir'], app.config['eval-' + subtask + '-data']), run: run, missing: path.join(app.dir, app.config['base-dir'], app.config['eval-dir'], app.config['eval-missing']), metrics: path.join(app.dir, app.config['base-dir'], app.config['eval-dir'], app.config['eval-metrics']), ratio: Number(app.config['eval-' + subtask + '-ratio']) });
					return res.render('response', { message: 'Run submitted successfully and is currently being processed. It may take a few minutes until your scores appear on the leaderboard. You will be notified by email when the evaluation has finished.' });	
				});
			});
		});
	});
});

// export the module
module.exports = router;
