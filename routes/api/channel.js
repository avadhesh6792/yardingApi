var express = require('express');
var router = express.Router();
var multer = require('multer');
var Channel = require('../../models/channel');

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

// create new channel doc
router.get('/create-channel/doc', function(req, res, next){
    var bind = {};
    bind.field_name = ['channel_name', 'channel_type' , 'user_id', 'channel_pic'];
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
        var channel_name        = req.body.channel_name;
        var channel_type     = req.body.channel_type; // 'public', 'private'
        var user_id    = req.body.user_id;
        var channel_pic = req.file ? 'uploads/channel_pic/' + req.file.filename : 'uploads/default/default-channel.jpg';

        var newChannel         = new Channel;
        newChannel.channel_name        = channel_name;
        newChannel.channel_type     = channel_type;
        newChannel.channel_pic = channel_pic;
        newChannel.user_id    = user_id;

        newChannel.save(function (err) {
            if (err) {
                bind.status     = 0;
                bind.message    = 'Oops! error occur while creating new channel';
                bind.error      = err;
            } else {
                bind.status     = 1;
                bind.message    = 'Channel was created successfully';
                //bind.user       = newUser;
            }
            return res.json(bind);
        });

    });
});

// get all channels
router.get('/get-all-channels', function(req, res, next){
    var bind = {};
    Channel.find({}, function(err, channels){
        if(err){
            bind.status = 0;
            bind.message = 'Oops! error occur while fetching all channels';
            bind.err = err;
        } else if(channels.length > 0){
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
router.get('/search-channel/:term', function(req, res, next){
    var bind = {};
    var term = req.param('term');
    var pattern = new RegExp(term, 'i');
    
    Channel.find({ channel_name : { $regex: pattern} }, function(err, channels){
        if(err){
            bind.status = 0;
            bind.message = 'Oops! error occur while fetching all channels';
            bind.err = err;
        } else if(channels.length > 0){
            bind.status = 1;
            bind.channels = channels;
        } else {
            bind.status = 0;
            bind.message = 'No channels found';
        }
        return res.json(bind);
    });
    
    
});


module.exports = router;
