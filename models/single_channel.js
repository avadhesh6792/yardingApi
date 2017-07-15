var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var moment = require('moment');

var Single_Channel = new Schema({
    
    user_id :   {type: Array, default: []},
    
    created_timestamp     : { type: Number}
}, { timestamps: true});

module.exports = mongoose.model('Single_Channel', Single_Channel);

