var express = require('express');
var router = express.Router();
var multer = require('multer');
var Channel = require('../../models/channel');
var Mongoose = require('mongoose');
var ObjectId = Mongoose.Types.ObjectId;
var Clear_chat = require('../../models/clear_chat');
var Channel_chat = require('../../models/channel_chat');
var Channel_request = require('../../models/channel_request');
var User = require('../../models/user');
var moment = require('moment');
var arraySort = require('array-sort');
var arrayFind = require('array-find');
var appRoot = require('app-root-path');
var ffmpeg = require('fluent-ffmpeg');
var apn = require('apn');

var Storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, "./public/uploads/channel_pic");
    },
    filename: function (req, file, callback) {
        //console.log('aaaaaa'+ JSON.stringify(file) );
        callback(null, Date.now() + "_" + file.originalname);
    }
});

var upload = multer({storage: Storage}).single("channel_pic");

var chatStorage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, "./public/uploads/chat_media");
    },
    filename: function (req, file, callback) {
        callback(null, Date.now() + "_" + file.originalname);
    }
});

var chatUpload = multer({storage: chatStorage}).single("chat_media");

// create new channel doc
router.get('/create-channel/doc', function (req, res, next) {
    var bind = {};
    bind.field_name = ['channel_name', 'channel_description', 'link', 'channel_type', 'user_id', 'channel_pic'];
    bind.method = 'post';
    bind.type = 'multipart';
    res.json(bind);
});

// create new channel
router.post('/create-channel', function (req, res, next) {
    var bind = {};
    upload(req, res, function (err) {
        if (err) {
            bind.status = 0;
            bind.message = 'Oops! error occur while uploading channel picture.';
            bind.error = err;
            return res.json(bind);
        }

        var channel_name = req.body.channel_name;
        var channel_description = req.body.channel_description;
        var channel_type = req.body.channel_type; // 'public', 'private'
        var user_id = req.body.user_id;
        var channel_pic = req.file ? 'uploads/channel_pic/' + req.file.filename : 'uploads/default/default-channel.jpg';
        var link = req.body.link;

        //Channel.findOne({ $or : [{link: link}, {channel_name: channel_name}]}, function (err, channel) {
        Channel.findOne({channel_name: channel_name}, function (err, channel) {

            if (!channel) {
                var newChannel = new Channel;
                newChannel.channel_name = channel_name;
                newChannel.channel_description = channel_description;
                newChannel.channel_type = channel_type;
                newChannel.channel_pic = channel_pic;
                newChannel.user_id = user_id;
                newChannel.admin_id = user_id;
                newChannel.link = link;
                newChannel.members_id.push(new ObjectId(user_id));
                newChannel.created_timestamp = moment().unix();
                newChannel.room_type = 'channel';

                newChannel.save(function (err) {
                    if (err) {
                        bind.status = 0;
                        bind.message = 'Oops! error occur while creating new channel';
                        bind.error = err;
                    } else {
                        bind.status = 1;
                        bind.message = 'Channel was created successfully';
                        bind.channel = newChannel;
                    }
                    return res.json(bind);
                });
            } else {
                bind.status = 0;
//                if(channel.link == link){
//                    bind.message = 'link is already exists!';
//                } else {
//                    bind.message = 'channel name is already exists!';
//                }
                bind.message = 'channel name is already exists!';
                return res.json(bind);
            }
        });
    });
});

// get all single channel
router.get('/get-all-single-channels/:user_id', function (req, res, next) {
    var bind = {};
    var user_id = ObjectId(req.params.user_id);
    Channel.aggregate([
        {
            $match : { members_id: { $elemMatch: { $eq: user_id } }, room_type: 'single' }
        },
        {
            $lookup: {
                from: 'channel_chats',
                localField: '_id',
                foreignField: 'channel_id',
                as: 'latest_chat'
            }
        },
        {
            $sort: {'latest_chat.createdAt': -1}
        },
        {
            //$project: {updatedAt: 1, createdAt: 1, admin_id: 1, user_id: 1, created_timestamp: 1, link: 1, members_id: 1, channel_type: 1, channel_pic: 1, channel_description: 1, channel_name: 1, latest_chat: {"$arrayElemAt": ["$latest_chat", 0]}}
            $project: {updatedAt: 1, createdAt: 1, admin_id: 1, user_id: 1, created_timestamp: 1, link: 1, members_id: 1, channel_type: 1, channel_pic: 1, channel_description: 1, channel_name: 1, latest_chat: 1}
        }
    ], function (err, channels) {
        if (err) {
            bind.status = 0;
            bind.message = 'Oops! error occur while fetching all single channels';
            bind.err = err;
        } else if (channels.length > 0) {
            bind.status = 1;
            
            
            channels.forEach(function(item, index){
                if(item.latest_chat){
                    
                    var sort_array = arraySort(item.latest_chat, 'createdAt', {reverse: true});
                    channels[index].latest_chat = sort_array[0];
                }
                
            });
            
            bind.channels = channels;
        } else {
            bind.status = 0;
            bind.message = 'No single channels found';
        }
        return res.json(bind);

    });
});

// delete from chat channels
router.post('/delete-from-chat-channels', function(req, res, next){
    var bind = {};
    var user_id = ObjectId(req.body.user_id);
    var channel_id = ObjectId(req.body.channel_id);
    var room_type = req.body.room_type;
    
    Channel.findOne({ _id: channel_id }, function(err, channel){
        if(channel){
            var index = channel.members_id.indexOf(ObjectId(user_id));
            if (index > -1) {
                channel.members_id.splice(index, 1);
                
                if(channel.admin_id == user_id){
                    var admin_id = channel.members_id[Math.floor(Math.random()*channel.members_id.length)];
                    channel.admin_id = admin_id;
                }
                channel.save(function(err){
                    if(err){
                        bind.status = 0;
                        bind.message = 'Oops! error occured while deleting from chat channels';
                        bind.error = err;
                    } else{
                        bind.status = 1;
                        bind.message = 'Chats was deleted successfully';
                    }
                    return res.json(bind);
                });
                
            } else{
                bind.status = 0;
                bind.message = 'You are not member of this channel';
                res.json(bind);
            }
            
        } else{
            bind.status = 0;
            bind.message = 'No chat channel found';
            return res.json(bind);
        }
    });
});

// get all chat channels
router.get('/get-all-chat-channels/:user_id', function (req, res, next) {
    var bind = {};
    var user_id = ObjectId(req.params.user_id);
    Channel.aggregate([
        {
            $match : { members_id: { $elemMatch: { $eq: user_id } } }
        },
        {
            $lookup: {
                from: 'channel_chats',
                localField: '_id',
                foreignField: 'channel_id',
                as: 'latest_chat'
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'members_id',
                foreignField: '_id',
                as: 'members_info'

            }
        },
        {
            $sort: {'latest_chat.createdAt': -1}
        },
        {
            //$project: {updatedAt: 1, createdAt: 1, admin_id: 1, user_id: 1, created_timestamp: 1, link: 1, members_id: 1, channel_type: 1, channel_pic: 1, channel_description: 1, channel_name: 1, latest_chat: {"$arrayElemAt": ["$latest_chat", 0]}}
            $project: {updatedAt: 1, createdAt: 1, admin_id: 1, user_id: 1, created_timestamp: 1, link: 1, 
                'members_info._id': 1, 'members_info.name': 1, 'members_info.display_pic': 1, 'members_info.status': 1,
                channel_type: 1, channel_pic: 1, channel_description: 1, channel_name: 1, latest_chat: 1,
                room_type: 1}
        }
    ], function (err, channels) {
        if (err) {
            bind.status = 0;
            bind.message = 'Oops! error occur while fetching all chat channels';
            bind.err = err;
        } else if (channels.length > 0) {
            bind.status = 1;
            
            
            channels.forEach(function(item, index){
                if(item.latest_chat){
                    
                    var sort_array = arraySort(item.latest_chat, 'createdAt', {reverse: true});
                    channels[index].latest_chat = sort_array[0];
                }
                if(item.room_type == 'single'){
                    var other_member_info = arrayFind(item.members_info, function(info, index){
                        return info._id != req.params.user_id;
                    });
                    
                    if(other_member_info){
                        //channels[index].members_info_index = members_info_index;
                        channels[index].channel_name = other_member_info.name;
                        channels[index].channel_pic = other_member_info.display_pic;
                        channels[index].channel_description = other_member_info.status;
                    }
                    
                     
                }
                //channels[index].members_info = undefined;
            });
            
            bind.channels = channels;
        } else {
            bind.status = 0;
            bind.message = 'No chat channels found';
        }
        return res.json(bind);

    });
});

// search all chat channels
router.get('/search-all-chat-channels/:user_id/:search_term', function (req, res, next) {
    var bind = {};
    var user_id = ObjectId(req.params.user_id);
    var search_term = req.params.search_term;
    var pattern = new RegExp(search_term, 'i');
    Channel.aggregate([
        {
            $match : { members_id: { $elemMatch: { $eq: user_id } } }
        },
        {
            $lookup: {
                from: 'channel_chats',
                localField: '_id',
                foreignField: 'channel_id',
                as: 'latest_chat'
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'members_id',
                foreignField: '_id',
                as: 'members_info'

            }
        },
        {
            $sort: {'latest_chat.createdAt': -1}
        },
        {
            //$project: {updatedAt: 1, createdAt: 1, admin_id: 1, user_id: 1, created_timestamp: 1, link: 1, members_id: 1, channel_type: 1, channel_pic: 1, channel_description: 1, channel_name: 1, latest_chat: {"$arrayElemAt": ["$latest_chat", 0]}}
            $project: {updatedAt: 1, createdAt: 1, admin_id: 1, user_id: 1, created_timestamp: 1, link: 1, 
                'members_info._id': 1, 'members_info.name': 1, 'members_info.display_pic': 1, 'members_info.status': 1,
                channel_type: 1, channel_pic: 1, channel_description: 1, channel_name: 1, latest_chat: 1,
                room_type: 1}
        }
    ], function (err, channels) {
        if (err) {
            bind.status = 0;
            bind.message = 'Oops! error occur while fetching all chat channels';
            bind.err = err;
        } else if (channels.length > 0) {
            var search_channels = [];
            
            
            channels.forEach(function(item, index){
                if(item.latest_chat){
                    
                    var sort_array = arraySort(item.latest_chat, 'createdAt', {reverse: true});
                    channels[index].latest_chat = sort_array[0];
                }
                if(item.room_type == 'single'){
                    var other_member_info = arrayFind(item.members_info, function(info, index){
                        return info._id != req.params.user_id;
                    });
                    
                    //channels[index].members_info_index = members_info_index;
                    channels[index].channel_name = other_member_info.name;
                    channels[index].channel_pic = other_member_info.display_pic;
                    channels[index].channel_description = other_member_info.status;
                }
                channels[index].members_info = undefined;
                if(pattern.test(channels[index].channel_name)){
                    search_channels.push(item);
                }
            });
            
            if(search_channels.length > 0){
                bind.status = 1;
                bind.channels = search_channels;
            } else {
                bind.status = 0;
                bind.message = 'No chat channels found';
            }
        } else {
            bind.status = 0;
            bind.message = 'No chat channels found';
        }
        return res.json(bind);

    });
});

// get all channels
router.get('/get-all-channels', function (req, res, next) {
    var bind = {};
    Channel.aggregate([
        {
            $match : { room_type: 'channel' }
        },
        {
            $lookup: {
                from: 'channel_chats',
                localField: '_id',
                foreignField: 'channel_id',
                as: 'latest_chat'
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'members_id',
                foreignField: '_id',
                as: 'members_info'

            }
        },
        {
            $sort: {'latest_chat.createdAt': -1}
        },
        {
            //$project: {updatedAt: 1, createdAt: 1, admin_id: 1, user_id: 1, created_timestamp: 1, link: 1, members_id: 1, channel_type: 1, channel_pic: 1, channel_description: 1, channel_name: 1, latest_chat: {"$arrayElemAt": ["$latest_chat", 0]}}
            $project: {updatedAt: 1, createdAt: 1, admin_id: 1, user_id: 1, created_timestamp: 1, link: 1, channel_type: 1,
                channel_pic: 1, channel_description: 1, channel_name: 1, latest_chat: 1, room_type: 1, members_info: 1}
        }
    ], function (err, channels) {
        if (err) {
            bind.status = 0;
            bind.message = 'Oops! error occur while fetching all channels';
            bind.err = err;
        } else if (channels.length > 0) {
            bind.status = 1;
            
            
            channels.forEach(function(item, index){
                if(item.latest_chat){
                    
                    var sort_array = arraySort(item.latest_chat, 'createdAt', {reverse: true});
                    channels[index].latest_chat = sort_array[0];
                }
                
            });
            
            bind.channels = channels;
        } else {
            bind.status = 0;
            bind.message = 'No channels found';
        }
        return res.json(bind);

    });
});

// search channel
router.get('/search-channel/:term', function (req, res, next) {
    var bind = {};
    var term = req.param('term');
    var pattern = new RegExp(term, 'i');

    Channel.find({channel_name: {$regex: pattern}, room_type: 'channel'}, function (err, channels) {
        if (err) {
            bind.status = 0;
            bind.message = 'Oops! error occur while fetching all channels';
            bind.err = err;
        } else if (channels.length > 0) {
            bind.status = 1;
            bind.channels = channels;
        } else {
            bind.status = 0;
            bind.message = 'No channels found';
        }
        return res.json(bind);
    });


});

// remove channels of a user
router.get('/remove-channels/:user_id', function (req, res, next) {
    var bind = {};
    var user_id = req.param('user_id');

    Channel.remove({user_id: user_id}, function (err) {
        if (err) {
            bind.status = 0;
            bind.message = 'Oops! error occur while deleting channels';
            bind.err = err;
        } else {
            bind.status = 1;
            bind.message = 'Channels was deleted successfully';
        }
        return res.json(bind);
    });
});


// delete a channel
router.get('/delete-channel/:channel_id', function (req, res, next) {
    var bind = {};
    var channel_id = req.param('channel_id');
    Channel.remove({_id: channel_id}, function (err) {
        if (err) {
            bind.status = 0;
            bind.message = 'Oops! error occur while deleting a channel';
            bind.err = err;
        } else {
            bind.status = 1;
            bind.message = 'Channel was deleted successfully';
        }
        return res.json(bind);
    });
});

// upload chat media
router.post('/upload-chat-media', function (req, res, next) {
    var bind = {};
    chatUpload(req, res, function (err) {
        if (err) {
            bind.status = 0;
            bind.message = 'Oops! error occur while uploading chat media.';
            bind.error = err;
            return res.json(bind);
        } else {
            
            var extArray = req.file.mimetype.split("/");
            if(extArray[0] == 'video'){
                var video_file_path = appRoot + '/public/uploads/chat_media/' + req.file.filename;
            
                var thumbnail_file_name = Date.now()+'_150x110.png';
                ffmpeg(video_file_path)
                    .screenshots({
                      //timestamps: [30.5, '50%', '01:10.123'],
                      count: 1,
                      //filename: 'ava-thumbnail-160x120.png',
                      filename: thumbnail_file_name,
                      folder: appRoot + '/public/uploads/chat_media',
                      size: '150x110'
                    }).on('end', function(stdout, stderr) {
                      console.log('Transcoding succeeded !');
                      bind.status = 1;
                      bind.media_url = 'uploads/chat_media/' + req.file.filename + ',uploads/chat_media/' + thumbnail_file_name;
                      return res.json(bind);
                  });
            } else {
                bind.status = 1;
                bind.media_url = 'uploads/chat_media/' + req.file.filename;
                return res.json(bind);
            }
        }
        
    });
});


router.get('/get-channel-info/:channel_id', function (req, res) {
    var bind = {};
    var channel_id = req.params.channel_id;
    Channel.aggregate([
        {
            $match: {_id: ObjectId(channel_id)}
        },
        {
            $lookup: {
                from: 'users',
                localField: 'members_id',
                foreignField: '_id',
                as: 'members_info'

            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'request_users_id',
                foreignField: '_id',
                as: 'requests_info'

            }
        },
        {
            $project: {members_id: 0, __v: 0, 'members_info.__v': 0, 'members_info.token_id': 0, 'requests_info.__v': 0, 'requests_info.token_id': 0}
        }
    ], function (err, channelInfo) {

        if (err) {
            bind.status = 0;
            bind.message = 'Oops! error occured while fetching channel info';
            bind.error = err;
        } else if (channelInfo.length > 0) {
            bind.status = 1;
            bind.channelInfo = channelInfo[0];
        } else {
            bind.status = 0;
            bind.message = 'No channel info found';
        }
        return res.json(bind);

    });

});

// clear channel chat
router.post('/clear-channel-chat', function (req, res) {
    var bind = {};
    var channel_id = req.body.channel_id;
    var user_id = req.body.user_id;

    Clear_chat.findOne({'channel_id': ObjectId(channel_id), 'user_id': ObjectId(user_id)}, function (err, clear_chat) {
        if (clear_chat) {
            clear_chat.date = Date.now();
            clear_chat.save(function (err) {
                if (err) {
                    bind.status = 0;
                    bind.message = 'Oops! error occured while clearing chat';
                    bind.error = err;
                } else {
                    bind.status = 1;
                    bind.message = 'Chat was cleared successfully';
                }
                return res.json(bind);
            });

        } else {
            newClear_chat = new Clear_chat;
            newClear_chat.channel_id = channel_id;
            newClear_chat.user_id = user_id;
            newClear_chat.date = Date.now();
            newClear_chat.save(function (err) {
                if (err) {
                    bind.status = 0;
                    bind.message = 'Oops! error occured while clearing chat';
                    bind.error = err;
                } else {
                    bind.status = 1;
                    bind.message = 'Chat was cleared successfully';
                }
                return res.json(bind);
            });
        }
    });

});

// exit channel
router.post('/exit-channel', function (req, res) {
    var bind = {};
    var user_id = req.body.user_id;
    var channel_id = req.body.channel_id;
    Channel.findOne({_id: channel_id}, function (err, channel) {
        if (channel) {
            var index = channel.members_id.indexOf(ObjectId(user_id));
            if (index > -1) {
                channel.members_id.splice(index, 1);
                channel.save(function (err) {
                    if (err) {
                        bind.status = 0;
                        bind.message = 'Oops! error occured while exit from channel';
                        bind.error = err;
                    } else {
                        bind.status = 1;
                        bind.message = 'You were exited channel successfully';
                    }
                    return res.json(bind);
                });
            } else {
                bind.status = 0;
                bind.message = 'User is not a member of channel';
            }
            return res.json(bind);
        } else {
            bind.status = 0;
            bind.message = 'No channel found';
            return res.json(bind);
        }
    });
});

// make channel admin
router.post('/make-channel-admin', function (req, res) {
    var bind = {};
    var channel_id = req.body.channel_id;
    var user_id = req.body.user_id;

    Channel.findOne({_id: channel_id}, function (err, channel) {
        if (channel) {
            channel.admin_id = ObjectId(user_id);
            var index = channel.members_id.indexOf(ObjectId(user_id));
            console.log('*** make channel admin : BEFORE '+ JSON.stringify(channel));
            if (index > -1) {
                channel.members_id.splice(index, 1);
                channel.members_id.unshift(ObjectId(user_id));
                channel.save(function (err) {
                    if (err) {
                        bind.status = 0;
                        bind.message = 'Oops! error occured while making channel admin';
                        bind.error = err;
                    } else {
                        bind.status = 1;
                        bind.message = 'Channel admin was created successfully';
                    }
                    console.log('*** make channel admin : AFTER '+ JSON.stringify(channel));
                    return res.json(bind);
                });
            } else {
                bind.status = 0;
                bind.message = 'User is not a channel member';
                return res.json(bind);
            }
        } else {
            bind.status = 0;
            bind.message = 'No channel found';
        }
    });

});

// remove user from a channel
router.post('/remove-user-from-channel', function (req, res) {
    var bind = {};
    var user_id = ObjectId(req.body.user_id);
    var channel_id = ObjectId(req.body.channel_id);
    Channel.findOne({_id: channel_id}, function (err, channel) {
        if (channel) {
            var index = channel.members_id.indexOf(user_id);
            if (index > -1) {
                channel.members_id.splice(index, 1);
                channel.save(function (err) {
                    if (err) {
                        bind.status = 0;
                        bind.message = 'Oops! error occured while removing user from channel';
                        bind.error = err;
                    } else {
                        bind.status = 1;
                        bind.message = 'User was removed from channel successfully';

                        // send notification to user
                        var deviceToken = '';
                        var alert = '';
                        var payload = {
                            extra_data: {}
                        };
                        User.findOne({ _id: user_id }, function(err, user){
                            if(user && user.token_id){
                                deviceToken = user.token_id;
                                var room_type = channel.room_type;
                                alert = 'You are removed from ' + channel.channel_name + ' ' + room_type ;
                                payload.notification_type = 'remove-user-from-channel';
                                payload.extra_data.channel_id = channel_id;
                                sendAPNotification(deviceToken, alert, payload);
                            }
                        });
                    }
                    return res.json(bind);
                });
            } else {
                bind.status = 0;
                bind.message = 'User is not a member of channel';
                return res.json(bind);
            }
            
        } else {
            bind.status = 0;
            bind.message = 'No channel found';
            return res.json(bind);
        }
    });
});

router.get('/change-channel-type/:channel_id', function(req, res, next){
    var channel_id = req.params.channel_id;
    var bind = {};
    Channel.findOne({ _id: channel_id }, function(err, channel){
        if(channel){
            channel.channel_type = channel.channel_type == 'private' ? 'public' : 'private';
            channel.save(function(err){
                if(err){
                    bind.status = 0;
                    bind.message = 'Oops! error occured while changing channel type';
                    bind.error = err;
                } else {
                    bind.status = 1;
                    bind.message = 'Channel type was changed successfully';
                }
                return res.json(bind);
            });
        } else {
            bind.status = 0;
            bind.message = 'No channel found';
            return res.json(bind);
        }
    });
});

// add to channel request
router.post('/add-to-channel-request', function(req, res, next){
    var bind = {};
    var channel_id = req.body.channel_id;
    var user_id = req.body.user_id;
    Channel.findOne({_id: channel_id}, function (err, channel) {
        if (channel) {
            var index = channel.request_users_id.indexOf(ObjectId(user_id));
            if (index > -1) {
                bind.status = 0;
                bind.message = 'You have already sent request to this channel';
                return res.json(bind);
            } else {
                channel.request_users_id.push(ObjectId(user_id));
                channel.save(function(err){
                    if(err){
                        bind.status = 0;
                        bind.message = 'Oops! error occur while add to channel request';
                        bind.error = err;
                    } else{
                        bind.status = 1;
                        bind.message = 'Your request was sent successfully';
                        
                        // send notification to channel admin
                        var deviceToken = '';
                        var alert = '';
                        var payload = {
                            extra_data: {}
                        };
                        var channel_admin_id = channel.admin_id;
                        
                        User.findOne({ _id: channel_admin_id }, function(err, admin_user){
                            if(admin_user && admin_user.token_id){
                                User.findOne({ _id: user_id }, function(err, user){
                                    if(user){
                                        deviceToken = admin_user.token_id;
                                        var room_type = channel.room_type;
                                        alert = user.name +' has sent request to ' + channel.channel_name + ' ' + room_type;
                                        payload.notification_type = 'add-to-channel-request';
                                        payload.extra_data.channel_id = channel_id;
                                        sendAPNotification(deviceToken, alert, payload);
                                    }
                                });
                            }
                        });
                    }
                    return res.json(bind);
                });
                
            }
        } else {
            bind.status = 0;
            bind.message = 'No channel found';
            return res.json(bind);
        }
    });
    
});

// accept/reject channel request
router.post('/accept-reject-channel-request', function(req, res, next){
    var bind = {};
    var channel_id = ObjectId(req.body.channel_id);
    var user_id = ObjectId(req.body.user_id);
    var flag = req.body.flag; // 1: accept, 0: reject
    
    Channel.findOne({ _id: channel_id }, function(err, channel){
        if(channel){
            
            if(flag == 1){ // accept
                channel.members_id.push(user_id);
            }
            var index = channel.request_users_id.indexOf(user_id);
            channel.request_users_id.splice(index, 1);
            channel.save(function(err){
                if(err){
                    bind.status = 0;
                    bind.message = 'Oops! error occur while responding to request';
                    bind.error = err;
                } else {
                    bind.status = 1;
                    bind.message = flag == 1 ? 'Request was accepted successfully' : 'Request was rejected successfully';
                    
                    // send notification to user
                    var deviceToken = '';
                    var alert = '';
                    var payload = {
                        extra_data: {}
                    };
                    User.findOne({ _id: user_id }, function(err, user){
                        if(user && user.token_id){
                            deviceToken = user.token_id;
                            var room_type = channel.room_type;
                            alert = channel.channel_name + ' ' + room_type + ' has' + (flag == 1 ? ' accepted' : ' rejected') + ' your request' ;
                            payload.notification_type = 'accept-reject-channel-request';
                            payload.extra_data.channel_id = channel_id;
                            sendAPNotification(deviceToken, alert, payload);
                        }
                    });
                        
                    
                }
                return res.json(bind);
            });
            
        } else {
            bind.status = 0;
            bind.message = 'No channel found';
            return res.json(bind);
        }
    });
});

// get channel requests
router.get('/get-channel-requests/:channel_id', function(req, res, next){
    var bind = {};
    var channel_id = req.params.channel_id;
    Channel_request.aggregate([
        {
            $match : { channel_id: ObjectId(channel_id), status: false }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'user_id',
                foreignField: '_id',
                as: 'users'

            }
        }
        
    ], function(err, channel_requests){
        if(channel_requests.length > 0){
            bind.status = 1;
            bind.channel_requests = channel_requests;
        } else {
            bind.status = 0;
            bind.message = 'No channel requests found';
        }
        return res.json(bind);
    });
});

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

// testing route
router.get('/testing', function (req, res, next) {
    var bind = {};
    var request = require('request');
    var url = 'https://www.google.co.in/?gfe_rd=cr&ei=uKxvWc-tO_Ts8AfF4afoDg&gws_rd=ssl';
    request('https://api.urlmeta.org/?url='+url, function (error, response, body) {
      bind.error = error;
      bind.response = response;
      bind.body = JSON.parse(body);
      return res.json(bind.body);
    });
});



module.exports = router;
