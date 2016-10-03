// global imports
var nodemailer = require('nodemailer');

// implement the emailer
var emailer = {
	// send an email
	send: function(fromName, fromAddress, fromPassword, fromServer, toName, toAddress, subject, text, html, callback) {
		var content = {
		    from: fromName + '<' + fromAddress + '>',
		    to: toAddress,
		    subject: subject,
		    text: text,
		    html: html,
		};
		var transporter = nodemailer.createTransport('smtps://' + encodeURIComponent(fromAddress) + ':' + fromPassword + '@' + fromServer);
		transporter.sendMail(content, function(err, ret) {
			if (err) {
				app.logger.debug('could not send email to ' + toAddress);
				return callback({ title: 'Sending email failed', message: 'The email could not be sent to ' + toAddress }, null);
			}
			app.logger.debug('sent email to ' + toAddress);
		    return callback(null, { title: 'Sending email succeeded', message: 'The email was sent to ' + toAddress }, null);
		});
	},
}

// export the module
module.exports = emailer;