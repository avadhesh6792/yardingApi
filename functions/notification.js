var exports = module.exports = {};
var apn = require('apn');
var appRoot = require('app-root-path');

exports.sendAPNotification = function(deviceToken, alert, payload){
    var options = {
        cert: appRoot + "/config/cert.pem",
        key: appRoot + "/config/key.pem",
        production: false
      };

    var apnProvider = new apn.Provider(options);
    var note = new apn.Notification();

    //note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
    //note.badge = 3;
    note.sound = "ping.aiff";
    note.alert = alert;
    note.payload = payload;
    note.topic = "com.yardingllc.yarding";
    
    apnProvider.send(note, deviceToken).then( function(result) {
        // see documentation for an explanation of result
        console.log('notification result '+ JSON.stringify(result));
        //return res.json(result);
    });
}


