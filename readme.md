#Dropbox Emailer

The app watches a specific Dropbox account. When a new file is added to the Dropbox, the app evaluates whether the file meets specified criteria (a .pdf exstension, for instance) and if so, emails the file to users that have signed up for the app, confirmed their email, and had their account confirmed by an administrator.

##Getting Started

Clone the repo. In the root folder, create a `private-config.js` file. This file should have the following contents:

	module.exports = {
		'secret': 'some-secret'
		'dbAppKey' : 'dropbox-app-key',
		'dbAppSecret': 'dropbox-app-secret'
	}

The `secret` is used to sign JSON Web Tokens issued to users and can be any random string of charachters. `dbAppKey` and `dbAppSecret` come from your Dropbox developer page.

To run the app execute `./bin/www`.