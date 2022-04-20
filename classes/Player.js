function random(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

function generateToken() {
    this.buffer = "";
    for (let i=0; i<16; i++) {
        this.buffer += keys[random(0, keys.length)];
    };
    return this.buffer;
};

const keys = "AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz0123456789+-=";
const avaliableRoles = ["", "default", "vamp", "sher"];
/*
    default - мирный
    vamp - вампир
    sher - шериф
*/

module.exports = class {
    constructor(name, role) {
        if (avaliableRoles.indexOf(role) == -1) {
            console.error("Invalid player role!");
            this.error = true;
            return;
        };
        this.token = generateToken();
        this.role = role;
        this.name = name;
        this.ready = true;
        this.dead = false;
        this.msg = "";
        this.lastLoginPhase = "0";
        this.attacked = "0";
        this.defended = "0";
    };
};