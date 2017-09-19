var exports = module.exports = {};
var apn = require('apn');
var appRoot = require('app-root-path');

exports.sendAPNotification = function(params){
    var deviceToken = params.deviceToken;
    var alert = params.alert;
    var payload = params.payload;
    var badge = params.badge;
    var options = {
//        cert: appRoot + "/config/cert.pem",
//        key: appRoot + "/config/key.pem",
        cert: appRoot + "/config/YardingllcPush.pem",
        key: appRoot + "/config/YardinllcPushKey.pem",
        production: true
      };

    var apnProvider = new apn.Provider(options);
    var note = new apn.Notification();

    //note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
    if(! badge){
        badge = 1;
    }
    note.badge = badge;
    note.sound = "ping.aiff";
    note.alert = alert;
    note.payload = payload;
    //note.topic = "com.yardingllc.yarding";
    note.topic = "com.Yardingllc.YardingApp";
    
    apnProvider.send(note, deviceToken).then( function(result) {
        // see documentation for an explanation of result
        console.log('notification result '+ JSON.stringify(result));
        //return res.json(result);
    });
}


