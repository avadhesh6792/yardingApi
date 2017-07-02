var express = require('express');
var router = express.Router();
var multer = require('multer');
var Group = require('../../models/group');
var Mongoose = require('mongoose');
var ObjectId = Mongoose.Types.ObjectId;
//var Clear_chat = require('../../models/clear_chat');

var Storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, "./public/uploads/group_pic");
    },
    filename: function (req, file, callback) {
        //console.log('aaaaaa'+ JSON.stringify(file) );
        callback(null, Date.now() + "_" + file.originalname);
    }
});

var upload = multer({storage: Storage}).single("group_pic");

// create new group
router.post('/create-group', function (req, res, next) {
    var bind = {};
    upload(req, res, function (err) {
        if (err) {
            bind.status = 0;
            bind.message = 'Oops! error occur while uploading group picture.';
            bind.error = err;
            return res.json(bind);
        }

        var group_name = req.body.group_name;
        var user_id = req.body.user_id;
        var group_pic = req.file ? 'uploads/group_pic/' + req.file.filename : 'uploads/default/default-channel.jpg';
        var members_id_string = req.body.members_id
        var members_id = members_id_string.split(',');
        
        var newGroup = new Group;
        newGroup.group_name = group_name;
        newGroup.group_pic = group_pic;
        newGroup.user_id = user_id;
        
        for(var i = 0; i< members_id.length ;i++){
            var member_id = members_id[i].trim();
            newGroup.members_id.push(member_id);
        }
        
        newGroup.save(function (err) {
            if (err) {
                bind.status = 0;
                bind.message = 'Oops! error occur while creating new group';
                bind.error = err;
            } else {
                bind.status = 1;
                bind.message = 'Group was created successfully';
                bind.channel       = newGroup;
            }
            return res.json(bind);
        });
    });
});

// get all channels
router.get('/get-all-channels', function (req, res, next) {
    var bind = {};
    Channel.find({}, function (err, channels) {
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

// search channel
router.get('/search-channel/:term', function (req, res, next) {
    var bind = {};
    var term = req.param('term');
    var pattern = new RegExp(term, 'i');

    Channel.find({channel_name: {$regex: pattern}}, function (err, channels) {
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
router.get('/remove-channels/:user_id', function(req, res, next){
    var bind = {};
    var user_id = req.param('user_id');
    
    Channel.remove({ user_id: user_id }, function(err){
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
router.get('/delete-channel/:channel_id', function(req, res, next){
    var bind = {};
    var channel_id = req.param('channel_id');
    Channel.remove({ _id: channel_id }, function(err){
        if(err){
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
router.post('/upload-chat-media', function(req, res, next){
    var bind = {};
    chatUpload(req, res, function(err){
        if(err){
            bind.status = 0;
            bind.message = 'Oops! error occur while uploading chat media.';
            bind.error = err;
        } else{
            bind.status = 1;
            bind.media_url = 'uploads/chat_media/' + req.file.filename;
        }
        return res.json(bind);
    });
});


router.get('/get-channel-info/:channel_id', function(req, res){
    var bind = {};
    var channel_id = req.params.channel_id;
    Channel.aggregate([
        {
            $match: { _id: ObjectId(channel_id)}
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
                $project: { members_id: 0, __v: 0, 'members_info.__v' : 0, 'members_info.token_id' : 0 }
            }
    ], function(err, channelInfo){
        
        if(err){
            bind.status = 0;
            bind.message = 'Oops! error occured while fetching channel info';
            bind.error = err;
        } else if(channelInfo.length > 0){
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
router.post('/clear-channel-chat', function(req, res){
    var bind = {};
    var channel_id = req.body.channel_id;
    var user_id = req.body.user_id;
    
    Clear_chat.findOne({ 'channel_id' : ObjectId(channel_id), 'user_id' : ObjectId(user_id) }, function(err, clear_chat){
        if(clear_chat){
            clear_chat.date = Date.now();
            clear_chat.save(function(err){
                if(err){
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
            newClear_chat.save(function(err){
                if(err){
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
router.post('/exit-channel', function(req, res){
    var bind = {};
    var user_id = req.body.user_id;
    var channel_id = req.body.channel_id;
    Channel.findOne({ _id: channel_id }, function(err, channel){
        if(channel){
            var index = channel.members_id.indexOf(user_id);
            if(index > -1){
                channel.members_id.splice(index, 1);
                bind.status = 1;
                bind.message = 'You were exited channel successfully';
            } else {
                bind.status = 0;
                bind.message = 'User not found';
            }
            return res.json(bind);
        } else{
            bind.status = 0;
            bind.message = 'No channel found';
            return res.json(bind);
        }
    });
});

// testing route
router.get('/testing', function(req, res, next){
   res.json(Date.now());
});



module.exports = router;
