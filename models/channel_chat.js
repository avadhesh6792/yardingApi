var mongoose = require('mongoose');
require('mongoose-moment')(mongoose);
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;



var Channel_chat = new Schema({
    channel_id            : ObjectId,
    user_id               : ObjectId,
    message               : {type: String, default: ''},
    message_type          : {type: String, default: ''},
    createdAt               : 'Moment'
});

module.exports = mongoose.model('Channel_chat', Channel_chat);


