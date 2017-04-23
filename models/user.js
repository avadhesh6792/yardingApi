var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var User = new Schema({
    name        : {type: String, required: true},
    college     : {type: String, required: false},
    display_pic : {type: String}
});

module.exports = mongoose.model('User', User);


