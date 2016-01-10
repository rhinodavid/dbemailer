var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
	name: String,
	email: { type: String, required: true, unique: true },
	password: { type: String, select: true },
	status: String,
	admin: { type: Boolean, default: false },
	created_at: { type: Date, default: Date.now },
	updated_at: { type: Date }
});

userSchema.pre('save', function(next){
	var currentDate = new Date();

	this.updated_at = currentDate;

	if (!this.created_at) this.created_at = currentDate;

	next();
});

var User = mongoose.model('User', userSchema);

module.exports = User;