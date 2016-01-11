var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var dropboxSchema = new Schema({
	//code: String,
	access_token: String,
	token_type: String, //always 'bearer'
	uid: String,
	created_at: { type: Date, default: Date.now },
	updated_at: { type: Date }
});

dropboxSchema.pre('save', function(next){
	var currentDate = new Date();

	this.updated_at = currentDate;

	if (!this.created_at) this.created_at = currentDate;

	next();
});

var Dropbox = mongoose.model('Dropbox', dropboxSchema);

module.exports = Dropbox;