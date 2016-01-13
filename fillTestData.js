var app = require('./app');


var mongoose = require('mongoose');
var User = require('./models/user');
var config = require('./config');
mongoose.createConnection(config.database);

var faker = require('faker');

var name = null;
var email = null;
var status = null;

for (var i=0; i<5; i++) {
	var rand = Math.random();
	if (rand < .3333333) {
		status = "pending-user";
	} else if (rand < .666666) {
		status = "pending-admin";
	} else {
		status = "confirmed";
	}

	name = faker.name.firstName();
	email = faker.internet.email();


	var newUser = new User({
		name: name,
		email: email,
		status: status
	});
	console.log(newUser);

	newUser.save(function(error, user){
		if (error) throw error;
	});
}