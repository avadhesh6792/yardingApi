var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var database = require('../config/database');
var User    =  require('../models/user');
var Channel    =  require('../models/channel');


 mongoose.connect(database.db_connection, function (err, res) {
    if (err) {
    console.log ('ERROR connecting to: ' + database.db_connection + '. ' + err);
    } else {
    console.log ('Succeeded connected to: ' + database.db_connection);
    }
  });
  
router.get('/', function(req, res, next){
    return res.send('home page');
});  

/* GET users listing. */
router.get('/save-user', function(req, res, next) {
  var bind = {};
  
  var newUser = new User;
  newUser.name = 'Avadhesh';
  newUser.lastname = 'Bhatt';
  newUser.email = 'avadheshbhatt92@gmail.com';
  
  newUser.save(function(err){
      if(err){
          bind.status = 0;
          bind.message = 'Oops! error occur while saving user';
          bind.error = err;
      } else {
          bind.status = 1;
          bind.message = 'Data saved successfully';
          bind.user = newUser;
          
          var newChannel = new Channel;
          newChannel.channelName = 'ava channel';
          newChannel.userId = newUser._id;
          
          newChannel.save();
      }
      
      return res.json(bind);
  });
  
});

router.get('/get-user/:userId', function(req, res, next){
    var userId = req.param('userId');
    var bind = {};
    User.findOne({ _id : userId }, function(err, user){
        if(err){
            bind.status = 0;
            bind.message = 'Oops! error occur while fetching user by id';
            bind.error = err;
        } else {
            if(user){
                bind.status = 1;
                bind.user = user;
            } else {
                bind.status = 0;
                bind.message = 'No user found';
            }
        }
        return res.json(bind);
    });
});

router.get('/lookup', function(req, res, next){
    var bind = {};
    User.aggregate([
        {
            $lookup: {
                from: 'channels',
                localField: '_id',
                foreignField: 'userId',
                as: 'channels'
            }
        }
    ], function(err, users){
        if(err){
            bind.status = 0;
            bind.message = 'Oops! error occur';
            bind.error = err;
        } else {
            if(users){
                bind.status = 1;
                bind.users = users;
            } else {
                bind.status = 0;
                bind.message = 'No users found';
            }
            
        }
        return res.json(bind);
    });
    
});

module.exports = router;
