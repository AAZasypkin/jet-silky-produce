const fs = require("fs");
module.exports = class {
    constructor(path) {
    this.path = path;
    this.buffer;
    }
    read() {
        return JSON.stringify(JSON.parse(fs.readFileSync(this.path)));
    }
    get(value) {
        return JSON.stringify(JSON.parse(fs.readFileSync(this.path))[value]);
    }
    write(value, valueToWrite) {
        this.buffer = JSON.parse(fs.readFileSync(this.path));
        this.buffer[value] = valueToWrite;
        this.buffer = JSON.stringify(this.buffer);
        fs.writeFileSync(this.path, this.buffer);
    }
    add(value) {
        this.buffer = JSON.parse(fs.readFileSync(this.path));
        this.buffer.push(value);
        this.buffer = JSON.stringify(this.buffer);
        fs.writeFileSync(this.path, this.buffer);
    }
    reset() {
        fs.writeFileSync(this.path, "")
    }
};
