var express             = require("express");

var app                         = express();
var morgan                      = require('morgan');
var config                      = require('./config');
var users                       = require('./routes/users');


app.use(morgan('dev'));

app.use(express.static('public'));


app.use('/users', users);

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(error, request, response, next) {
        response.status(error.status || 500);
        response.render('error.ejs', {
            message: error.message,
            error: error
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(error, request, response, next) {
    res.status(err.status || 500);
    res.render('error.ejs', {
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