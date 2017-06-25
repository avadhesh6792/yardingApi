module.exports = function (ioTrendingChat) {
    console.log('ioTrendingChat :: inside this file');
    ioTrendingChat.on('connection', function (socket) {
        console.log('ioTrendingChat :: someone connected');

        socket.on('join channel', function (channel_name) {
            console.log('** ** ** ioTrendingChat user connected to room : ' + channel_name);
            socket.join(channel_name);
        });

        socket.on('send message', function (jsonData) {
            var channel_name = jsonData.channel_name;
            var message = jsonData.message;
            console.log('send message to channel : ' + channel_name);
            ioTrendingChat.to(channel_name).emit('get message', message);
        });
    });
};



