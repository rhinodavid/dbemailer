// use .env for enviornment variables in development
// set them via heroku for production
var nodeEnvFile                 = require('node-env-file');
nodeEnvFile(__dirname + '/.env', {raise: false});

var express                     = require("express");
var app                         = express();
var morgan                      = require('morgan');
var users                       = require('./routes/users');
var authenticate                = require('./routes/authentication');
var db                          = require('./routes/db');
var mongoose                    = require('mongoose');
var exphbs                      = require('express-handlebars');
var port = process.env.PORT || 3000; //used to create, sign and verify tokens


var databaseUri = process.env.MONGOLAB_URI || process.env.DATABASE;
mongoose.connect(databaseUri);

app.engine('handlebars', exphbs({
                                defaultLayout: 'main',
                                layoutsDir: __dirname + '/views/layouts'
                                }));
app.set('view engine', 'handlebars');


if (process.env.NODE_ENV == "development") {
   app.use(morgan('dev')); 
} else {
    app.use(morgan('common'));
}


app.use(express.static('public'));

app.use('/users', users);
app.use('/db', db);


app.get('/', function (request, response, next) {
    response.render('home');
});

app.get('/admin', authenticate, function (request, response, next){
    response.render('admin');
});

app.get('/login', function (request, response, next) {
    response.render('login');
});

app.use(function (request, response, next) {
        var error = new Error('The URL you entered wasn\'t found.');
        error.status = 404;
        console.log('calling next');
        next(error);
});

if (process.env.NODE_ENV === 'development') {
    // development error handler
    // will print stacktrace
    app.use(function (error, request, response, next) {
        console.error('Dev Error: ', error.message);
        response.status(error.status || 500);
        response.render('error', {
            message: error.message,
            error: error
        });
    });
} else {
    // production error handler
    // no stacktraces leaked to user
    app.use(function (error, request, response, next) {
        console.error("Prod Error: ", error.message);
        response.status(error.status || 500);
        response.render('error', {
            message: error.message
        });
    });
}

module.exports = app;