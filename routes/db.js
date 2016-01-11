var express 		= require('express');
var bodyParser 		= require('body-parser');
var urlencoded 		= bodyParser.urlencoded({extended: false});
var jsonencode 		= bodyParser.json();
var assert 			= require('assert');
var mongo 			= require('mongodb');
var config 			= require('./../config');
var privateConfig 	= require('./../private-config');
var jwt 			= require('jsonwebtoken');
var User 			= require('./../models/user');
var Dropbox 		= require('./../models/dropbox');
var validator 		= require('validator');
var router 			= express.Router();
var mongoose 		= require('mongoose');
var authenticate	= require('./authentication');
var url 			= require('url');


router.route('/addoauth')
	.get(urlencoded, function (request, response) {
		console.log("code is:" + request.query.code);
		var code = request.query.code;
		var error = request.query.error;
		var error_description = request.body.error_description;
		if (error) {
			return response.status(400).send('Error:' + error_description);
		} else {
			//save credentials
			
			//clear out database (only saving one dropbox)
			Dropbox.remove({}, function (error) {
				if (error) {
					throw error;
				} else {
					//create the new entry
					console.log('saving code: '+code);
					var db = new Dropbox({
						code: code
					});
					db.save(function (error, db){
						if (error) {
							throw error;
						} else {
							//render a success message and redirect to admin page
							console.log("Saved Db" + db);
							response.send("success");
							//response.redirect('/admin.html');
						}
					});
				}
			})
		}
	})


module.exports = router;