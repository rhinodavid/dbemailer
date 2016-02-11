var Mailgun = require('mailgun-js');
var exphbs = require('express-handlebars');
var hbs = exphbs.create();
var Readable = require('stream').Readable;
var http = require('http');

///////////////////////////
/*
var apiKey = process.env.MAILGUN_API_KEY;
var mailDomain = process.env.MAILGUN_EMAIL_DOMAIN;
var mailgun = new Mailgun({apiKey: apiKey, domain: mailDomain});
var request_mod		= require('request');
var maybeStream = request_mod.get({url: 'http://placehold.it/350x150', encoding: null});
maybeStream.contentType = "image/jpg";
maybeStream.filename  = "myimg.jpg";
maybeStream.knownLength = 6486;
//var attch = new mailgun.Attachment({data: maybeStream, filename: "davidname"});
//attch.data = maybeStream;
//console.log(attch);

var data = {
			from: 'mail@' + process.env.MAILGUN_EMAIL_DOMAIN,
			to: "dawalsh+test@gmail.com",
			subject: '[Schedule Mailer] TEST',
			html: "<p>test 123</p>",
			attachment: maybeStream
		};

		mailgun.messages().send(data, function (error, body) {
			if (error) {
				console.log("error");
				return;
			} else {
				console.log("Sent confirmation email with files.");
				console.log(body);
			}
		});*/

////////////////////8888888888888888888888888888888////////////////////////
var email = {};
var apiKey = process.env.MAILGUN_API_KEY;
var mailDomain = process.env.MAILGUN_EMAIL_DOMAIN;

email.sendFiles = function (users, files, cb) {
	/*******************************************
	users: an array of User records to email
	files: a filepath of stream (or array of either)
	cb: of the cb(error) format
	********************************************/

	var mailgun = new Mailgun({apiKey: apiKey, domain: mailDomain});
	
	var attch = [];
	if (typeof files == "string") {
		attch[0] = files;
	} else {
		files.forEach(function (file){
			/*attch.push(new mailgun.Attachment({
				data: file, // Not accepting this since file is not a buffer or instanceof Readable
				filename: file.fileName
			}));*/
			file.filename = file.fileName;
			attch.push(file);
		});
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

	console.log(recipientVariables);

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
			attachment: attch,
			"recipient-variables": recipientVariables
		};

		mailgun.messages().send(data, function (error, body) {
			if (error) {
				cb(error);
				return;
			} else {
				console.log("Sent confirmation email with files.");
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