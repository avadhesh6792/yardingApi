var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var User = new Schema({
    name        : {type: String, required: true},
    college     : {type: String, required: true},
    status      : String,
    display_pic : {type: String},
    cover_pic   : String,
    phone_no    : {type: String},
    token_id    : {type: String, default: ''}
});

module.exports = mongoose.model('User', User);


