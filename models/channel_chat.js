var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var moment = require('moment');

var Channel_chat = new Schema({
    channel_id            : ObjectId,
    user_id               : ObjectId,
    message               : {type: String, default: ''},
    message_type          : {type: String, default: ''},
    created_timestamp     : { type: Number}
}, { timestamps: true});

module.exports = mongoose.model('Channel_chat', Channel_chat);


