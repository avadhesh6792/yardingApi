module.exports = function (ioTrendingChat) {
    console.log('ioTrendingChat :: inside this file');
    ioTrendingChat.on('connection', function (socket) {
        console.log('ioTrendingChat :: someone connected');

        socket.on('join room', function (room) {
            console.log('** ** ** ioTrendingChat user connected to room : ' + room);
            socket.join(room);
        });

        socket.on('send message', function (jsonData) {
            var room_name = jsonData.room_name;
            console.log('send message to channel : ' + room_name);
            io.to(room_name).emit('get message', 'hey new msg');
        });
    });
};



