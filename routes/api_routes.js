var express = require('express');
var app = express();


var user = require('./api/user');

app.use('/user', user);

module.exports = app;
