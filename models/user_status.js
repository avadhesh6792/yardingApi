var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var moment = require('moment');

var User_status = new Schema({
    user_id               : ObjectId,
    status                : { type : String, default: ''}
}, { timestamps: true});

module.exports = mongoose.model('User_status', User_status);


