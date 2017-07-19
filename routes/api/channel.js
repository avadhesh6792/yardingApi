var express = require('express');
var router = express.Router();
var multer = require('multer');
var Channel = require('../../models/channel');
var Mongoose = require('mongoose');
var ObjectId = Mongoose.Types.ObjectId;
var Clear_chat = require('../../models/clear_chat');
var Channel_chat = require('../../models/channel_chat');
var moment = require('moment');
var arraySort = require('array-sort');
var arrayFind = require('array-find');

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

        Channel.findOne({link: link}, function (err, channels) {

            if (!channels) {
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
                bind.message = 'link is already exists!';

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
                    
                    //channels[index].members_info_index = members_info_index;
                    channels[index].channel_name = other_member_info.name;
                    channels[index].channel_pic = other_member_info.display_pic;
                    channels[index].channel_description = other_member_info.status;
                     
                }
                channels[index].members_info = undefined;
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
            $sort: {'latest_chat.createdAt': -1}
        },
        {
            //$project: {updatedAt: 1, createdAt: 1, admin_id: 1, user_id: 1, created_timestamp: 1, link: 1, members_id: 1, channel_type: 1, channel_pic: 1, channel_description: 1, channel_name: 1, latest_chat: {"$arrayElemAt": ["$latest_chat", 0]}}
            $project: {updatedAt: 1, createdAt: 1, admin_id: 1, user_id: 1, created_timestamp: 1, link: 1, members_id: 1, channel_type: 1,
                channel_pic: 1, channel_description: 1, channel_name: 1, latest_chat: 1, room_type: 1}
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
        } else {
            bind.status = 1;
            bind.media_url = 'uploads/chat_media/' + req.file.filename;
            bind.file = req.file;
        }
        return res.json(bind);
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
            $project: {members_id: 0, __v: 0, 'members_info.__v': 0, 'members_info.token_id': 0}
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
    var user_id = req.body.user_id;
    var channel_id = req.body.channel_id;
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

// testing route
router.get('/testing', function (req, res, next) {
    var bind = {};
    var ffmpeg = require('fluent-ffmpeg');
    var command = ffmpeg();
    
    var appRoot = require('app-root-path');
    //var myModule = require(appRoot + '/public/uploads/chat_media/1499398539751_file.mov');
    //return res.json(myModule);
    console.log('******* appRoot *******'+appRoot);
    //res.json(appRoot + '/public/uploads/chat_media/1499398539751_file.mov');
    
    
    var proc = new ffmpeg(appRoot + '/public/uploads/chat_media/1499398539751_file.mov')
        .takeScreenshots({
            count: 1,
            timemarks: [ '2' ] // number of seconds
          }, appRoot + '/public/uploads/chat_media/', function(err) {
              if(err){
                  bind.status = 0;
                  bind.err = error;
              } else{
                  bind.status = 1;
                  bind.message = 'screenshots were saved';
              }
              return res.json(bind);
          console.log('screenshots were saved')
        });
});



module.exports = router;
