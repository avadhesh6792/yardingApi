var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var Channel_request = new Schema({
    channel_id            : ObjectId,
    user_id               : ObjectId,
    status                : { type: Boolean, default: false }, // true => approved
}, { timestamps: true});

module.exports = mongoose.model('Channel_request', Channel_request);


