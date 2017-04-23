var express = require('express');
var router = express.Router();
var User    =  require('../models/user');
var multer = require('multer');
var path = require('path');

var app = express();




  
  var Storage = multer.diskStorage({  
    destination: function(req, file, callback) { 
        callback(null, "./public/uploads/display_pic");  
    },  
    filename: function(req, file, callback) { 
        console.log('aaaaaa'+ JSON.stringify(file) );
        callback(null, Date.now() + "_" + file.originalname);  
    }  
}); 



var upload = multer({ storage: Storage }).array("imgUploader", 3); //Field name and max count

// user sign up
router.post('/sign-up', function(req, res, next) {
    
  upload(req, res, function(err) {  
        if (err) {  
            console.log('Something went wrong!');
            return res.end("Something went wrong!");  
        }
        console.log("File uploaded sucessfully!."+ 'uploads/display_pic/' +req.files[0].filename);
        //return res.json(req.files);
        
          var bind = {};
        var name = req.body.name;
        var college = req.body.college;
        var display_pic = req.files[0].filename;

        var newUser = new User;
        newUser.name = name;
        newUser.college = college;
        newUser.display_pic = 'uploads/display_pic/'+display_pic;

        newUser.save(function(err){
            if(err){
                bind.status = 0;
                bind.message = 'Oops! error occur while sign up';
                bind.error = err;
            } else {
                bind.status = 1;
                bind.message = 'Your are registered successfully';
            }
            return res.json(bind);
        });
        
        //return res.end("File uploaded sucessfully!."+ 'uploads/display_pic/' +req.body.name);  
    });    
    //return res.end('stop');
    

  
});

module.exports = router;
