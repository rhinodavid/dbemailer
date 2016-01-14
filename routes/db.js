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

			var options = {//may not need this
				protocol: 'https',
				hostname: 'api.dropboxapi.com',
				path: '/1/oauth2/token',
				method: 'POST'
			};

			var post_data = {
				code: code,
				grant_type: 'authorization_code',
				client_id: process.env.DB_APP_KEY,
				client_secret: process.env.DB_APP_SECRET,
				redirect_uri: 'http://localhost:3000/db/addoauth'
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
										response.redirect('/admin.html');
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