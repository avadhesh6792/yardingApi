var express = require('express');
var router = express.Router();
var multer = require('multer');
var User = require('../../models/user');
var User_status = require('../../models/user_status');
var twilio  = require('twilio');
var find = require('array-find');
var Mongoose = require('mongoose');
var ObjectId = Mongoose.Types.ObjectId;
var Group = require('../../models/group');
var Channel = require('../../models/channel');


var TWILIO_ACCOUNT_SID = 'AC07762a2e784bdfc2224c044620661ec2';
var TWILIO_AUTH_TOKEN = 'b6e01cb00d70a1929ac0a22296e158e4';
var client  = new twilio.RestClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN); 



var chatStorage = multer.diskStorage({
    destination: function(req, file, callback){
     callback(null, "./public/uploads/chat_media");   
    },
    filename: function(req, file, callback){
        callback(null, Date.now() + "_" + file.originalname);
    }
});

var chatUpload = multer({ storage: chatStorage}).single("chat_media");

var Storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, "./public/uploads/display_pic");
    },
    filename: function (req, file, callback) {
        //console.log('aaaaaa'+ JSON.stringify(file) );
        callback(null, Date.now() + "_" + file.originalname);
    }
});



var upload = multer({storage: Storage}).single("display_pic");

// user sign up doc
router.get('/sign-up/doc', function(req, res, next){
    var bind = {};
    bind.field_name = ['name', 'college', 'display_pic', 'phone_no', 'token_id'];
    bind.method = 'post';
    bind.type = 'multipart';
    res.json(bind);
});

// user sign up
router.post('/sign-up', function (req, res, next) {
    var bind = {};
    upload(req, res, function (err) {
        if (err) {
            bind.status = 0;
            bind.message = 'Oops! error occur while uploading display picture.';
            bind.error = err;
            return res.json(bind);
        }


        var name        = req.body.name;
        var college     = req.body.college;
        var phone_no    = req.body.phone_no;
        var token_id    = req.body.token_id;
        var display_pic = req.file ? 'uploads/display_pic/' + req.file.filename : 'uploads/default/default-user.png';

        var newUser             = new User;
        newUser.name            = name;
        newUser.college         = college;
        newUser.display_pic     = display_pic;
        newUser.phone_no        = phone_no;
        newUser.token_id        = token_id;
        newUser.cover_pic       = '';
        newUser.status          = college;
        

        newUser.save(function (err) {
            if (err) {
                bind.status     = 0;
                bind.message    = 'Oops! error occur while sign up';
                bind.error      = err;
            } else {
                bind.status     = 1;
                bind.message    = 'Your are registered successfully';
                bind.user       = newUser;
                
                Channel.findOne({channel_name: 'Yarding'}, function (err, channel) {
                    if(channel){
                        var user_id = newUser._id;
                        channel.members_id.push(new ObjectId(user_id));
                        channel.save();
                    }
                });
            }
            return res.json(bind);
        });

        //return res.end("File uploaded sucessfully!."+ 'uploads/display_pic/' +req.body.name);  
    });
    //return res.end('stop');



});



var edit_profile_storage = multer.diskStorage({
	destination:function(req,file,callback){
            
            if(file.fieldname ==   'display_pic'){
                console.log('./public/uploads/display_pic '+file.fieldname);
                callback(null, "./public/uploads/display_pic");
            } else if(file.fieldname ==   'cover_pic'){
                console.log('./public/uploads/cover_pic '+file.fieldname);
                callback(null, "./public/uploads/cover_pic");
            }
		
	},
	filename: function(req,file,cb){
		cb(null,Date.now() + file.originalname);
 
	}
});
var edit_profile_upload = multer({ storage: edit_profile_storage });


// edit user profile
router.post('/edit-profile', edit_profile_upload.any(),   function(req, res, next){
    var bind = {};
    var files = req.files;
    var user_id = req.body.user_id;
    var name = req.body.name;
    var college = req.body.college;
    var status = req.body.status;
    
    var find_display_pic = find(files, function (file, index, array) {
      return file.fieldname === 'display_pic';
    });
    
    var find_cover_pic = find(files, function (file, index, array) {
      return file.fieldname === 'cover_pic';
    });
    
    User.findOne({ _id: user_id }, function(err, user){
        if(err){
            bind.status = 0;
            bind.message = 'Oops! error occured while fetching user';
            bind.error = err
            
            return res.json(bind);
        }
        if(user){
            var display_pic = find_display_pic ? 'uploads/display_pic/' + find_display_pic.filename : user.display_pic;
            var cover_pic = find_cover_pic ? 'uploads/cover_pic/' + find_cover_pic.filename : user.cover_pic;
            
            user.name = name;
            user.college = college;
            user.status = status;
            user.display_pic = display_pic;
            user.cover_pic = cover_pic;
            
            user.save(function(err){
                if(err){
                    bind.status = 0;
                    bind.message = 'Oops! error was occured while updating profile';
                    bind.error = err;
                    
                } else {
                    bind.status = 1;
                    bind.message = 'Profile was updated successfully';
                    bind.user = user;
                }
                return res.json(bind);
                
            });
        } else {
            bind.status = 0;
            bind.message = 'No user found';
            return res.json(bind);
        }
    });
});

// update user status
router.post('/update-user-status', function(req, res){
    var bind = {};
    var user_id = req.body.user_id;
    var status = req.body.status;
    
    User.findOne({ _id: user_id }, function(err, user){
        if(user){
            user.status = status;
            user.save(function(err){
                if(err){
                    bind.status = 0;
                    bind.message = 'Oops! error occured while updating user status';
                } else {
                    bind.status = 1;
                    bind.message = 'Status was updated successfully';
                    bind.user = user;
                }
                return res.json(bind);
            });
        } else {
            bind.status = 0;
            bind.message = 'Invalid user';
            return res.json(bind);
        }
    })
});

// clear user status
router.get('/clear-user-status/:user_id', function(req, res){
    var bind = {};
    var user_id = req.params.user_id;
    User.findOne({ _id: user_id }, function(err, user){
        if(user){
            user.status = user.college;
            user.save(function(err){
                if(err){
                    bind.status = 0;
                    bind.message = 'Oops! error occured while clearing user status';
                } else {
                    bind.status = 1;
                    bind.message = 'Status was cleared successfully';
                    bind.user = user;
                }
                return res.json(bind);
            });
        } else {
            bind.status = 0;
            bind.message = 'Invalid user';
            return res.json(bind);
        }
    });
});

// add user status
router.post('/add-user-status', function(req, res){
    var bind = {};
    var user_id = req.body.user_id;
    var status = req.body.status;
    
    var newUser_status = new User_status;
    newUser_status.user_id = user_id;
    newUser_status.status = status;
    
    newUser_status.save(function(err){
        if(err){
            bind.status = 0;
            bind.message = 'Oops! error occured while adding user status';
        } else {
            bind.status = 1;
            bind.message = 'Status was added successfully';
            bind.status_info = newUser_status;
        }
        return res.json(bind);
    });
});

// delete user status
router.get('/delete-user-status/:status_id', function(req, res){
    var bind = {};
    var status_id = req.params.status_id;
    User_status.remove({ _id: status_id }, function(err){
        if(err){
            bind.status = 0;
            bind.message = 'Oops! error occured while deleting user status';
            bind.error = err;
        } else {
            bind.status = 1;
            bind.message = 'Status was deleted successfully';
        }
        return res.bind(bind);
    });
});

// get user status list
router.get('/get-user-status-list/:user_id', function(req, res){
    var bind = {};
    var user_id = req.params.user_id;
    User_status.find({ user_id: ObjectId(user_id) }, function(err, status_list){
        if(status_list.length){
            bind.status = 1;
            bind.status_list = status_list;
        } else {
            bind.status = 0;
            bind.message = 'No status found';
        }
        return res.json(bind);
    }).sort({ createdAt: -1}).limit(5);
});

// get all users list
router.get('/get-users-list', function(req, res){
    var bind = {};
    
    User.find({}, { name: 1, status: 1, display_pic: 1}, function(err, users){
        if(users.length){
            bind.status = 1;
            bind.users = users;
        } else {
            bind.status = 0;
            bind.message = 'No users list found';
        }
        return res.json(bind);
    }).sort({ name: 1 }).limit(30);
});

// search in all users list
router.get('/get-users-list/:search_term', function(req, res){
    var bind = {};
    var search_term = req.param('search_term');
    var pattern = new RegExp(search_term, 'i');
    
    User.find({name: {$regex: pattern}}, { name: 1, status: 1, display_pic: 1}, function(err, users){
        if(users.length){
            bind.status = 1;
            bind.users = users;
        } else {
            bind.status = 0;
            bind.message = 'No users list found';
        }
        return res.json(bind);
    }).sort({ name: 1 }).limit(30);
});

router.get('/get-more-participants-list/:group_id', function(req, res){
    var group_id = req.params.group_id;
    var bind = {};
    Channel.findOne({ _id: group_id }, function(err, group){
        if(group){
            var members_id = group.members_id;
            User.find({ _id: { $nin:  members_id} }, { name: 1, status: 1, display_pic: 1}, function(err, users){
            if(users.length){
                bind.status = 1;
                bind.users = users;
            } else {
                bind.status = 0;
                bind.message = 'No users list found';
            }
            return res.json(bind);
        }).sort({ name: 1 }).limit(30);
            
        } else {
            bind.status = 0;
            bind.message = 'No group found';
            return res.json(bind);
        }
    });
    
});

// search user in more participant list
router.get('/get-more-participants-list/:group_id/:search_term', function(req, res){
    var group_id = req.params.group_id;
    var search_term = req.param('search_term');
    var pattern = new RegExp(search_term, 'i');
    
    var bind = {};
    Group.findOne({ _id: group_id }, function(err, group){
        if(group){
            var members_id = group.members_id;
            User.find({ _id: { $nin:  members_id}, name: {$regex: pattern} }, { name: 1, status: 1, display_pic: 1}, function(err, users){
            if(users.length){
                bind.status = 1;
                bind.users = users;
            } else {
                bind.status = 0;
                bind.message = 'No users list found';
            }
            return res.json(bind);
        }).sort({ name: 1 }).limit(30);
            
        } else {
            bind.status = 0;
            bind.message = 'No group found';
        }
    });
    
});

router.post('/sms', function(req, res, next){
    var TWILIO_NUMBER = '+12057746424';
    var message = req.body.message;
    var to = req.body.to;
    client.messages.create({
    body: message,
    to  : to,
    from: TWILIO_NUMBER
  }, function(err, message) {
    if(err) {
     console.log(err);
     res.json(err);
    }
    else{
     console.log(message.sid);
     res.json(message);
    }
  });
});

router.get('/testing', function(req, res, next){ 
    var apn = require('apn');
    var appRoot = require('app-root-path');
    var options = {
        cert: appRoot + "/config/cert.pem",
        key: appRoot + "/config/key.pem",
        production: false
      };

    var apnProvider = new apn.Provider(options);
    var deviceToken = "9714BC5CA55696CF6AC89BE9A62277B8F3D1BCF85CB7E65D1937A1B3288284A4";
    var note = new apn.Notification();

    //note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
    //note.badge = 3;
    //note.sound = "ping.aiff";
    note.alert = "hello, sir how are you?";
    note.payload = {'messageFrom': 'Ava Appleseed'};
    note.topic = "com.yardingllc.yarding";
    
    apnProvider.send(note, deviceToken).then( function(result) {
        // see documentation for an explanation of result
        console.log('notification result '+ JSON.stringify(result));
        return res.json(result);
    });
    
});

module.exports = router;
