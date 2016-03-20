#Dropbox Emailer

The app watches a specific Dropbox account. When a new file is added to the Dropbox, the app evaluates whether the file meets specified criteria (a .pdf exstension, for instance) and if so, emails the file to users that have signed up for the app, confirmed their email, and had their account confirmed by an administrator.

##Installing your own instance

You'll need to setup your Dropbox developer account and create a new app for Dropbox Emailer. Add `http://localhost:3000/db/addoauth` and the `/db/addauth` directory of your production URL as OAuth 2 Redirect URIs. Add the `/db/webhook` endpoint as a Webhook URI.

You'll also need to configure a Mailgun account and domain for use with Dropbox Emailer. You can use the sandbox domain and key for your development `.env` file and then set the config variables in Heroku with your production values.

Clone the repo. In the root folder, create a `.env` file. This file should have the following contents and be setup for your development environment:

	NODE_ENV=development
	SECRET=random-string
	DB_APP_KEY=dropbox-app-key
	DB_APP_SECRET=dropbox-app-secret
	DATABASE=mongodb://localhost:27017/dbemailer
	DOMAIN=localhost:3000
	HTTP_SCHEME=http://
	MAILGUN_API_KEY=mailgun-api-key
	MAILGUN_EMAIL_DOMAIN=yourdomain.com


The `secret` is used to sign JSON Web Tokens issued to users and can be any random string of charachters. `dbAppKey` and `dbAppSecret` come from your Dropbox developer page. `DATABASE` is the URI for your Mongo instance. I used mLab's MongoDB service (it's free for small projects). `DOMAIN` is used to generate the correct confirm and unsubscribe links in emails the app generates. `HTTP_SCHEME` defaults to `https://` but should be manually set to `http://` if you're running a non-secure development server (you probably are). The production site must use `https://` otherwise Dropbox connectivity won't work.

If you're running the app on Heroku, use commands like `heroku config:set SECRET=random-string` to set the variables for your production environment, as the `.env` file will not be uploaded to Heroku. (`NODE_ENV` will automatically be set to production and the app is set up to use the MongoLab add-on and will automatically reference `MONGOLAB_URI`, so you don't need to set the `DATABASE` variable).

To run the app locally execute `./bin/www`. To get the app in production push the repositiory to Heroku or your provider of choice.

###customizing the app

To change what file types are emailed, in the `routes/dj.js` file go to the `/webhook` endpoint. Look for the `getMailgunAttachments` and change the array that is the value of the `filter` key to include all the file exstensions you want mailed. 

You may also want to change the logos in the `public` directory.

##Getting started

Once you've got a live site, sign up with your name and email. If you're the first user you'll automatically be assigned as the admin and the site will generate a password for you. Copy it down as it won't be displayed again. From there visit the `/admin` endpoint to change your password, connect to a Dropbox, confirm users, and delete users.

##Confirming users

Once a user signs up an email is sent to her to confirm her address. Prior to visiting the URL in the email the user's status is 'pending-user'. Once the user visits the URL, her status is changed to 'pending-admin'. In the administrator panel click on the user status to change it to 'confirmed'. Only users with status 'confirmed' will get files distributed to them.