var express 		= require('express');
var bodyParser 		= require('body-parser');
var urlencode 		= bodyParser.urlencoded({extended: false});
var jsonencode 		= bodyParser.json();
var jwt 			= require('jsonwebtoken');
var User 			= require('./../models/user');
var privateConfig	= require('./../private-config');
var config 			= require('./../config');
var mongoose 		= require('mongoose');

//mongoose.connect(config.database);

var authenticate = express.Router();

authenticate.use(urlencode, jsonencode, function (request, response, next){
	var token = request.body.token || request.query.token || request.headers['x-access-token'];

	if (token) {
		//verifies secret and checks exp
		jwt.verify(token, privateConfig.secret, function (error, decoded){
			if (error) {
				if (error.name == 'TokenExpiredError') {
					return response.status(400).json({success: false, error: 'Token expired', message: 'Token is expired'});
				} else if (error.name == 'JsonWebTokenError') {
					return response.status(401).json({success: false, error: 'Token invalid', message: 'Token is invalid'});
				}
				return response.status(400).json({ success: false, message: 'Failed to authenticate token.'});
			} else {
				//everything is good

				console.log(Object.keys(decoded));
				console.log(decoded._id);
				User.findOne(decoded._id, function (error, user){
					if (error) {
						throw error;
					} else {
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
		return response.status(403).json({success: false, message: 'No token provided'});
	}

});


module.exports = authenticate;