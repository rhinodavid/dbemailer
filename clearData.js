var app = require('./app');


var mongoose = require('mongoose');
var User = require('./models/user');
var config = require('./config');
mongoose.createConnection(config.database);

User.remove({}, function(error){
	console.log("Users cleared out");
})