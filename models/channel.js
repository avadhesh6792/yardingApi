var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var moment = require('moment');

var Channel = new Schema({
    channel_name            : {type: String, default: ''},
    channel_description     : {type: String, default: ''},
    channel_pic             : {type: String, default: ''},
    channel_type            : {type: String, default: ''}, // public, private
    user_id                 : ObjectId,
    members_id              : { type: Array, default: []},
    link                    : { type: String, default: '' },
    created_timestamp     : { type: Number, default: moment().unix()}
}, { timestamps: true});

module.exports = mongoose.model('Channel', Channel);

