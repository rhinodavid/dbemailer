var express 		= require('express');
var bodyParser 		= require('body-parser');
var cookieParser	= require('cookie-parser');
var urlencode 		= bodyParser.urlencoded({extended: false});
var jsonencode 		= bodyParser.json();
var jwt 			= require('jsonwebtoken');
var User 			= require('./../models/user');
var config 			= require('./../config');
var mongoose 		= require('mongoose');


//mongoose.connect(config.database);

var authenticate = express.Router();

authenticate.use(urlencode, jsonencode, cookieParser(), function (request, response, next){
	var token = request.body.token || request.query.token || request.headers['x-access-token'] || request.cookies.token;
	if (token) {
		//verifies secret and checks exp
		jwt.verify(token, process.env.SECRET, function (error, decoded){
			//console.log('Verified token. ID is :' + decoded._id);
			if (error) {
				if (error.name == 'TokenExpiredError') {
					if (request.headers['X-Requested-With'] == 'XMLHttpRequest') {
						//request probably came from jQuery, Angular, etc.
						return response.status(400).json({"success": false, "message": "Token is expired", "error": "Token expired"});
					} else {
						//request probably came from a browser
						//direct user to login page with a redirect back to this path"
						return response.redirect('/login?redirect=' + request.originalUrl);
					}
				} else if (error.name == 'JsonWebTokenError') {
					

					if (request.headers['X-Requested-With'] == 'XMLHttpRequest') {
						//request probably came from jQuery, Angular, etc.
						return response.status(401).json({"success": false, "message": "Token is invalid", "error": "Token invalid"});
					} else {
						//request probably came from a browser
						//direct user to login page with a redirect back to this path"
						return response.redirect('/login?redirect=' + request.originalUrl);
					}
				}
				//any other generic error
				if (request.headers['X-Requested-With'] == 'XMLHttpRequest') {
					//request probably came from jQuery, Angular, etc.
					return response.status(400).json({"success": false, "message": "Failed to authenticate token"});
				} else {
					//request probably came from a browser
					//direct user to login page with a redirect back to this path"
					return response.redirect('/login?redirect=' + request.originalUrl);
				}
			} else {
				//everything is good

				User.findById(decoded._id, function (error, user){
					if (error) {
						throw error;
					} else {
						if (!user) {
							// no user is found with that ID
							if (request.headers['X-Requested-With'] == 'XMLHttpRequest') {
								//request probably came from jQuery, Angular, etc.
								return response.status(400).json({"success": false, "message": "Failed to authenticate token"});
							} else {
								//request probably came from a browser
								//direct user to login page with a redirect back to this path"
							return response.redirect('/login?redirect=' + request.originalUrl);
							}
						}
						console.log("Authenticating user email: " + user.email);
						console.log("With id: " + user._id);
						console.log("Admin status: " + user.admin);
						request.decoded = {};
						request.decoded._id = user._id;
						request.decoded.email = user.email;
						request.decoded.admin = user.admin;
						request.decoded.name = user.name;
						next();
					}
				});
			}
		});
	} else {
		//there was no token
		if (request.headers['X-Requested-With'] == 'XMLHttpRequest') {
			//request probably came from jQuery, Angular, etc.
			return response.status(403).json({"success": false, "message": "No token provided"});
					} else {
						//request probably came from a browser
						//direct user to login page with a redirect back to this path"
			return response.redirect('/login?redirect=' + request.originalUrl);
		}
	}

});


module.exports = authenticate;