var express                     = require("express");
var app                         = express();
var morgan                      = require('morgan');
var users                       = require('./routes/users');
var authenticate                = require('./routes/authentication');
var db                          = require('./routes/db');
var mongoose                    = require('mongoose');
var exphbs                      = require('express-handlebars');
var nodeEnvFile                 = require('node-env-file');
var port = process.env.PORT || 3000; //used to create, sign and verify tokens

// use .env for enviornment variables in development
// set them via heroku for production
nodeEnvFile(__dirname + '/.env', {raise: false});

var databaseUri = process.env.MONGOLAB_URI || process.env.DATABASE;
mongoose.connect(databaseUri);

app.engine('handlebars', exphbs({defaultLayout: 'main'}));
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
    console.log('getting home');
    response.render('home');
});

app.get('/admin', authenticate, function (request, response, next){
    console.log('trying to render admin');
    response.render('admin');
});

app.get('/login', function (request, response, next) {
    response.render('login');
});


// development error handler
// will print stacktrace
if (process.env.NODE_ENV === 'development') {
    app.use(function(error, request, response, next) {
        response.status(error.status || 500);
        response.render('error', {
            message: error.message,
            error: error
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(error, request, response, next) {
    console.log("ERROR: " + error.message);
    response.status(error.status || 500).send('error');
    response.render('error', {
        message: error.message,
        error: {}
    });
});

app.use(function(request, response, next) {
        var error = new Error('Not Found');
        error.status = 404;
        next(error);
});

module.exports = app;