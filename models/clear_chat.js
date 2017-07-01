var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var moment = require('moment');

var Clear_chat = new Schema({
    channel_id            : ObjectId,
    user_id               : ObjectId,
    date                  : { type : Date}
}, { timestamps: true});

module.exports = mongoose.model('Clear_chat', Clear_chat);


