var express 		= require('express');
var bodyParser 		= require('body-parser');
var urlencode 		= bodyParser.urlencoded({extended: false});
var jsonencode 		= bodyParser.json();
var assert 			= require('assert');
var mongo 			= require('mongodb');
var config 			= require('./../config');
var privateConfig 	= require('./../private-config');
var jwt 			= require('jsonwebtoken');
var User 			= require('./../models/user');
var validator 		= require('validator');
var router 			= express.Router();
var mongoose 		= require('mongoose');
var authenticate	= require('./authentication');

//var port = process.env.PORT || 3000; //used to create, sign and verify tokens
//mongoose.connect(config.database);

router.route('/testuser')	
	.get(function (request, response) {
		//***** ONLY FOR TESTING ********
		var tester = new User({
			name: 'David',
			email: 'davidtest@gmail.com',
			password: 'password',
			status: 'confirmed',
			admin: true
		});
		tester.save(function (error) {
			if (error) throw error;
			console.log('User saved successfully');
			response.json({success: true});
		});
		
	});




router.route('/')
	.post(urlencode, function(request, response){
		var name = request.body.name;
		var email = request.body.email.toLowerCase();

		if(!validator.isEmail(email)) {
			response.status(400).send('Invalid email address');
			return false;
		}

		var newUser = new User({
			name: name,
			email: email,
			status: "pending-user"
		});

		newUser.save(function(error, user){
			if (error) {
				if(/duplicate key/.test(error.message)) {
					//email already exists
					response.status(400).send('Email already exists in database');
				} else {
					throw error;
				}
			} else {
				response.status(201).json(
					{
						"_id": user._id,
						"name": user.name,
						"email": user.email,
						"status": user.status
					}
				);
			}
		});
	})
	.get(authenticate, function(request, response){
		if (!request.decoded.admin) {
			return response.status(403).json({message: 'Administrator access required'});
		} else {
			User.find({}, function (error, users){
				assert.equal(null, error);
				response.json(users);
			});
		}
	});

router.route('/:id')
	.delete(authenticate, function(request, response){
		var id = request.params.id;
		console.log("admin?:" + request.decoded.admin);
		if (!request.decoded.admin) {
			if (request.decoded._id != id) {
				return response.status(403).json({message: 'Administrator access or deleting user required'});
			}
		} else {
			User.findOneAndRemove(id, function (error) {
				if (error) {
					response.status(400).send('Error removing user');
				} else {
					response.status(204).json({success: true, message: "User deleted"});
				}
			});
		}
	})
	.get(authenticate, function(request, response){
		var id = request.params.id;

		if (!request.decoded.admin || (request.decoded._id != id)) {
			return response.status(403).json({message: 'Administrator access or deleting user required'});
		} else {
			User.findOne(id, function(error, user){
				if (error) {
					response.status(400).send('Error finding user');
				} else {
					response.status(200).json(user);
				}
			});
		}
	})
	.put(authenticate, jsonencode, urlencode, function(request, response){
	//currently only updates user status
		var id = request.params.id;
		var requesterId = request.decoded._id;
		var requesterAdmin = request.decoded.admin;
		var requesterIsUser = false;

		var status = request.body.status;

		if (requesterId === id) {
			// The person making the request is the user
			requesterIsUser = true;
		}

		console.log("User ID: " +  id);
		console.log("Requester ID: " + requesterId);
		console.log("Requester is user: " + requesterIsUser);


		if (!(requesterAdmin || requesterIsUser)) {
			// You must be an admin or the user to modfiy anything
			return response.status(403).json({success: false, message: 'Administrator access or modifying user required'});
		}

		if ((status == 'confirmed') && !request.decoded.admin) {
			return response.status(403).json({success: false, message: 'Administrator is required to confirm user'});
		}

		if (status && !((status == 'confirmed') || (status == 'pending-user') || (status == 'pending-admin'))) {
			//A status was provided but it was bad
			response.status(400).send('Invalid status type');
			return false;
		} else if (!status) {
			//No status was provided
			response.status(400).send('No status update provided');
			return false;
		} else {
			//A valid status was provided
			console.log("Attempting to find user.." + id);
			User.findById(id, function (error, user){
				if (error) {
					console.log('some error..');
					if(/not found/.test(error.message)) {
						response.status(400).send('User not found');
						return false;
					} else {
						// generic error
						throw error;
					}
				} else {
					console.log('no error');
					console.log("found user: " + user.name);
					user.status = status;
					user.save(function(error, user) {
						if (error) {
							return response.status(400).json({"success": false, "message": "Error updating user"});
						} else {
							response.status(200).json({_id: user._id, status: user.status, email: user.email, name: user.name});
						}
					});
				}
			});
		}
		//catch all if no updates were made
	});

router.route('/authenticate')
	.post(urlencode, jsonencode, function (request, response){
		console.log('user/authenticate: ' + request.body.email + " " + request.body.password);
		if (!request.body.password) {
			//no password was provided
			return response.status(400).json({ success: false, message: 'No password provided'});
		}
		User.findOne({
			email: request.body.email
		}, function (error, user){
			if (error) {
				throw error;
			}
			if (!user) {
				response.status(400).json({ "success": false, "message": "Authentication failed. User not found."});
			} else if (user) {
				//check if password matches **** NEED TO UPDATE TO HASHING ****

				user.comparePassword(request.body.password, function (error, isMatch){
					if (error) throw error;
					if (isMatch) {
						console.log("Setting token for user: " + user.name);
						console.log("And ID: " + user._id);
						var payload = {
							_id: user._id,
						};
						var token = jwt.sign(payload, privateConfig.secret, {
							expiresIn: '7 days' //expires in 7 days
						});

						response.json({
							"success": true,
							"message": 'Token is included in response',
							"token": token
						})

					} else {
						//wrong password
						return response.status(400).json({ "success": false, "message": "Authentication failed. Wrong password."});
					}
				});
			}

		});
	});

module.exports = router;