var express = require('express');
var router = express.Router();
var multer = require('multer');
var Channel = require('../../models/channel');
var Mongoose = require('mongoose');
var ObjectId = Mongoose.Types.ObjectId;
var Clear_chat = require('../../models/clear_chat');
var Channel_chat = require('../../models/channel_chat');
var Channel_request = require('../../models/channel_request');
var Block_user = require('../../models/block_user');
var User = require('../../models/user');
var moment = require('moment');
var arraySort = require('array-sort');
var arrayFind = require('array-find');
var appRoot = require('app-root-path');
var ffmpeg = require('fluent-ffmpeg');
var apn = require('apn');
var Notification = require('../../functions/notification');
var Functions = require('../../functions');
var Config = require('../../config/config');

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
                //newChannel.members_id.push({user_id: ObjectId(user_id), online_status: false});
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
                        Channel.update({_id: newChannel._id}, {$push: {members_id: {user_id: ObjectId(user_id), online_status: false, badge: 0}}}, function (err) {});
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

// block unblock a user
router.post('/block-unblock-user', function(req, res){
  var bind = {};
  var block_by = req.body.block_by;
  var block_to = req.body.block_to;
  var action = req.body.action; // block, unblock
  Block_user.findOne({block_by: block_by, block_to: block_to}, function(err, block_user){
      if(block_user){
        if(action == 'block'){
          bind.status = 0;
          bind.message = 'You have already blocked this user';
          return res.json(bind);
        } else {
          block_user.remove(function(err){
            if(err){
              bind.status = 0;
              bind.message = 'Oops! error occured while unblocking user';
              bind.error = err;
              return res.json(bind);
            }
              bind.status = 1;
              bind.message = 'User was unblocked successfully'
              return res.json(bind);
          });
        }
      } else {
        if(action == 'block'){
          let new_block_user = new Block_user;
          new_block_user.block_by = ObjectId(block_by);
          new_block_user.block_to = ObjectId(block_to);
          new_block_user.save(function(err){
            if(err){
              bind.status = 0;
              bind.message = 'Oops! error occured while blocking user'
              bind.error = err;
              return res.json(bind);
            }
            bind.status = 1;
            bind.message = 'User was blocked successfully'
            return res.json(bind);
          });
        } else {
          bind.status = 0;
          bind.message = 'No block user found'
          return res.json(bind);
        }
      }
  });
});

// router.post('/block-unblock-user', function(req, res){
//   var bind = {};
//   var block_by = req.body.block_by;
//   var block_to = req.body.block_to;
//   var action = req.body.action; // block, unblock
//   //var channel_id = req.body.channel_id;
//
//   //Channel.findOne({ _id: channel_id}, function(err, channel){
//   Channel.findOne({ $and: [{'members_id.user_id': ObjectId(block_by)}, {'members_id.user_id': ObjectId(block_to)}, {room_type: 'single'}] }, function(err, channel){
//     if(err){
//       bind.status = 0;
//       bind.message = 'Oops! error occured while fetching channel';
//       bind.error = err;
//       return res.json(bind);
//     }
//     if(channel){
//       let update_data = {};
//       if(action == 'block'){ // block a user
//         update_data = {$push: { block_users_id: {block_by: ObjectId(block_by), block_to: ObjectId(block_to) }}};
//       } else { // unblock a user
//         update_data = { $pull: { block_users_id: {block_by: ObjectId(block_by), block_to: ObjectId(block_to) }} };
//       }
//       Channel.update({_id: channel._id}, update_data, function (err) {
//         if(err){
//           bind.status = 0;
//           bind.message = 'Oops! error occured while saving, please try after sometime';
//           bind.error = err;
//         } else {
//           bind.status = 1;
//           bind.message = 'User was '+(action == 'block' ? 'blocked' : 'unblocked')+' successfully';
//         }
//         return res.json(bind);
//       });
//     } else {
//       bind.status = 0;
//       bind.message = 'No channel found';
//       return res.json(bind);
//     }
//
//   });
//
//
//
// });

// get all single channel
router.get('/get-all-single-channels/:user_id', function (req, res, next) {
    var bind = {};
    var user_id = ObjectId(req.params.user_id);
    Channel.aggregate([
        {
            $match: {'members_id.user_id': user_id, room_type: 'single'}
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


            channels.forEach(function (item, index) {
                if (item.latest_chat) {

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
router.post('/delete-from-chat-channels', function (req, res, next) {
    var bind = {};
    var user_id = ObjectId(req.body.user_id);
    var user_id_normal = req.body.user_id;
    var channel_id = ObjectId(req.body.channel_id);
    var room_type = req.body.room_type;

    Channel.update({_id: channel_id}, {$pull: {members_id: {user_id: user_id}}}, function (err) {
        if (err) {
            bind.status = 0;
            bind.message = 'Oops! error occured while deleting from chat channels';
            bind.error = err;
            return res.json(bind);
        } else {
            bind.status = 1;
            bind.message = 'Chats was deleted successfully';
            return res.json(bind);
        }
    });

//    Channel.findOne({ _id: channel_id }, function(err, channel){
//        if(channel){
//
//            var index = channel.members_id.findIndex(member_id => member_id.user_id == user_id_normal);
//            if (index > -1) {
//                channel.members_id.splice(index, 1);
//
//                if(channel.admin_id == user_id){
//                    var admin_id = channel.members_id[Math.floor(Math.random()*channel.members_id.length)].user_id;
//                    channel.admin_id = admin_id;
//                }
//                channel.save(function(err){
//                    if(err){
//                        bind.status = 0;
//                        bind.message = 'Oops! error occured while deleting from chat channels';
//                        bind.error = err;
//                    } else{
//                        bind.status = 1;
//                        bind.message = 'Chats was deleted successfully';
//                    }
//                    return res.json(bind);
//                });
//
//            } else{
//                bind.status = 0;
//                bind.message = 'You are not member of this channel';
//                res.json(bind);
//            }
//
//        } else{
//            bind.status = 0;
//            bind.message = 'No chat channel found';
//            return res.json(bind);
//        }
//    });
});

// get all chat channels
router.get('/get-all-chat-channels/:user_id', function (req, res, next) {
    var bind = {};
    var user_id = ObjectId(req.params.user_id);
    User.update({ _id: user_id},{ $set: {badge: 0}}, function(err){ }); // set user's badge to 0
    Channel.aggregate([
        {
            $match: {'members_id.user_id': user_id}
        },
        {
            $unwind: "$members_id"
        },
        {
            $lookup: {
                from: 'users',
                localField: 'members_id.user_id',
                foreignField: '_id',
                as: 'members_info'

            }
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
            $group: {
                _id: '$_id',
                updatedAt: {$first: '$updatedAt'},
                createdAt: {$first: '$createdAt'},
                created_timestamp: {$first: '$created_timestamp'},
                admin_id: {$first: '$admin_id'},
                user_id: {$first: '$user_id'},
                room_type: {$first: '$room_type'},
                link: {$first: '$link'},
                channel_type: {$first: '$channel_type'},
                channel_pic: {$first: '$channel_pic'},
                channel_description: {$first: '$channel_description'},
                channel_name: {$first: '$channel_name'},
                created_timestamp: {$first: '$created_timestamp'},
                members_info: {$push: {$arrayElemAt: ["$members_info", 0]}},
                latest_chat: {$first: '$latest_chat'},
                //block_users_id: {$first: '$block_users_id'},
                badge: {$push: { $cond: {if: { $eq: ['$members_id.user_id', user_id]}, then: '$members_id.badge', else: null}  }}
            }
        }
    ], function (err, channels) {
        if (err) {
            bind.status = 0;
            bind.message = 'Oops! error occur while fetching all chat channels';
            bind.err = err;
        } else if (channels.length > 0) {
            bind.status = 1;


            channels.forEach(function (item, index) {

                if (item.latest_chat.length) {
                    var sort_array = arraySort(item.latest_chat, 'createdAt', {reverse: true});
                    channels[index].latest_chat = sort_array[0];
                } else {
                    item.latest_chat = {created_timestamp: 0};
                }

                if (item.room_type == 'single') {
                    var other_member_info = arrayFind(item.members_info, function (info, index) {
                        return info._id != req.params.user_id;
                    });

                    if (other_member_info) {
                        //channels[index].members_info_index = members_info_index;
                        channels[index].channel_name = other_member_info.name;
                        channels[index].channel_pic = other_member_info.display_pic;
                        channels[index].channel_description = other_member_info.status;
                    }


                }
                var badge = 0;
                if(channels[index].badge.length){
                   channels[index].badge.map(function(b){
                        if(b){
                            badge = b;
                        }
                    });
                }
                channels[index].badge = badge;
                //channels[index].members_info = undefined;
            });

            var sort_channel = arraySort(channels, 'latest_chat.created_timestamp', {reverse: true});
            bind.channels = sort_channel;
            let block_users_arr = [];
            Block_user.find({ block_by: user_id}, { block_to: 1, _id: 0 }, function(err, block_users){
              if(block_users.length){
                block_users.forEach(function(item, index){
                    block_users_arr.push(item.block_to);
                });
              }
              bind.block_users = block_users_arr;
              return res.json(bind);
            });
        } else {
            bind.status = 0;
            bind.message = 'No chat channels found';
            return res.json(bind);
        }


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
            $match: {'members_id.user_id': user_id, channel_name: {$regex: pattern}}
        },
        {
            $unwind: "$members_id"
        },
        {
            $lookup: {
                from: 'users',
                localField: 'members_id.user_id',
                foreignField: '_id',
                as: 'members_info'

            }
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
            $group: {
                _id: '$_id',
                updatedAt: {$first: '$updatedAt'},
                createdAt: {$first: '$createdAt'},
                created_timestamp: {$first: '$created_timestamp'},
                admin_id: {$first: '$admin_id'},
                user_id: {$first: '$user_id'},
                room_type: {$first: '$room_type'},
                link: {$first: '$link'},
                channel_type: {$first: '$channel_type'},
                channel_pic: {$first: '$channel_pic'},
                channel_description: {$first: '$channel_description'},
                channel_name: {$first: '$channel_name'},
                created_timestamp: {$first: '$created_timestamp'},
                members_info: {$push: {$arrayElemAt: ["$members_info", 0]}},
                latest_chat: {$first: '$latest_chat'},
                badge: {$push: { $cond: {if: { $eq: ['$members_id.user_id', user_id]}, then: '$members_id.badge', else: null}  }}
            }
        },
        {
            $sort: { 'latest_chat.created_timestamp': -1 }
        }

    ], function (err, channels) {
        if (err) {
            bind.status = 0;
            bind.message = 'Oops! error occur while fetching all chat channels';
            bind.err = err;
        } else if (channels.length > 0) {
            bind.status = 1;


            channels.forEach(function (item, index) {
                if (item.latest_chat.length) {
                    var sort_array = arraySort(item.latest_chat, 'createdAt', {reverse: true});
                    channels[index].latest_chat = sort_array[0];
                } else {
                    item.latest_chat = {created_timestamp: 0};
                }
                if (item.room_type == 'single') {
                    var other_member_info = arrayFind(item.members_info, function (info, index) {
                        return info._id != req.params.user_id;
                    });

                    if (other_member_info) {
                        //channels[index].members_info_index = members_info_index;
                        channels[index].channel_name = other_member_info.name;
                        channels[index].channel_pic = other_member_info.display_pic;
                        channels[index].channel_description = other_member_info.status;
                    }


                }
                var badge = 0;
                if(channels[index].badge.length){
                   channels[index].badge.map(function(b){
                        if(b){
                            badge = b;
                        }
                    });
                }
                channels[index].badge = badge;
                //channels[index].members_info = undefined;
            });

            var sort_channel = arraySort(channels, 'latest_chat.created_timestamp', {reverse: true});
            bind.channels = sort_channel;
            let block_users_arr = [];
            Block_user.find({ block_by: user_id}, { block_to: 1, _id: 0 }, function(err, block_users){
              if(block_users.length){
                block_users.forEach(function(item, index){
                    block_users_arr.push(item.block_to);
                });
              }
              bind.block_users = block_users_arr;
              return res.json(bind);
            });
        } else {
            bind.status = 0;
            bind.message = 'No chat channels found';
            return res.json(bind);
        }


    });
});

// get all channels
router.get('/get-all-channels/:user_id', function (req, res, next) {
    var bind = {};
    var user_id = ObjectId(req.params.user_id);
    User.update({ _id: user_id},{ $set: {badge: 0}}, function(err){ }); // set user's badge to 0
    Channel.aggregate([
        {
            $match: {room_type: 'channel'}
        },
        {
            $unwind: "$members_id"
        },
        {
            $lookup: {
                from: 'users',
                localField: 'members_id.user_id',
                foreignField: '_id',
                as: 'members_info'

            }
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
            $group: {
                _id: '$_id',
                updatedAt: {$first: '$updatedAt'},
                createdAt: {$first: '$createdAt'},
                admin_id: {$first: '$admin_id'},
                user_id: {$first: '$user_id'},
                room_type: {$first: '$room_type'},
                link: {$first: '$link'},
                channel_type: {$first: '$channel_type'},
                channel_pic: {$first: '$channel_pic'},
                channel_description: {$first: '$channel_description'},
                channel_name: {$first: '$channel_name'},
                created_timestamp: {$first: '$created_timestamp'},
                members_info: {$push: {$arrayElemAt: ["$members_info", 0]}},
                latest_chat: {$first: '$latest_chat'},
                //block_users_id: {$first: '$block_users_id'},
                badge: {$push: { $cond: {if: { $eq: ['$members_id.user_id', user_id]}, then: '$members_id.badge', else: null}  }}
            }
        },
        {
            $sort: { 'latest_chat.created_timestamp': -1 }
        }
    ], function (err, channels) {
        if (err) {
            bind.status = 0;
            bind.message = 'Oops! error occur while fetching all channels';
            bind.err = err;
        } else if (channels.length > 0) {
            bind.status = 1;


            channels.forEach(function (item, index) {
                if (item.latest_chat.length) {
                    var sort_array = arraySort(item.latest_chat, 'createdAt', {reverse: true});
                    channels[index].latest_chat = sort_array[0];
                } else {
                    item.latest_chat = {created_timestamp: 0};
                }
                var badge = 0;
                if(channels[index].badge.length){
                   channels[index].badge.map(function(b){
                        if(b){
                            badge = b;
                        }
                    });
                }
                channels[index].badge = badge;

            });

            var sort_channel = arraySort(channels, 'latest_chat.created_timestamp', {reverse: true});
            bind.channels = sort_channel;
            let block_users_arr = [];
            Block_user.find({ block_by: user_id}, { block_to: 1, _id: 0 }, function(err, block_users){
              if(block_users.length){
                block_users.forEach(function(item, index){
                    block_users_arr.push(item.block_to);
                });
              }
              bind.block_users = block_users_arr;
              return res.json(bind);
            });
        } else {
            bind.status = 0;
            bind.message = 'No channels found';
            return res.json(bind);
        }


    });
});

// search channel
router.get('/search-channel/:term/:user_id', function (req, res, next) {
    var bind = {};
    var term = req.param('term');
    var pattern = new RegExp(term, 'i');
    var user_id = ObjectId(req.params.user_id);

    Channel.aggregate([
        {
            $match: {channel_name: {$regex: pattern}, room_type: 'channel'}
        },
        {
            $unwind: "$members_id"
        },
        {
            $lookup: {
                from: 'users',
                localField: 'members_id.user_id',
                foreignField: '_id',
                as: 'members_info'

            }
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
            $group: {
                _id: '$_id',
                updatedAt: {$first: '$updatedAt'},
                createdAt: {$first: '$createdAt'},
                admin_id: {$first: '$admin_id'},
                user_id: {$first: '$user_id'},
                room_type: {$first: '$room_type'},
                link: {$first: '$link'},
                channel_type: {$first: '$channel_type'},
                channel_pic: {$first: '$channel_pic'},
                channel_description: {$first: '$channel_description'},
                channel_name: {$first: '$channel_name'},
                created_timestamp: {$first: '$created_timestamp'},
                members_info: {$push: {$arrayElemAt: ["$members_info", 0]}},
                latest_chat: {$first: '$latest_chat'},
                badge: {$push: { $cond: {if: { $eq: ['$members_id.user_id', user_id]}, then: '$members_id.badge', else: null}  }}
            }
        },
        {
            $sort: { 'latest_chat.created_timestamp': -1 }
        }
    ], function (err, channels) {
        if (err) {
            bind.status = 0;
            bind.message = 'Oops! error occur while fetching all channels';
            bind.err = err;
        } else if (channels.length > 0) {
            bind.status = 1;


            channels.forEach(function (item, index) {
                if (item.latest_chat.length) {
                    var sort_array = arraySort(item.latest_chat, 'createdAt', {reverse: true});
                    channels[index].latest_chat = sort_array[0];
                } else {
                    item.latest_chat = {created_timestamp: 0};
                }
                var badge = 0;
                if(channels[index].badge.length){
                   channels[index].badge.map(function(b){
                        if(b){
                            badge = b;
                        }
                    });
                }
                channels[index].badge = badge;

            });

            var sort_channel = arraySort(channels, 'latest_chat.created_timestamp', {reverse: true});
            bind.channels = sort_channel;
            let block_users_arr = [];
            Block_user.find({ block_by: user_id}, { block_to: 1, _id: 0 }, function(err, block_users){
              if(block_users.length){
                block_users.forEach(function(item, index){
                    block_users_arr.push(item.block_to);
                });
              }
              bind.block_users = block_users_arr;
              return res.json(bind);
            });
        } else {
            bind.status = 0;
            bind.message = 'No channels found';
            return res.json(bind);
        }
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
            if (extArray[0] == 'video') {
                var video_file_path = appRoot + '/public/uploads/chat_media/' + req.file.filename;

                var thumbnail_file_name = Date.now() + '_150x110.png';
                ffmpeg(video_file_path)
                        .screenshots({
                            //timestamps: [30.5, '50%', '01:10.123'],
                            count: 1,
                            //filename: 'ava-thumbnail-160x120.png',
                            filename: thumbnail_file_name,
                            folder: appRoot + '/public/uploads/chat_media',
                            size: '150x110'
                        }).on('end', function (stdout, stderr) {
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


router.get('/get-channel-info/:channel_id/:user_id', function (req, res) {
    var bind = {};
    var channel_id = req.params.channel_id;
    var user_id = req.params.user_id;
    Channel.aggregate([
        {
            $match: {_id: ObjectId(channel_id)}
        },
        {
            $unwind: "$members_id"
        },
        {
            $lookup: {
                from: 'users',
                localField: 'members_id.user_id',
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
            $group: {
                _id: '$_id',
                updatedAt: {$first: '$updatedAt'},
                createdAt: {$first: '$createdAt'},
                admin_id: {$first: '$admin_id'},
                user_id: {$first: '$user_id'},
                room_type: {$first: '$room_type'},
                link: {$first: '$link'},
                channel_type: {$first: '$channel_type'},
                channel_pic: {$first: '$channel_pic'},
                channel_description: {$first: '$channel_description'},
                channel_name: {$first: '$channel_name'},
                created_timestamp: {$first: '$created_timestamp'},
                members_info: {$push: {$arrayElemAt: ["$members_info", 0]}},
                requests_info: {$first: '$requests_info'},
                members_id: {$push: '$members_id'}
            }
        }
    ], function (err, channelInfo) {

        if (err) {
            bind.status = 0;
            bind.message = 'Oops! error occured while fetching channel info';
            bind.error = err;
        } else if (channelInfo.length > 0) {
            bind.status = 1;

            var badge = 0;
            arrayFind(channelInfo[0].members_id, function (member, index) {
                if(member.user_id == user_id){
                    badge = member.badge;
                }
            });
            channelInfo[0].badge = badge;
            channelInfo[0].members_id = undefined;
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

    Channel.update({_id: channel_id}, {$pull: {members_id: {user_id: ObjectId(user_id)}}}, function (err) {
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

//    Channel.findOne({_id: channel_id}, function (err, channel) {
//        if (channel) {
//            //var index = channel.members_id.indexOf(ObjectId(user_id));
//            var index = channel.members_id.findIndex(member_id => member_id.user_id == ObjectId(user_id));
//            if (index > -1) {
//                channel.members_id.splice(index, 1);
//                channel.save(function (err) {
//                    if (err) {
//                        bind.status = 0;
//                        bind.message = 'Oops! error occured while exit from channel';
//                        bind.error = err;
//                    } else {
//                        bind.status = 1;
//                        bind.message = 'You were exited channel successfully';
//                    }
//                    return res.json(bind);
//                });
//            } else {
//                bind.status = 0;
//                bind.message = 'User is not a member of channel';
//            }
//            return res.json(bind);
//        } else {
//            bind.status = 0;
//            bind.message = 'No channel found';
//            return res.json(bind);
//        }
//    });
});

// make channel admin
router.post('/make-channel-admin', function (req, res) {
    var bind = {};
    var channel_id = req.body.channel_id;
    var user_id = req.body.user_id;

    Channel.findOne({_id: channel_id}, function (err, channel) {
        if (channel) {
            channel.admin_id = ObjectId(user_id);
            //var index = channel.members_id.indexOf(ObjectId(user_id));
            var index = channel.members_id.findIndex(member_id => member_id.user_id == user_id);
            console.log('*** make channel admin : BEFORE ' + JSON.stringify(channel));
            if (index > -1) {
                channel.members_id.splice(index, 1);
                channel.members_id.unshift({user_id: ObjectId(user_id), online_status: false, badge: 0});
                channel.save(function (err) {
                    if (err) {
                        bind.status = 0;
                        bind.message = 'Oops! error occured while making channel admin';
                        bind.error = err;
                    } else {
                        bind.status = 1;
                        bind.message = 'Channel admin was created successfully';
                    }
                    console.log('*** make channel admin : AFTER ' + JSON.stringify(channel));
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
    var user_id_normal = req.body.user_id;
    var channel_id = ObjectId(req.body.channel_id);

    Channel.findOne({_id: channel_id}, function (err, channel) {
        if (channel) {
            Channel.update({_id: channel_id}, {$pull: {members_id: {user_id: user_id}}}, function (err) {
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
                    User.findOne({_id: user_id}, function (err, user) {
                        if (user && user.token_id) {
                            deviceToken = user.token_id;
                            var room_type = channel.room_type;
                            alert = 'You are removed from ' + channel.channel_name + ' ' + room_type;
                            payload.notification_type = 'remove-user-from-channel';
                            payload.extra_data.channel_id = channel_id;

                            var notification_params = {};
                            notification_params.deviceToken = deviceToken;
                            notification_params.alert = alert;
                            notification_params.payload = payload;
                            notification_params.badge = 1;
                            Notification.sendAPNotification(notification_params);
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

//    Channel.findOne({_id: channel_id}, function (err, channel) {
//        if (channel) {
//            //var index = channel.members_id.indexOf(user_id);
//            var index = channel.members_id.findIndex(member_id => member_id.user_id == user_id_normal);
//            if (index > -1) {
//                channel.members_id.splice(index, 1);
//                channel.save(function (err) {
//                    if (err) {
//                        bind.status = 0;
//                        bind.message = 'Oops! error occured while removing user from channel';
//                        bind.error = err;
//                    } else {
//                        bind.status = 1;
//                        bind.message = 'User was removed from channel successfully';
//
//                        // send notification to user
//                        var deviceToken = '';
//                        var alert = '';
//                        var payload = {
//                            extra_data: {}
//                        };
//                        User.findOne({ _id: user_id }, function(err, user){
//                            if(user && user.token_id){
//                                deviceToken = user.token_id;
//                                var room_type = channel.room_type;
//                                alert = 'You are removed from ' + channel.channel_name + ' ' + room_type ;
//                                payload.notification_type = 'remove-user-from-channel';
//                                payload.extra_data.channel_id = channel_id;
//                                sendAPNotification(deviceToken, alert, payload);
//                            }
//                        });
//                    }
//                    return res.json(bind);
//                });
//            } else {
//                bind.status = 0;
//                bind.message = 'User is not a member of channel';
//                return res.json(bind);
//            }
//
//        } else {
//            bind.status = 0;
//            bind.message = 'No channel found';
//            return res.json(bind);
//        }
//    });
});

router.get('/change-channel-type/:channel_id', function (req, res, next) {
    var channel_id = req.params.channel_id;
    var bind = {};
    Channel.findOne({_id: channel_id}, function (err, channel) {
        if (channel) {
            channel.channel_type = channel.channel_type == 'private' ? 'public' : 'private';
            channel.save(function (err) {
                if (err) {
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
router.post('/add-to-channel-request', function (req, res, next) {
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
                Channel.update({_id: channel_id}, {$push: {request_users_id: ObjectId(user_id)}}, function (err) {
                    if (err) {
                        bind.status = 0;
                        bind.message = 'Oops! error occur while add to channel request';
                        bind.error = err;
                    } else {
                        bind.status = 1;
                        bind.message = 'Your request was sent successfully';

                        var channel_admin_id = channel.admin_id;
                        // increment badge count in user document
                        User.update({ _id: channel_admin_id},{ $inc: {badge: 1}}, function(err){ });

                        // send notification to channel admin
                        var deviceToken = '';
                        var alert = '';
                        var payload = {
                            extra_data: {}
                        };


                        User.findOne({_id: channel_admin_id}, function (err, admin_user) {
                            if (admin_user && admin_user.token_id) {
                                User.findOne({_id: user_id}, function (err, user) {
                                    if (user) {
                                        var admin_id = admin_user._id;
                                        deviceToken = admin_user.token_id;
                                        var room_type = channel.room_type;
                                        alert = user.name + ' has sent request to ' + channel.channel_name + ' ' + room_type;
                                        payload.notification_type = 'add-to-channel-request';
                                        payload.extra_data.channel_id = channel_id;
                                        var notification_params = {};
                                        notification_params.deviceToken = deviceToken;
                                        notification_params.alert = alert;
                                        notification_params.payload = payload;
                                        //notification_params.badge = 1;

                                        Channel.aggregate([
                                            {$match: { 'members_id.user_id': ObjectId(admin_id) }},
                                            {$unwind: '$members_id'},
                                            {$match: { 'members_id.user_id': ObjectId(admin_id) }},
                                            {$group: {_id:null, total_badge: {$sum: '$members_id.badge'}}}
                                        ],function(err, result){
                                            if(!err && result.length > 0){
                                                var total_badge = result[0].total_badge + admin_user.badge;
                                                notification_params.badge = total_badge;
                                                Notification.sendAPNotification(notification_params);
                                            }
                                        });


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
            bind.message = 'Oops! No channel found';
            return res.json(bind);
        }


    });
});

// accept/reject channel request
router.post('/accept-reject-channel-request', function (req, res, next) {
    var bind = {};
    var channel_id = ObjectId(req.body.channel_id);
    var user_id = ObjectId(req.body.user_id);
    var flag = req.body.flag; // 1: accept, 0: reject

    var update_data = {$pull: {request_users_id: user_id}};
    if (flag == 1) { // accept
        update_data = {$push: {members_id: {user_id: user_id, online_status: false, badge: 0}}, $pull: {request_users_id: user_id}};
    }

    Channel.findOne({_id: channel_id}, function (err, channel) {
        if (channel) {
            Channel.update({_id: channel_id}, update_data, {multi: true}, function (err) {
                if (err) {
                    bind.status = 0;
                    bind.message = 'Oops! error occur while responding to request';
                    bind.error = err;
                } else {
                    bind.status = 1;
                    bind.message = flag == 1 ? 'Request was accepted successfully' : 'Request was rejected successfully';

                    var channel_admin_id = channel.admin_id;

                    // decrement badge count in user document
                    User.update({ _id: channel_admin_id, badge: {$gt: 0}},{ $inc: {badge: -1}}, function(err){ });

                    // send notification to user
                    var deviceToken = '';
                    var alert = '';
                    var payload = {
                        extra_data: {}
                    };
                    User.findOne({_id: user_id}, function (err, user) {
                        if (user && user.token_id) {
                            var user_id = user._id;
                            deviceToken = user.token_id;
                            var room_type = channel.room_type;
                            alert = channel.channel_name + ' ' + room_type + ' has' + (flag == 1 ? ' accepted' : ' rejected') + ' your request';
                            payload.notification_type = 'accept-reject-channel-request';
                            payload.extra_data.channel_id = channel_id;
                            var notification_params = {};
                            notification_params.deviceToken = deviceToken;
                            notification_params.alert = alert;
                            notification_params.payload = payload;
                            //notification_params.badge = 1;

                            Channel.aggregate([
                                {$match: { 'members_id.user_id': ObjectId(user_id) }},
                                {$unwind: '$members_id'},
                                {$match: { 'members_id.user_id': ObjectId(user_id) }},
                                {$group: {_id:null, total_badge: {$sum: '$members_id.badge'}}}
                            ],function(err, result){
                                if(!err && result.length > 0){
                                    var total_badge = result[0].total_badge + user.badge;
                                    notification_params.badge = total_badge;
                                    Notification.sendAPNotification(notification_params);
                                }
                            });
                        }
                    });
                }
                return res.json(bind);
            });
        } else {
            bind.status = 0;
            bind.message = 'Oops! No channel found';
            return res.json(bind);
        }
    });
});

// get channel requests
router.get('/get-channel-requests/:channel_id', function (req, res, next) {
    var bind = {};
    var channel_id = req.params.channel_id;
    Channel_request.aggregate([
        {
            $match: {channel_id: ObjectId(channel_id), status: false}
        },
        {
            $lookup: {
                from: 'users',
                localField: 'user_id',
                foreignField: '_id',
                as: 'users'

            }
        }

    ], function (err, channel_requests) {
        if (channel_requests.length > 0) {
            bind.status = 1;
            bind.channel_requests = channel_requests;
        } else {
            bind.status = 0;
            bind.message = 'No channel requests found';
        }
        return res.json(bind);
    });
});

router.post('/flag', function(req, res){
  let channel_id = req.body.channel_id;
  let message_id = req.body.message_id;
  let user_id = req.body.user_id;
  let bind = {};

  let body = '';
  body += '<p>Hello Admin,</p>';
  body += '<p>Chat with id '+message_id+' from channel/group id : '+channel_id+' has some content with objection.<br/>';
  body += 'Please view this user\'s post </p>';
  body += 'Thank you,<br/>';
  body += 'Laylah';

  let receivers = [Config.yarding_admin_email];
  let subject = 'Flag Raised';

  Functions.send_email({receivers, subject, body}, function(response){
    if(response.status){
        bind.status = 1;
        bind.message = 'Your report was sent successfully';
    } else {
      bind.status = 0;
      bind.message = 'Oops! error occured while sending report, please try after sometime';
    }
    res.json(bind);
  });

});

// testing route
router.get('/testing', function (req, res, next) {

  let body = '';
  body += '<p>Hello Admin,</p>';
  body += '<p>Chat with id 987 from channel/group id : 543 has some content with objection.<br/>';
  body += 'Please view this user\'s post </p>';
  body += 'Thank you,<br/>';
  body += 'Laylah';

  let receivers = [Config.yarding_admin_email];
  let subject = 'Flag Raised';

  Functions.send_email({receivers, subject, body}, function(response){
    res.json(response);
  });


});



module.exports = router;
