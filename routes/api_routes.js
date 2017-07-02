var express = require('express');
var app = express();


var user = require('./api/user');
var channel = require('./api/channel');
var group = require('./api/group');

app.use('/user', user);
app.use('/channel', channel);
app.use('/group', group);

module.exports = app;
