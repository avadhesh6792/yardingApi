var express = require('express');
var app = express();


var user = require('./api/user');
var channel = require('./api/channel');

app.use('/user', user);
app.use('/channel', channel);

module.exports = app;
