var express = require('express');
var router = express.Router();
var multer = require('multer');
var Group = require('../../models/group');
var Channel = require('../../models/channel');
var Mongoose = require('mongoose');
var ObjectId = Mongoose.Types.ObjectId;
//var Clear_chat = require('../../models/clear_chat');
var moment = require('moment');
var arraySort = require('array-sort');

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
        
        var newGroup = new Channel;
        newGroup.channel_name = group_name;
        newGroup.channel_pic = group_pic;
        newGroup.user_id = user_id;
        newGroup.admin_id = user_id;
        newGroup.created_timestamp = moment().unix();
        newGroup.members_id.push( ObjectId(user_id) );
        newGroup.room_type = 'group';

        for(var i = 0; i< members_id.length ;i++){
            var member_id = members_id[i].trim();
            newGroup.members_id.push( ObjectId(member_id) );
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




router.get('/get-group-info/:group_id', function(req, res){
    var bind = {};
    var group_id = req.params.group_id;
    Group.aggregate([
        {
            $match: { _id: ObjectId(group_id)}
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
    ], function(err, groupInfo){
        
        if(err){
            bind.status = 0;
            bind.message = 'Oops! error occured while fetching group info';
            bind.error = err;
        } else if(groupInfo.length > 0){
            bind.status = 1;
            bind.groupInfo = groupInfo[0];
        } else {
            bind.status = 0;
            bind.message = 'No group info found';
        }
        return res.json(bind);
        
    });
    
});

router.post('/add-member-to-group', function(req, res){
    var bind = {};
    var group_id = req.body.group_id;
    var members_id_string = req.body.members_id;
    var members_id = members_id_string.split(',');
        
       Group.findOne({ _id: group_id }, function(err, group){
           if(group){
                for(var i = 0; i< members_id.length ;i++){
                    var member_id = members_id[i].trim();
                    group.members_id.push( ObjectId(member_id) );
                }
                group.save(function (err) {
                if (err) {
                    bind.status = 0;
                    bind.message = 'Oops! error occur while adding participants';
                    bind.error = err;
                } else {
                    bind.status = 1;
                    bind.message = 'Participants was added successfully';
                }
                return res.json(bind);
            });
           } else {
               bind.status = 0;
               bind.message = 'No group found';
               return res.json(bind);
           }
       });
        
        
        
        
});

// get all groups
router.get('/get-all-groups', function (req, res, next) {
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
            $project: {updatedAt: 1, createdAt: 1, admin_id: 1, user_id: 1, created_timestamp: 1, link: 1, members_id: 1, channel_type: 1, channel_pic: 1, channel_description: 1, channel_name: 1, latest_chat: 1}
        }
    ], function (err, groups) {
        if (err) {
            bind.status = 0;
            bind.message = 'Oops! error occur while fetching all groups';
            bind.err = err;
        } else if (groups.length > 0) {
            bind.status = 1;
            bind.groups = groups;
        } else {
            bind.status = 0;
            bind.message = 'No groups found';
        }
        return res.json(bind);

    });
});

// search in all groups
router.get('/get-all-groups/:search_term', function (req, res, next) {
    var bind = {};
    var search_term = req.params.search_term;
    var pattern = new RegExp(search_term, 'i');
    Group.aggregate([
        {
          $match: { group_name: {$regex: pattern}, room_type: 'group' }  
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
            $sort: { 'latest_chat.createdAt': -1 }
        },
        {
            $project: { updatedAt: 1, createdAt: 1, user_id: 1, created_timestamp: 1, members_id: 1, group_pic: 1, group_name: 1, latest_chat: { "$arrayElemAt": [ "$latest_chat", 0 ]}}
        }
    ], function (err, groups) {
        if (err) {
            bind.status = 0;
            bind.message = 'Oops! error occur while fetching all groups';
            bind.err = err;
        } else if (groups.length > 0) {
            bind.status = 1;
            bind.groups = groups;
        } else {
            bind.status = 0;
            bind.message = 'No groups found';
        }
        return res.json(bind);

    });
});

// exit group
router.post('/exit-group', function(req, res){
    var bind = {};
    var user_id = req.body.user_id;
    var group_id = req.body.group_id;
    Group.findOne({ _id: group_id }, function(err, group){
        if(group){
            var index = group.members_id.indexOf(ObjectId(user_id));
            if(index > -1){
                group.members_id.splice(index, 1);
                group.save(function(err){
                    if(err){
                        bind.status = 0;
                        bind.message = 'Oops! error occured while exit from group';
                        bind.error = err;
                    } else {
                        bind.status = 1;
                        bind.message = 'You were exited group successfully';
                    }
                    return res.json(bind);
                });
            } else {
                bind.status = 0;
                bind.message = 'User is not a member of group';
            }
            return res.json(bind);
        } else{
            bind.status = 0;
            bind.message = 'No group found';
            return res.json(bind);
        }
    });
});

// remove user from group chat
router.post('/remove-user', function(req, res){
    var bind = {};
    var user_id = req.body.user_id;
    var group_id = req.body.group_id;
    Group.findOne({ _id: group_id }, function(err, group){
        if(group){
            var index = group.members_id.indexOf(ObjectId(user_id));
            if(index > -1){
                group.members_id.splice(index, 1);
                group.save(function(err){
                    if(err){
                        bind.status = 0;
                        bind.message = 'Oops! error occured while removing user  from group';
                        bind.error = err;
                    } else {
                        bind.status = 1;
                        bind.message = 'User was removed from group successfully';
                    }
                    return res.json(bind);
                });
            } else {
                bind.status = 0;
                bind.message = 'User is not a member of group';
            }
            return res.json(bind);
        } else{
            bind.status = 0;
            bind.message = 'No group found';
            return res.json(bind);
        }
    });
});

// make group admin
router.post('/make-group-admin', function(req, res){
    var bind = {};
    var group_id = req.body.group_id;
    var user_id = req.body.user_id;
    
    Group.findOne({  _id: group_id }, function(err, group){
        if(group){
            group.admin_id = user_id;
            var index = group.members_id.indexOf(ObjectId(user_id));
            
            if(index > -1){
                group.members_id.splice(index, 1);
                group.members_id.unshift(ObjectId(user_id));
                group.save(function(err){
                    if(err){
                        bind.status = 0;
                        bind.message = 'Oops! error occured while making group admin';
                        bind.error = err;
                    } else {
                        bind.status = 1;
                        bind.message = 'Group admin was created successfully';
                    }
                    return res.json(bind);
                });
            } else {
                bind.status = 0;
                bind.message = 'User is not a group member';
                return res.json(bind);
            }
        } else {
            bind.status = 0;
            bind.message = 'No group found';
        }
    });
    
});



// testing route
router.get('/testing/:group_id', function(req, res, next){
   
    var bind = {};
    var group_id = req.params.group_id;
    Group.aggregate([
        {
            $match: { _id: ObjectId(group_id)}
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
    ], function(err, groupInfo){
        
        if(err){
            bind.status = 0;
            bind.message = 'Oops! error occured while fetching group info';
            bind.error = err;
        } else if(groupInfo.length > 0){
            bind.status = 1;
            groupInfo[0].members_info = arraySort(groupInfo[0].members_info, 'name');
            bind.groupInfo = groupInfo[0];
        } else {
            bind.status = 0;
            bind.message = 'No group info found';
        }
        return res.json(bind);
        
    });
});



module.exports = router;
