var channelController = require('../controllers/channelController');

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
            
            //console.log('** ** ** ioTrendingChat user connected to channel : ' + channel_id + ' ' + user_id);
            
            if(room_type == 'single'){
                console.log('***room type single****');
                var user_id1 = user_id;
                var user_id2 = channel_id;
                var user_ids = {
                    user_id1: user_id1,
                    user_id2: user_id2
                };
                channelController.createSingleChannel(user_ids, function(response){
                    //console.log('channelController.getChannelMessages response '+ JSON.stringify(response));
                    var channel_id = response.channel_id;
                    jsonData.channel_id = channel_id;
                    socket.join(channel_id);
                    channelController.getChannelMessages(jsonData, socket, function(response){
                        //console.log('channelController.getChannelMessages response '+ JSON.stringify(response));
                        response.channel_id = channel_id;
                        socket.emit('get channel messages', response);
                    });
                });
            } else {
                console.log('***room type other ****');
                socket.join(channel_id);
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
            console.log('send message to channel : ' + channel_id + ' ' + message);
            //ioTrendingChat.to(channel_id).emit('get message', jsonData);
            
            channelController.saveMessage(jsonData, socket, function(response){
                console.log('channelController.saveMessage response '+ JSON.stringify(response));
                ioTrendingChat.to(channel_id).emit('get message', response);
            });
            
        });
        
        socket.on('leave channel', function (channel_id) {
            console.log('** ** ** ioTrendingChat user disconnected to channel : ' + channel_id);
            socket.leave(channel_id);
        });
        
    });
};



