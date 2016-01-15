#Dropbox Emailer

The app watches a specific Dropbox account. When a new file is added to the Dropbox, the app evaluates whether the file meets specified criteria (a .pdf exstension, for instance) and if so, emails the file to users that have signed up for the app, confirmed their email, and had their account confirmed by an administrator.

##Getting Started

Clone the repo. In the root folder, create a `.env` file. This file should have the following contents:

	NODE_ENV=development
	SECRET=random-string
	DB_APP_KEY=dropbox-app-key
	DB_APP_SECRET=dropbox-app-secret
	DATABASE=mongodb://localhost:27017/dbemailer
	DOMAIN=localhost:3000


The `secret` is used to sign JSON Web Tokens issued to users and can be any random string of charachters. `dbAppKey` and `dbAppSecret` come from your Dropbox developer page. `DATABASE` is the URI for your Mongo instance. `DOMAIN` is used to generate the correct confirm and unsubscribe links in emails the app generates.

If you're running the app on Heroku, use commands like `heroku config:set SECRET=random-string` to set the variables. (`NODE_ENV` will automatically be set to production and the app is set up to use the MongoLab add-on and will automatically reference `MONGOLAB_URI`, so you don't need to set the `DATABASE` variable).

To run the app execute `./bin/www`.