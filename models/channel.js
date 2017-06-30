var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
//require('mongoose-moment')(mongoose);

var Channel = new Schema({
    channel_name            : {type: String, default: ''},
    channel_description     : {type: String, default: ''},
    channel_pic             : {type: String, default: ''},
    channel_type            : {type: String, default: ''}, // public, private
    user_id                 : ObjectId,
    members_id              : { type: Array, default: []},
    link                    : { type: String, default: '' },
    createdAt               : 'Moment'
});

module.exports = mongoose.model('Channel', Channel);

