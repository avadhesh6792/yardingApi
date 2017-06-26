var userController = require('../controllers/userController');

module.exports = function (ioTrendingChat) {
    console.log('ioTrendingChat :: inside this file');
    ioTrendingChat.on('connection', function (socket) {
        console.log('ioTrendingChat :: someone connected');

        socket.on('join channel', function (jsonData) {
            var channel_id = jsonData.channel_id;
            var user_id = jsonData.user_id;
            console.log('** ** ** ioTrendingChat user connected to channel : ' + channel_id + ' ' + user_id);
            socket.join(channel_id);
            
            

            var response = userController.joinChannel(jsonData, socket, function(response){
                console.log('userController.joinChannel response '+ JSON.stringify(response));
                
            });
            
        });

        socket.on('send message', function (jsonData) {
            var channel_id = jsonData.channel_id;
            var message = jsonData.message;
            console.log('send message to channel : ' + channel_id + ' ' + message);
            ioTrendingChat.to(channel_id).emit('get message', message);
        });
        
        socket.on('leave channel', function (channel_id) {
            console.log('** ** ** ioTrendingChat user disconnected to channel : ' + channel_id);
            socket.leave(channel_id);
        });
        
    });
};



