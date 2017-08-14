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
var request = require('request');
var url = require('url');
var arrayFind = require('array-find');
var apn = require('apn');
var appRoot = require('app-root-path');

exports.createSingleChannel = function (user_ids, callback) {
    var bind = {};
    var user_id1 = user_ids.user_id1;
    var user_id2 = user_ids.user_id2;
    console.log('**** inside create single channel ****');
    console.log('user_id1 ' + user_id1);
    console.log('user_id2 ' + user_id2);
    Channel.findOne({$or: [{'members_id.user_id': ObjectId(user_id1), 'members_id.user_id': ObjectId(user_id2), room_type: 'single'}, {_id: ObjectId(user_id2)}]}, function (err, single_channel) {
    //Channel.findOne({ members_id: {$elemMatch: {$eq: ObjectId(user_id1)}}, members_id: { $elemMatch: {$eq: ObjectId(user_id2)}}, room_type: 'single'}, function (err, single_channel) {
        if (single_channel) {
            bind.channel_id = single_channel._id;
            console.log('inside single channel');
            callback(bind);
        } else {

            var newSingle_channel = new Channel;
            newSingle_channel.members_id.push({ user_id: ObjectId(user_id1), online_status: true}, { user_id: ObjectId(user_id2), online_status: false});
            newSingle_channel.created_timestamp = moment().unix();
            newSingle_channel.room_type = 'single';
            newSingle_channel.channel_name = user_id1 + '_' + user_id2;

            newSingle_channel.save(function (err) {
                if (err) {
                    bind.channel_id = '';
                } else {
                    bind.channel_id = newSingle_channel._id;
                    bind.single_channel = newSingle_channel;
                }
                callback(bind);
            });
        }
    });
};

exports.setUserOffline = function(jsonData, socket, callback){
    var user_id = jsonData.user_id;
    var channel_id = jsonData.channel_id;
    var bind = {};
    
    Channel.findOne({_id: channel_id}, function(err, channel){
        if(err){
            bind.status = 0;
            bind.message = 'Oops! error occured while fetching channel by channel id';
            callback(bind);
        }
        if (channel) {
            var index = channel.members_id.findIndex(member_id => member_id.user_id == user_id);
            if (index > -1) {
                console.log('*** join channel and user id  not exists in the member ids array');
                channel.members_id[index].online_status = false;
                channel.save(function (err) {
                    if (err) {
                        bind.status = 0;
                        bind.message = 'Oops! error occured while saving user online status';
                    } else {
                        bind.status = 1;
                        bind.message = 'User online status was updated successfully';
                    }
                    callback(bind);
                });
            }
        } else {
            bind.status = 0;
            bind.message = 'Oops! channel not found';
            callback(bind);
        }
        
    });
} 

exports.setUserOnline = function(jsonData, socket, callback){
    var user_id = jsonData.user_id;
    var channel_id = jsonData.channel_id;
    var bind = {};
    
    Channel.findOne({_id: channel_id}, function(err, channel){
        if(err){
            bind.status = 0;
            bind.message = 'Oops! error occured while fetching channel by channel id';
            callback(bind);
        }
        if (channel) {
            var index = channel.members_id.findIndex(member_id => member_id.user_id == user_id);
            if (index > -1) {
                console.log('*** join channel and user id  not exists in the member ids array');
                channel.members_id[index].online_status = true;
                channel.save(function (err) {
                    if (err) {
                        bind.status = 0;
                        bind.message = 'Oops! error occured while saving user online status';
                    } else {
                        bind.status = 1;
                        bind.message = 'User online status was updated successfully';
                    }
                    callback(bind);
                });
            }
        } else {
            bind.status = 0;
            bind.message = 'Oops! channel not found';
            callback(bind);
        }
        
    });
} 

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
            //var index = channel.members_id.indexOf(new ObjectId(user_id));
            var index = channel.members_id.findIndex(member_id => member_id.user_id == user_id);
//            var index = -1;
//            for(var i = 0; i< channel.members_id.length ; i++){
//                if(channel.members_id[i].user_id == ObjectId(user_id)){
//                    index = i;
//                    break;
//                }
//            }
//            var index = -1;
//            arrayFind(channel.members_id, function(member, i){
//                if(member.user_id == user_id){
//                    index = i;
//                    return;
//                }
//            });
            
            if (index == -1) {
                console.log('*** join channel and user id  not exists in the member ids array');
                channel.members_id.push({user_id: new ObjectId(user_id), online_status: true});
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
                console.log('*** join channel and user id   exists in the member ids array');
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

exports.sendMessageToOfflineUser = function(jsonData, socket, callback){
    var channel_id = jsonData.channel_id;
    var user_id = jsonData.user_id;
    var message = jsonData.message;
    var message_type = jsonData.message_type;
    
    // send notification to user
    var deviceToken = '';
    var alert = '';
    var payload = {
        extra_data: {}
    };
    
    Channel.findOne({ '_id': channel_id }, function(err, channel){
        if(channel){
            if(channel.members_id.length > 0){
                var offline_user_ids = channel.members_id.map(function(member){
                    if(member.online_status == false){
                        return member.user_id;
                    }
                });
                
                User.findOne( { _id: user_id }, function(err, sender){
                    var sender_name = sender.name;
                    User.find({ _id: { $in: offline_user_ids} }, function(err, users){
                        if(users.length > 0 ){
                            users.forEach(function(user){
                                if(user.token_id){
                                    deviceToken = user.token_id;
                                    var room_type = channel.room_type;
                                    var channel_name = channel.channel_name;
                                    alert = '@ '+sender_name+' send you message '+ channel_name + ' ' + room_type ;
                                    payload.notification_type = 'channel_chat';
                                    payload.extra_data.channel_id = channel_id;
                                    sendAPNotification(deviceToken, alert, payload);
                                }
                            });
                        }
                    });
                    
                });
                
                
            }
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
    var thumbnail = jsonData.thumbnail;
    
    newChannel_chat.channel_id = channel_id;
    newChannel_chat.user_id = user_id;
    newChannel_chat.message = message;
    newChannel_chat.message_type = message_type;
    newChannel_chat.created_timestamp = moment().unix();
    newChannel_chat.thumbnail = thumbnail ? thumbnail : '';

    if (message_type == 'video') {
        var msgArray = message.split(",");
        newChannel_chat.message = msgArray[0];
        newChannel_chat.thumbnail = msgArray[1];
    }

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

function sendAPNotification(deviceToken, alert, payload){
    var options = {
        cert: appRoot + "/config/cert.pem",
        key: appRoot + "/config/key.pem",
        production: false
      };

    var apnProvider = new apn.Provider(options);
    //var deviceToken = "9714BC5CA55696CF6AC89BE9A62277B8F3D1BCF85CB7E65D1937A1B3288284A4";
    var note = new apn.Notification();

    //note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
    //note.badge = 3;
    //note.sound = "ping.aiff";
    note.alert = alert;
    note.payload = payload;
    note.topic = "com.yardingllc.yarding";
    
    apnProvider.send(note, deviceToken).then( function(result) {
        // see documentation for an explanation of result
        console.log('notification result '+ JSON.stringify(result));
        //return res.json(result);
    });
}


