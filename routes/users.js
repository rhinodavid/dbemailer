var express 		= require('express');
var bodyParser 		= require('body-parser');
var urlencode 		= bodyParser.urlencoded({extended: false});
var jsonencode 		= bodyParser.json();
var assert 			= require('assert');
var mongo 			= require('mongodb');
var jwt 			= require('jsonwebtoken');
var User 			= require('./../models/user');
var validator 		= require('validator');
var router 			= express.Router();
var mongoose 		= require('mongoose');
var authenticate	= require('./authentication');
var exphbs          = require('express-handlebars');
var emailSender		= require('./../email');

router.route('/testsend')
	.get(function (request, response) {
		var files = [__dirname+"/db.js", __dirname+"/authentication.js"];
		User.find({status: "confirmed"}, function(error, users){
			emailSender.sendFiles(users, files, function(e){
				console.log("File send callback with error: ", e);
				response.send("File send callback with error:", e);
			});
		});
	});


router.route('/confirmemail/:token')
.get(function(request, response) {
    var token = request.params.token;
    if(!token) {
        response.render('emailerror', {"message": "No token was provided", "layout": "main"});
    } else {
        jwt.verify(token, process.env.SECRET, function (error, decoded){
            if (error) {
                if (error.name == 'TokenExpiredError') {
                    response.render('emailerror',
                        { "message": "Your confirmation link has expired. Please sign up again.",
                          "layout" : "main"
                    });
                } else {
                    response.render('emailerror', {"layout": "main"});
                }
            } else {
                //there is no error, find the decoded id's user and confirm them
                var id = decoded._id;
                User.findById(id, function (error, user){
                	console.log("CONFIRM USER: Found user: " + user.name);
                	if (error) {
                		response.render('emailerror', {"message": "Could not find user.", "layout": "main"});
                	} else {
                		switch (user.status) {
                			case "confirmed":
                				response.render('titleandmessage', {
                					"layout": "main",
                					"title": "You're already confirmed.",
                					"message": "Your email address has already been confirmed. You should already be receiving emails."
                				});
                				break;
                			case "pending-admin":
                				response.render('titleandmessage', {
                					layout: "main",
                					"title": "Pending administrator confirmation",
                					"message": "You've already confirmed your email address. Once an administrator confirms you you'll begin receiving emails."
                				});
                				return;
                				break;
                			case "pending-user":
                				user.status = "pending-admin";
                				user.save(function (error, user) {
                					if (error) {
                						response.render('error', {
                							"layout": "main",
                							"error": "There was an error confirming your email."
                						});
                					} else {
                						var message = "Congratulations " + user.name + ", your email has been confirmed. Once an administrator also confirms it, you'll begin receiving emails.";
                						response.render('titleandmessage', {
                							"layout": "main",
                							"title": "Email confirmed",
                							"message": message
                						});
                					}
                				});
                				break;
                			default:
                				response.render('error', {"message": "There was an error confirming your email", "layout": "main"});
                		}
                		
                	}
                });
            }
        });
    }
});

router.route('/unsubscribe/:token')
.get(function(request, response) {
    var token = request.params.token;
    if(!token) {
        response.render('emailerror');
    } else {
        jwt.verify(token, process.env.SECRET, function (error, decoded){
            if (error) {
                if (error.name == 'TokenExpiredError') {
                    response.render('emailerror',
                        { "message": "Your unsubscribe link has expired. Please click on a link in a newer email.",
                           "layout": "main"
                    });
                } else {
                    response.render('emailerror', {"layout": "main"});
                }
            } else {
                //there is no error, find the decoded id's user and confirm them
                var id = decoded._id;
                User.findByIdAndRemove(id, function (error, user){
                	console.log("UNSUBCRIBE USER: Found user: " + user.name);
                	if (error) {
                		response.render('emailerror', {"message": "Could not find user.", "layout": "main"});
                	} else {
                		response.render('titleandmessage', {
                			"layout": "main",
                			"title": "Unsubcribed",
                			"message": "You have been unsubscribed. You'll no longer recieve emails."
                		});
                	}
                });
            }
        });
    }
});


router.route('/')
	.post(urlencode, function(request, response){
		var name = request.body.name;
		var email = request.body.email.toLowerCase();

		if(!validator.isEmail(email)) {
			response.status(400).send('Invalid email address');
			return false;
		}

		User.count({}, function (error, count){
			if (count == 0) {
				// There are no users. Make the first user an administrator

				var newPassword = generatePassword();

				var newUser = new User({
					name: name,
					email: email,
					status: "pending-user",
					admin: true,
					password: newPassword
				});
			} else {
				// Respond normally
				var newUser = new User({
					name: name,
					email: email,
					status: "pending-user"
				});
			}

			newUser.save(function(error, user){
				if (error) {
					if(/duplicate key/.test(error.message)) {
						//email already exists
						User.findOne({email: email}, function (error, user) {
							if (error) {
								throw error;
							}
							emailSender.sendEmailConfirmation(user, function(error) {
								if (error) throw error;
							});
							response.status(400).send('Your email is already registered. Check your inbox to confirm your address.');
						});
					} else {
						throw error;
					}
				} else {
					emailSender.sendEmailConfirmation(user, function(error){
						if (error) throw error;
					});
					var message = "";
					if (newPassword) {
						message = "Your password is " + newPassword + ".";
					}
					response.status(201).json(
						{
							"_id": user._id,
							"name": user.name,
							"email": user.email,
							"status": user.status,
							"message": message
						}
					);
				}
			});
			
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
			User.findOneAndRemove({_id: id}, function (error) {
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
			User.findOneById(id, function(error, user){
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
		var password = request.body.password;

		if (requesterId == id) {
			// The person making the request is the user
			requesterIsUser = true;
		}

		console.log("User ID: " +  id);
		console.log("Requester ID: " + requesterId);
		console.log("Requester is user: " + requesterIsUser);

		if (status) {
			// update status
			// **make this into a function**
			console.log("Updating status for user ", id);
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
		} else if (password) {
			// update password
			console.log('Updating password for user ', id);
			// must be user updating their own password
			if (!requesterIsUser) {
				return response.status(403).json({success: false, message: 'User\'s password being updated is not the verified user.'});
			}
			if (password.length < 8) {
				return response.status(400).json({success: false, message: 'Password is too short.'});
			}
			User.findById(id, function (error, user){
				if (error) {
						console.log('Error finding user to update password.');
						if(/not found/.test(error.message)) {
							return response.status(400).json({success: false, message: 'User not found'});
							
						} else {
							// generic error
							return response.status(400).json({success: false, message: 'Error with user record.'})
						}
					} else {
						console.log('no error');
						console.log("found user: " + user.name);
						user.password = password;
						user.save(function(error, user) {
							if (error) {
								return response.status(400).json({success: false, message: "Error updating user password"});
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
						
						var token = user.generateToken();

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

function generatePassword() {
	var letters = 'abcdefghijklmnopqrstuvwxyz';
	var password = '';
	for (var i = 0; i < 14; i++) {
		if (!((i+1)%5)) {
			password = password + '-';
		} else {
			password = password + letters[Math.floor(Math.random() * 26)];
		}
	}
	return password;
}

module.exports = router;