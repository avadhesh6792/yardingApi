var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var User = require('../models/user');
var Channel = require('../models/channel');
var Channel_chat = require('../models/channel_chat');
var Single_channel = require('../models/single_channel');
var Mongoose = require('mongoose');
var ObjectId = Mongoose.Types.ObjectId;
var Clear_chat = require('../models/clear_chat');
var moment = require('moment');

exports.createSingleChannel = function(user_ids, callback){
    var bind = {};
    var user_id1 = ObjectId(user_ids.user_id1);
    var user_id2 = ObjectId(user_ids.user_id2);
    console.log('**** inside create single channel ****');
    console.log('user_id1 '+ user_id1);
    console.log('user_id2 '+ user_id2);
    Channel.findOne({ members_id: { $elemMatch: { $eq: user_id1 } }, members_id: { $elemMatch: { $eq: user_id2 } }, room_type: 'single' }, function(err, single_channel){
        if(single_channel){
            bind.channel_id = single_channel._id;
            console.log('inside single channel');
            callback(bind);
        } else {
            
            var newSingle_channel = new Channel;
            newSingle_channel.members_id.push(user_id1, user_id2);
            newSingle_channel.created_timestamp = moment().unix();
            newSingle_channel.room_type = 'single';
            newSingle_channel.channel_name = user_id1 + '_' + user_id2;

            newSingle_channel.save(function(err){
                if(err){
                    bind.channel_id = '';
                } else {
                    bind.channel_id = newSingle_channel._id;
                }
                callback(bind);
            });
        }
    });
};

exports.joinChannel = function (jsonData, socket, callback) {
    var user_id = jsonData.user_id;
    var channel_id = jsonData.channel_id;
    var bind = {};
    Channel.findOne({_id: channel_id}, function (err, channel) {
        if (err) {
            bind.status = 0;
            bind.message = 'Oops! error occured while fetching channel by channel id';
            callback(bind);
        }
        if (channel) {

            var index = channel.members_id.indexOf(new ObjectId(user_id));
            if (index == -1) {
                channel.members_id.push(new ObjectId(user_id));
                channel.save(function (err) {
                    if (err) {
                        bind.status = 0;
                        bind.message = 'Oops! error occured while saving members id';
                    } else {
                        bind.status = 1;
                        bind.message = 'Members id was saved successfully';
                    }
                    callback(bind);
                });
            } else {
                bind.status = 0;
                bind.message = 'User is already channel member';
                callback(bind);
            }

        } else {
            bind.status = 0;
            bind.message = 'Oops! channel not found';
            callback(bind);
        }
    });
}

exports.saveMessage = function (jsonData, socket, callback) {
    var bind = {};
    var newChannel_chat = new Channel_chat;
    var channel_id = jsonData.channel_id;
    var user_id = jsonData.user_id;
    var message = jsonData.message;
    var message_type = jsonData.message_type;
    newChannel_chat.channel_id = channel_id;
    newChannel_chat.user_id = user_id;
    newChannel_chat.message = message;
    newChannel_chat.message_type = message_type;
    newChannel_chat.created_timestamp = moment().unix();
    newChannel_chat.save(function (err) {
        if (err) {
            bind.status = 0;
            bind.message = 'Oops! error occured while saving message';
            callback(bind);
        } else {
            Channel_chat.aggregate([
                {
                    $match: {
                        _id: newChannel_chat._id
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $unwind: "$user"
                },
                {
                    $project: {'user.phone_no': 0, 'user.token_id': 0, '__v': 0, 'user.__v': 0}
                }

            ], function (err, channel_chat) {
                if (err) {
                    bind.status = 0;
                    bind.message = 'Oops! error occured while fetching channel chats';
                    bind.error = err;
                } else if (channel_chat.length > 0) {
                    bind.status = 1;
                    bind.channel_chat = channel_chat;
                } else {
                    bind.status = 0;
                    bind.message = 'No channel chats found';
                }
                callback(bind);
            });
        }

    });
}

exports.getChannelMessages = function (jsonData, socket, callback) {
    var channel_id = jsonData.channel_id;
    var user_id = jsonData.user_id;
    var bind = {};
    Clear_chat.findOne({'channel_id': ObjectId(channel_id), 'user_id': ObjectId(user_id)}, function (err, clear_chat) {
        if (clear_chat) {

            Channel_chat.aggregate([
                {
                    $match: {
                        channel_id: ObjectId(channel_id),
                        updatedAt: {$gt: clear_chat.updatedAt}
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $unwind: "$user"
                },
                {
                    $project: {'user.phone_no': 0, 'user.token_id': 0, '__v': 0, 'user.__v': 0}
                },
                {
                    $sort: {createdAt: 1}
                }

            ], function (err, channel_chat) {
                if (err) {
                    bind.status = 0;
                    bind.message = 'Oops! error occured while fetching channel chats';
                    bind.error = err;
                } else if (channel_chat.length > 0) {
                    bind.status = 1;
                    bind.channel_chat = channel_chat;
                } else {
                    bind.status = 0;
                    bind.message = 'No channel chats found';
                }
                callback(bind);
            });

        } else {
            Channel_chat.aggregate([
                {
                    $match: {
                        channel_id: ObjectId(channel_id)
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $unwind: "$user"
                },
                {
                    $project: {'user.phone_no': 0, 'user.token_id': 0, '__v': 0, 'user.__v': 0}
                },
                {
                    $sort: {createdAt: 1}
                }

            ], function (err, channel_chat) {
                if (err) {
                    bind.status = 0;
                    bind.message = 'Oops! error occured while fetching channel chats';
                    bind.error = err;
                } else if (channel_chat.length > 0) {
                    bind.status = 1;
                    bind.channel_chat = channel_chat;
                } else {
                    bind.status = 0;
                    bind.message = 'No channel chats found';
                }
                callback(bind);
            });
        }
    });
}


