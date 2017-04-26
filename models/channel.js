var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var Channel = new Schema({
    channel_name            : {type: String},
    channel_description     : {type: String},
    channel_pic             : {type: String},
    channel_type            : {type: String, default: ''}, // public, private
    user_id                 : ObjectId,
    //members_id              : { type: Array},
    link                    : { type: String }
});

module.exports = mongoose.model('Channel', Channel);

