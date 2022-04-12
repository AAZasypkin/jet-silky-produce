module.exports = function(path) {
    if (!Array.isArray(path)) {
        return console.error("Path is not an Array!");
    };
    this.buffer = window.location.href.split("/").slice(0, 3);
    for (let i of path) {
        this.buffer.push(i);
    };
    this.buffer = this.buffer.join("/");
    return this.buffer;
};