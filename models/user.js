var mongoose 	= require('mongoose');
var jwt			= require('jsonwebtoken');
var Schema 		= mongoose.Schema;
var bcrypt 		= require('bcrypt');
var SALT_WORK_FACTOR = 10;

// See http://devsmash.com/blog/password-authentication-with-mongoose-and-bcrypt for
// bcrypt/hashing tutorial

var userSchema = new Schema({
	name: String,
	email: { type: String, required: true, index: {unique: true} },
	password: { type: String, select: true },
	status: { type: String, default: "pending-user" },
	admin: { type: Boolean, default: false },
	created_at: { type: Date, default: Date.now },
	updated_at: { type: Date }
});

userSchema.pre('save', function(next){
	/*
		Update created and modified at dates
	*/
	var currentDate = new Date();
	this.updated_at = currentDate;
	if (!this.created_at) this.created_at = currentDate;
	next();
});

userSchema.pre('save', function(next) {
	/*
		Ensure that if there is no password set,
		the user cannot be an administrator
	*/
	if (!this.password) {
		this.admin = false;
	}
	next();
});

userSchema.pre('save', function(next){
	var user = this;

	// only has the password if it has been modified (or is new)
	if (!user.isModified('password')) return next();

	bcrypt.genSalt(SALT_WORK_FACTOR, function (error, salt) {
		if (error) return next(error);

		// hash the password along with the salt
		bcrypt.hash (user.password, salt, function(error, hash){
			if (error) return next(error);

			//override cleartext password with hashed password
			user.password = hash;
			next();
		})
	});
});

userSchema.methods.comparePassword = function(candidatePassword, cb) {
	bcrypt.compare(candidatePassword, this.password, function (error, isMatch){
		if (error) return cb(error);
		cb(null, isMatch);
	});
};

userSchema.methods.generateToken = function(cb) {
	var user = this;
	console.log("user.js: generating token for user: "+ user.name);
	console.log("users.js: and email: "+ user.email);
	var payload = {
		_id: user._id,
	};
	var token = jwt.sign(payload, process.env.SECRET, {
		expiresIn: '7 days' //expires in 7 days
	});
	if(cb) {
		cb(null, token);
	} else {
		return token;
	}	
};

var User = mongoose.model('User', userSchema);

module.exports = User;