var express     = require('express');
var path        = require('path');
var cookieParser = require('cookie-parser');
var User        = require('../models/user');
var Channel = require('../models/channel');

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


