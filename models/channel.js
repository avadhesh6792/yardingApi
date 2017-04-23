var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var Channel = new Schema({
    channelName   : {type: String},
    userId        : ObjectId,
});

module.exports = mongoose.model('Channel', Channel);

