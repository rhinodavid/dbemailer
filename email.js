var Mailgun = require('mailgun-js');
var exphbs = require('express-handlebars');
var hbs = exphbs.create();
var Readable = require('stream').Readable;
var http = require('http');

////////////////////////// 
/*
var email = {};
var apiKey = process.env.MAILGUN_API_KEY;
var mailDomain = process.env.MAILGUN_EMAIL_DOMAIN;
var mailgun = new Mailgun({apiKey: apiKey, domain: mailDomain});
var request_mod		= require('request');
var options = {
			url: "https://content.dropboxapi.com/2/files/download",
			method: 'POST',
			headers: 
				{ 
						'Dropbox-API-Arg': '{"path":"'+"id:o7Zz2-J5qpAAAAAAAAACpQ"+'"}',
				 	Authorization: 'Bearer ' + 'DtP26nN-dyAAAAAAAAAAwU2QjzpSOOk1unkuy4LUxpZysOkFMX58AbmLBiS-4xZl'
				}
};
request_mod.post(options, function (err, res, body) {
	console.log(res);
	//email.attch1 = new mailgun.Attachment({data: body, filename: "davidname.png", contentType: "image/png", knownLength: 6846});
	var dataBuffer = new Buffer(body);
	var attch = new mailgun.Attachment({data: dataBuffer, filename: "othername.pdf", contentType: "application/pdf"});
	var data = {
		from: 'mail@' + process.env.MAILGUN_EMAIL_DOMAIN,
		to: "dawalsh+test@gmail.com",
		subject: '[Schedule Mailer] TEST',
		html: "<p>test 123</p>",
		attachment: attch
	};

	mailgun.messages().send(data, function (error, body) {
		if (error) {
			console.log("error");
			return;
		} else {
			console.log("Sent confirmation email with files.");
			console.log(body);
		}
	});
});
*/

////////////////////8888888888888888888888888888888////////////////////////
var email = {};
var apiKey = process.env.MAILGUN_API_KEY;
var mailDomain = process.env.MAILGUN_EMAIL_DOMAIN;

email.sendFiles = function (users, attachments, cb) {
	/*******************************************
	users: an array of User records to email
	attachments: an array of mailgun attachemnts
	cb: of the cb(error) format
	********************************************/

	var mailgun = new Mailgun({apiKey: apiKey, domain: mailDomain});
	if (attachments instanceof mailgun.Attachment) {
		// make sure this is an array and not just one attachment
		var a = [];
		a[0] = attachments;
		attachments = a;

	}
	try {
		attachments.forEach(function(attachment){
			if (!(attachment instanceof mailgun.Attachment)) {
				cb("Not all attachments are instances of Mailgun Attachments");
			} else {
				//console.log(attachment.data.length);
				//console.log(attachment.filename);
				//console.log(attachment.knownLength);
			}
		})
	}
	catch (error) {
		cb(error);
		return;
	}

	var domain = process.env.DOMAIN;
	var httpScheme = process.env.HTTP_SCHEME || "https://";
	var message = "%recipient.name%, new flight schedules are attached.";
	var imgUrl = httpScheme + domain +'/logo_256.png';
	var unsubscribeUrl = httpScheme + domain + '/users/unsubscribe/%recipient.token%';

	var options = {
		"title"				: "New Flight Schedules",
		"message"			: message,
		"img-url"			: imgUrl,
		"unsubscribe-url"	: unsubscribeUrl,
		"layout"			: false
	};

	//build the user email list and recipient varialbes
	var emails = [];
	var recipientVariables = {};
	users.forEach(function(user){
		emails.push(user.name + " <" + user.email + ">");
		recipientVariables[user.email] = {
			token: user.generateToken(),
			name: user.name
		};
	});

	//console.log(recipientVariables);

	hbs.renderView('views/email-transactional.handlebars', options, function (error, html){
		if (error) {
			cb(error);
			return;
		}

		var data = {
			from: 'mail@' + process.env.MAILGUN_EMAIL_DOMAIN,
			to: emails,
			subject: '[Schedule Mailer] ' + options.title,
			html: html,
			"recipient-variables": recipientVariables,
			attachment: attachments
		};

		mailgun.messages().send(data, function (error, body) {
			if (error) {
				cb(error);
				return;
			} else {
				console.log("Sent email with files.");
				cb(null);
			}
		});
	});
};

email.sendEmailConfirmation = function (user, cb) {
	var mailgun = new Mailgun({apiKey: apiKey, domain: mailDomain});

	var domain = process.env.DOMAIN;
	var httpScheme = process.env.HTTP_SCHEME || "https://";
	var token = user.generateToken();
	var link = httpScheme + domain + '/users/confirmemail/' + token;
	var message = "%recipient.name%, <a href='"+link+"' alt='Confirmation link'>click here</a> to confirm your email address.";
	var imgUrl = httpScheme + domain +'/logo_256.png';
	var unsubscribeUrl = httpScheme + domain + '/users/unsubscribe/' + token;

	var options = {
		"title"				: "Confirm Your Email Address",
		"message"			: message,
		"img-url"			: imgUrl,
		"unsubscribe-url"	: unsubscribeUrl,
		"layout"			: false
	};

	hbs.renderView('views/email-transactional.handlebars', options, function (error, html){
		if (error) {
			cb(error);
			return;
		}

		var rv = {};
		rv[user.email] = { name: user.name };

		var data = {
			from: 'mail@' + process.env.MAILGUN_EMAIL_DOMAIN,
			to: user.email,
			subject: '[Schedule Mailer] ' + options.title,
			html: html,
			'recipient-variables': rv
		};
		mailgun.messages().send(data, function (error, body) {
			if (error) {
				cb(error);
				return;
			} else {
				console.log("Sent confirmation email for ", user.email);
				cb(null);
			}
		});
	});
};


module.exports = email;