var express 		= require('express');
var bodyParser 		= require('body-parser');
var urlencoded 		= bodyParser.urlencoded({extended: false});
var jsonencode 		= bodyParser.json();
var assert 			= require('assert');
var mongo 			= require('mongodb');
var config 			= require('./../config');
var jwt 			= require('jsonwebtoken');
var User 			= require('./../models/user');
var Dropbox 		= require('./../models/dropbox');
var validator 		= require('validator');
var router 			= express.Router();
var mongoose 		= require('mongoose');
var authenticate	= require('./authentication');
var url 			= require('url');
var request_mod		= require('request');

function mailUpdatedFiles(uid, cb) {
	Dropbox.findOne({uid: uid}, function (error, db){
		if (error) {
			cb(error);
			return;
		}

		// If there is no saved cursor call Dropbox list_folder,
		// otherwise use the cursor and call list_folder/continue.
		var cursor = db.cursor;
		var hasMore = true;
		var entries = [];
		if (!db.cursor) {
			var options = {
				url: "https://api.dropboxapi.com/2/files/list_folder",
				method: 'POST',
				headers: {
					Authorization: "Bearer " + db.access_token,
					"Content-Type": "application/json"
				}
			};
			var post_data = {
				path: "",
				recursive: true,
				include_media_info: false,
				include_deleted: false
			};
			request_mod.post(options, post_data, function (error, httpResponse, body){
				if (error) {
					cb(error);
					return;
				}
				cursor = body.cursor;
				hasMore = body.has_more;
				entries = entries.concat(body.entries);
			});
		}
		// If we had a cursor we would skip the previous if statment and come here
		// If we didn't and the previous statment ran AND came back with has_more,
		// we would also run this.
		while (hasMore) {
			var options = {
				url: "https://api.dropboxapi.com/2/files/list_folder/continue",
				method: 'POST',
				headers: {
					Authorization: "Bearer " + db.access_token,
					"Content-Type": "application/json"
				}
			};
			var post_data = {
				cursor: cursor
			};
			request_mod.post(options, post_data, function (error, httpResponse, body){
				if (error) {
					cb(error);
					return;
				}
				cursor = body.cursor;
				hasMore = body.has_more;
				entries = entries.concat(body.entries);
			});
		}

		// We have been through continue until no more has_mores exist.
		// entries now contains an array of all the new files (and folders)
		// since our cursor before this all started.
		// Cursor contains the last cursor, which we need to save

		db.cursor = cursor;
		db.save(function (error) {
			if (error) {
				cb(error);
				return;
			}
		});

		console.log(entries); // Just looking at our new entires.
	});
}

router.route('/webhook')
	.get(function (request, response){
		if (request.query.challenge) {
			// The initial Dropbox confirmation call. Echo the parameter
			response.send(request.query.challenge);
		}
	})
	.post(jsonencode, function (request, response){
		console.log(request.body);
		var data = request.body;
		response.sendStatus(200);
		data.delta.users.forEach(function (uid){
			// Call the email - file function for each
			// Dropbox account there is an update on
			mailUpdatedFiles(uid, function(error){
				if (error) throw error;
			});
		});
	});

router.route('/dbauthurl')
	// This route returns the link to the Dropbox authorization URL
	// where the administrator will approve Dropbox access
	.get(function(request, response) {
		var domain = process.env.DOMAIN;
		var dbAppKey = process.env.DB_APP_KEY;
		var httpScheme = process.env.HTTP_SCHEME || "https://";
		var dropboxBase = "https://www.dropbox.com/1/oauth2/authorize"
		var url = dropboxBase + "?response_type=code&client_id=" + dbAppKey + "&redirect_uri=" + httpScheme + domain + "/db/addoauth";
		response.json(url);
	});

router.route('/accountinfo')
	.get(authenticate, function (request, response) {
		if (!request.decoded.admin) {
			if (request.decoded._id != id) {
				return response.status(403).json({message: 'Administrator access required'});
			}
		} else {
			Dropbox.findOne(function(error, db){
				if (error || !db) {
					response.status(400).json({"message": "No Dropbox linked or error connecting"});
				} else {
					var options = {
						method: 'POST',
						url: "https://api.dropboxapi.com/2/users/get_current_account",
						headers: {
							"Authorization": "Bearer " + db.access_token
						}
					}
					request_mod.post(options, function(error, httpResponse, body){
						if (error) throw error;
						response.json(body);
					})
				}
			});
		}
	});

router.route('/addoauth')
	.get(urlencoded, function (request, response) {
		console.log("code is:" + request.query.code);
		var code = request.query.code;
		var error = request.query.error;
		var error_description = request.body.error_description;
		if (error) {
			return response.status(400).send('Error:' + error_description);
		} else {

			// we have a valid code, now make a request the the dropbox API
			// to get a token
			var httpScheme = process.env.HTTP_SCHEME || "https://";
			var domain = process.env.DOMAIN;
			var redirect_uri = httpScheme + domain + "/db/addoauth";

			var post_data = {
				code: code,
				grant_type: 'authorization_code',
				client_id: process.env.DB_APP_KEY,
				client_secret: process.env.DB_APP_SECRET,
				redirect_uri: redirect_uri
			};

			request_mod.post({url: 'https://api.dropboxapi.com/1/oauth2/token', form: post_data, json: true},
				function (error, httpResponse, body){
				if (error) {
					console.log('error in post' + error);
					throw error;
				} else {
					if (httpResponse.statusCode != 200) {
						//there was an error
						console.log("Error exchanging dropbox code for token");
						console.log("Error: " + body.error);
						console.log("Description: " + body.error_description);
						response.status(400).send("Error connecting to Dropbox " + body.error_description);
					} else {
						//no error.. save token and redirect user

						//clear out database since we're only holding 1 token
						Dropbox.remove({}, function (error) {
							if (error) {
								throw error;
							} else {
								//create the new entry
								var db = new Dropbox({
									access_token: body.access_token,
									token_type: body.token_type,
									uid: body.uid
								});

								db.save(function (error, db){
									if (error) {
										throw error;
									} else {
										response.redirect('/admin');
									}
								});
							}
						});
					}
				}
			});
		}
	})


module.exports = router;