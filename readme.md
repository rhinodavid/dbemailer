#Dropbox Emailer

The app watches a specific dropbox. When a new file is added to the Dropbox, the app evaluates whether the file meets specified criteria (a .pdf exstension, for instance) and if so, emails the file to users that have signed up for the app.

##Getting Started

Clone the repo. In the root folder, create a `private-config.js` file. This file should have the following format:

	module.exports = {
		'secret': 'some-secret'
		'dbAppKey' : 'dropbox-app-key',
		'dbAppSecret': 'dropbox-app-secret'
	}

The `secret` is used to sign JSON Web Tokens issued to users and can be any random string of charachters. `dbAppKey` and `dbAppSecret` come from your Dropbox developer page.

To run the app execute `./bin/www`.