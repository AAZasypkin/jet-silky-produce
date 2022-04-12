module.exports = function(data, io) {
    io.sockets.emit("gotInfo", {"description": data});
    console.log(data);
};