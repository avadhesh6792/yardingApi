var express     = require('express');
var path        = require('path');
var cookieParser = require('cookie-parser');
var User        = require('../models/user');
var Channel = require('../models/channel');
var Channel_chat = require('../models/channel_chat');
var Mongoose = require('mongoose');
var ObjectId = Mongoose.Types.ObjectId;


exports.joinChannel = function (jsonData, socket, callback) {
    var user_id = jsonData.user_id;
    var channel_id = jsonData.channel_id;
    var bind = {};
    
    Channel.findOne({ _id: channel_id }, function(err, channel){
        if(err){
            bind.status = 0;
            bind.message = 'Oops! error occured while fetching channel by channel id';
            callback(bind);
        }
        if(channel){
            
            var index = channel.members_id[user_id];
            if(index == undefined){
               channel.members_id.push(user_id);
                channel.save(function(err){
                    if(err){
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

exports.saveMessage = function(jsonData, socket, callback){
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
    newChannel_chat.save(function(err){
        if(err){
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
                $project: { 'user.phone_no' : 0, 'user.token_id': 0, '__v': 0 }
            }

        ], function(err, channel_chat){
            if(err){
                bind.status = 0;
                bind.message = 'Oops! error occured while fetching channel chats';
                bind.error = err;
            } else if(channel_chat) {
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

exports.getChannelMessages = function(jsonData, socket, callback){
    var channel_id = jsonData.channel_id;
    var bind = {};
    
    Channel_chat.aggregate([
        {
            $match: {
                channel_id: new ObjectId(channel_id)
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
            $project: { 'user.phone_no' : 0, 'user.token_id': 0, '__v': 0 }
        }
        
    ], function(err, channel_chat){
        if(err){
            bind.status = 0;
            bind.message = 'Oops! error occured while fetching channel chats';
            bind.error = err;
        } else if(channel_chat) {
            bind.status = 1;
            bind.channel_chat = channel_chat;
        } else {
            bind.status = 0;
            bind.message = 'No channel chats found';
        }
        callback(bind);
    });
    
    
}


