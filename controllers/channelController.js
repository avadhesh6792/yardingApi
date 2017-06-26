var express     = require('express');
var path        = require('path');
var cookieParser = require('cookie-parser');
var User        = require('../models/user');
var Channel = require('../models/channel');
var Channel_chat = require('../models/channel_chat');

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
            channel.members_id.push(user_id);
            channel.save(function(err){
                if(err){
                    bind.status = 0;
                    bind.message = 'Oops! error occured while saving members id';
                    callback(bind);
                } else {
                    bind.status = 1;
                    bind.message = 'Members id was saved successfully';
                    callback(bind);
                }
            });
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
        } else {
            bind.status = 1;
            bind.message = 'Message was saved successfully';
        }
        callback(bind);
    });
    
}


