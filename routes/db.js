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

router.route('/webhook')
	.get(function (request, response){
		if (reqest.params.challenge) {
			// The initial Dropbox confirmation call. Echo the parameter
			response.send(request.params.challenge);
		}
	})
	.post(jsonencode, function (request, response){
		console.log(body);
		response.sendStatus(200);
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
					console.log("making post request with options: " + options.headers.Authorization);
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