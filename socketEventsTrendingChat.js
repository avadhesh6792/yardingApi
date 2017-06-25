module.exports = function (ioTrendingChat) {
    console.log('ioTrendingChat :: inside this file');
    ioTrendingChat.on('connection', function (socket) {
        console.log('ioTrendingChat :: someone connected');

        socket.on('join channel', function (channel_id) {
            console.log('** ** ** ioTrendingChat user connected to channel : ' + channel_id);
            socket.join(channel_id);
            
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



