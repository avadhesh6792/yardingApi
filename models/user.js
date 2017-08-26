var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var User = new Schema({
    name        : {type: String, required: true, default: ''},
    college     : {type: String, required: true, default: ''},
    status      : {type: String, default: ''},
    display_pic : {type: String, default: ''},
    cover_pic   : {type: String, default: ''},
    phone_no    : {type: String, default: ''},
    token_id    : {type: String, default: ''},
    badge       : {type: Number, default: 0}    
});

module.exports = mongoose.model('User', User);


