var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var Block_user = new Schema({
    block_by            : ObjectId,
    block_to            : ObjectId,
}, { timestamps: true});

module.exports = mongoose.model('Block_user', Block_user);
