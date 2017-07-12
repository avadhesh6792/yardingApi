var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var moment = require('moment');

var Group = new Schema({
    group_name            : {type: String, default: ''},
    group_pic             : {type: String, default: ''},
    user_id                 : ObjectId,
    members_id              : { type: Array, default: []},
    created_timestamp     : { type: Number}
}, { timestamps: true});

module.exports = mongoose.model('Group', Group);

