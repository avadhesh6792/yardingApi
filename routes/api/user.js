var express = require('express');
var router = express.Router();
var multer = require('multer');
var User = require('../../models/user');
var twilio  = require('twilio');

var TWILIO_ACCOUNT_SID = 'AC07762a2e784bdfc2224c044620661ec2';
var TWILIO_AUTH_TOKEN = 'b6e01cb00d70a1929ac0a22296e158e4';
var client  = new twilio.RestClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN); 



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
        var display_pic = req.file ? 'uploads/display_pic/' + req.file.filename : 'uploads/default/default.png';

        var newUser         = new User;
        newUser.name        = name;
        newUser.college     = college;
        newUser.display_pic = display_pic;
        newUser.phone_no    = phone_no;

        newUser.save(function (err) {
            if (err) {
                bind.status     = 0;
                bind.message    = 'Oops! error occur while sign up';
                bind.error      = err;
            } else {
                bind.status     = 1;
                bind.message    = 'Your are registered successfully';
                bind.user       = newUser;
            }
            return res.json(bind);
        });

        //return res.end("File uploaded sucessfully!."+ 'uploads/display_pic/' +req.body.name);  
    });
    //return res.end('stop');



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

module.exports = router;
