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
    
    var objFeed           = new UserPosts();
    objFeed.author_email  = socket.request.user.local.email;
    objFeed.postType      = "text";
    objFeed.privacyType   = req.privacyType;
    objFeed.text          = req.text;
    objFeed.createdAt     = new Date();
    console.log('------------------- '+JSON.stringify(req.images));
    if(req.images != "" && req.images != undefined){
        objFeed.images = req.images;
    }
    objFeed.save(function (err, addedData) {
        if(err){
            console.log('error while saving : err : '+err);
            callback('error');
        } else {
            console.log('saved into database : success');
            callback(req.images,req.text,addedData._id);
        }
    });
}


