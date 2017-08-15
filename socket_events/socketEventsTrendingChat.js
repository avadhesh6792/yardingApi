var channelController = require('../controllers/channelController');
var url = require('url');
var request = require('request');

module.exports = function (ioTrendingChat) {
    console.log('ioTrendingChat :: inside this file');
    ioTrendingChat.on('connection', function (socket) {
        console.log('ioTrendingChat :: someone connected');

        /** join channel
         * jsonData = {
         *  channel_id, user_id
         * }
         */
        socket.on('join channel', function (jsonData) {
            
            var channel_id = jsonData.channel_id;
            var user_id = jsonData.user_id;
            var room_type = jsonData.room_type; // channel, group, single
            jsonData.online_status = true;
            
            console.log('** ** ** ioTrendingChat user connected to channel : ' + channel_id + ' ' + user_id);
            
            if(room_type == 'single'){
                console.log('*** room type single ****');
                var user_id1 = user_id;
                var user_id2 = channel_id;
                var user_ids = {
                    user_id1: user_id1,
                    user_id2: user_id2
                };
                channelController.createSingleChannel(user_ids, function(response){
                    console.log('channelController.createSingleChannel response '+ JSON.stringify(response));
                    var channel_id = response.channel_id;
                    jsonData.channel_id = channel_id;
                    socket.join(channel_id);
                    channelController.getChannelMessages(jsonData, socket, function(response){
                        response.channel_id = channel_id;
                        console.log('channelController.getChannelMessages response '+ JSON.stringify(response));
                        socket.emit('get channel messages', response);
                    });
                    
                    // set user online
                    channelController.setUserOnlineStatus(jsonData, socket, function(response){
                        console.log('channelController.setUserOnline response '+ JSON.stringify(response));
                    });
                    
                });
            } else {
                console.log('***room type other ****');
                socket.join(channel_id);
                // set user online
                channelController.setUserOnlineStatus(jsonData, socket, function(response){
                    console.log('channelController.setUserOnline response '+ JSON.stringify(response));
                });
                
                channelController.getChannelMessages(jsonData, socket, function(response){
                    //console.log('channelController.getChannelMessages response '+ JSON.stringify(response));
                    response.channel_id = channel_id;
                    socket.emit('get channel messages', response);
                });
                
            }
            
            
            
            
            if(room_type == 'channel'){
                channelController.joinChannel(jsonData, socket, function(response){
                    console.log('channelController.joinChannel response '+ JSON.stringify(response));
                });
            }
            
            
        });
        
        /**
         * send message
         * jsonData = {
         *  channel_id, user_id, message, message_type, display_pic, name
         * }
         */

        socket.on('send message', function (jsonData) {
            var channel_id = jsonData.channel_id;
            var message = jsonData.message;
            var user_id = jsonData.user_id;
            var message_type = jsonData.message_type;
            console.log('send message to channel : ' + channel_id + ' ' + message);
            
            if(message_type == 'url'){
                //jsonData.thumbnail = 'testing';
                var url_msg = message;
                var url_parse = url.parse(url_msg);
                if (!url_parse['protocol']) {
                    url_msg = 'http://' + url_msg;
                }
                
                request('https://api.urlmeta.org/?url=' + url_msg, function (error, response, body) {
                    var body_parse = JSON.parse(body);
                    if (!error) {
                        if (body_parse['result']['status'] == 'OK') {
                            if (body_parse['meta']['image']) {
                                jsonData.thumbnail = body_parse['meta']['image'];
                            } else {
                                jsonData.thumbnail = body_parse['meta']['favicon'];
                            }
                            jsonData.message = message + '~' + body_parse['meta']['description'];
                        }
                        //console.log('************************ url meta ******************' + body_parse['meta']['image'] + ' ' +body_parse['meta']['favicon']);
                        channelController.saveMessage(jsonData, socket, function(response){
                            console.log('channelController.saveMessage response '+ JSON.stringify(response));
                            
                            // send message to online user
                            ioTrendingChat.to(channel_id).emit('get message', response);
                            
                            // send message to offline user
                            
                            
                        });
                    }
                    
                });
                
                
            } else {
                channelController.saveMessage(jsonData, socket, function(response){
                    console.log('channelController.saveMessage response '+ JSON.stringify(response));
                    
                    // send message to online user
                    ioTrendingChat.to(channel_id).emit('get message', response);
                    
                    // send message to offline user
                    channelController.sendMessageToOfflineUser(jsonData, socket, function(response){
                        console.log('channelController.sendMessageToOfflineUser response '+ JSON.stringify(response));
                    });
                });
            }
//            if(message_type == 'url'){
//                var url_msg = message;
//                var url_arr = url_msg.split('~');
//                jsonData.message = url_arr[0] + ( url_arr[1] ? '~'+url_arr[1] : '');
//                jsonData.thumbnail = url_arr[2] ? url_arr[2] : '';
//            }
            
        });
        
        /** leave channel
         * jsonData = {
         *  channel_id, user_id
         * }
         */
        socket.on('leave channel', function (jsonData) {
            var user_id = jsonData.user_id;
            var channel_id = jsonData.channel_id;
            jsonData.online_status = false;
            console.log('** ** ** ioTrendingChat user disconnected to channel : ' + channel_id);
            socket.leave(channel_id);
            // set user offline
            channelController.setUserOnlineStatus(jsonData, socket, function(response){
                console.log('channelController.setUserOffline response '+ JSON.stringify(response));
            });
        });
        
    });
};



