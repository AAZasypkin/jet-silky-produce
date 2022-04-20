const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const app = express();
const server = http.Server(app);
const io = socketIO(server);
const path = require("path");
const fs = require("fs");
const Datastore = require('nedb');

const baseURL = "https://jet-silky-produce.glitch.me/";

const sendInfo = require("./functions/sendInfo.js");

const Database = require("./classes/Database.js");
const Player = require("./classes/Player.js");
const { range } = require("express/lib/request");

var players = new Datastore({filename : "database/players.ini", autoload: true});
var game = new Datastore({filename : "database/game.ini", autoload: true});
var managers = new Datastore({filename : "database/managers.ini", autoload: true});

io.on("connection", function(socket) {
    console.log("A user connected");
    socket.on("disconnect", function () {
        console.log("A user disconnected");
    });
});

app.set("port", 5000);
app.use("/assets", express.static(`${__dirname}/assets`));

app.get("/", (req, res) => {
    res.sendFile(`${__dirname}/pages/login/index.html`)
});

app.get("/manage", (req, res) => {
    res.sendFile(`${__dirname}/pages/manage/login.html`);
});

app.get("/manage/:token", (req, res) => {
    managers.find({token: req.params.token}, function (err, docs) {
        if (docs.length == 0) {
            return res.send("Отказано в доступе.");
        };
        res.sendFile(`${__dirname}/pages/manage/running.html`);
    });
});

app.get("/game/:token", (req, res) => {
    players.find({token: req.params.token}, function (err, docs) {
        if (docs.length == 0) {
            return res.send("<script>alert('Пользователь не найден'); window.location.href = 'https://jet-silky-produce.glitch.me/'</script>");
        }
        else {
            game.find({}, function (err1, docs1) {
                res.send(fs.readFileSync(`${__dirname}/pages/game/index.html`).toString()
                    .split('<p id="name"></p>')
                        .join(`<p id="name">${docs[0].name} (id ${docs[0]._id})</p>`)
                    .split('<p id="role"></p>')
                        .join(`<p id="role">Ваша роль: ${docs[0].role
                                .split("default")
                                    .join("Мирный")
                                .split("vamp")
                                    .join("Вампир")
                                .split("sher")
                                    .join("Шериф")
                            }</p>`)
                    .split('<p id="phase"></p>')
                        .join(`<p id="phase">Текущая фаза: ${docs1[0].phase.toString().split("fin").join("Финал")}</p>`)
                );
            });
        };
    });
});

function killDead() {
    players.find({}, function (err, docs) {
        for (let pl of docs) {
            if (parseInt(pl.attacked) > parseInt(pl.defended)+1) {
                if (!pl.dead) {
                    sendInfo(`!!!${pl.name} был убит!!!`, io);
                };
                io.sockets.emit("playerKilled", {"description": pl.token});
                players.update({_id: pl._id}, {$set: {dead: true}}, {});
            };
        };
    });
};

app.get("/nextPhase/:token", (req, res) => {
    killDead();
    setTimeout(function() {
        players.find({}, function (err, docs1) {
            this.rolesLeft = [];
            for (let pl of docs1) {
                if (!pl.dead) {
                    this.rolesLeft.push(pl.role);
                };
            };
            this.rolesLeft = new Set(this.rolesLeft);
            if (this.rolesLeft.size == 0) {
                managers.find({token: req.params.token}, function (err, docs) {
                    if (docs.length == 0) {
                        return res.send("Отказано в доступе.");
                    };
                    game.update({}, {$set: {phase: "fin"}}, {});
                    game.update({}, {$set: {result: "Ничья!"}}, {});
                    io.sockets.emit("phaseChanged", {"description": ""});
                    res.send("ok");
                });
            } else if (this.rolesLeft.size == 1) {
                managers.find({token: req.params.token}, function (err, docs2) {
                    if (docs2.length == 0) {
                        return res.send("Отказано в доступе.");
                    };
                    game.update({}, {$set: {phase: "fin"}}, {});
                    game.update({}, {$set: {result: `Победили ${Array.from(this.rolesLeft)[0]
                        .split("default").join("Мирные")
                        .split("vamp").join("Вампиры")
                        .split("sher").join("Шерифы")}!`}}, {});
                    io.sockets.emit("phaseChanged", {"description": ""});
                    res.send("ok");
                });
            } else {
                managers.find({token: req.params.token}, function (err, docs3) {
                    if (docs3.length == 0) {
                        return res.send("Отказано в доступе.");
                    };
                    game.find({}, function (err, docs1) {
                        this.buffer = docs1[0].phase + 1;
                        game.update({}, {$set: {phase: this.buffer}}, {});
                    });
                    io.sockets.emit("phaseChanged", {"description": ""});
                    res.send("ok");
                });
            }
        });
    }, 3000)
});

app.get("/newPlayer/:token/:name/:role", (req, res) => {
    managers.find({token: req.params.token}, function (err, docs) {
        if (docs.length == 0) {
            return res.send("Отказано в доступе.");
        };
        this.buffer = new Player(req.params.name, req.params.role);
        if (!this.buffer.error) {players.insert(this.buffer)};
    });
});

//Получение списка игроков для отображения на странице (кроме самого себя и мёртвых)
app.get("/getPlayers/:tokenToExclude", (req, res) => {
    players.find({}, function(err, docs) {
        this.buffer = [];
        for (let i in docs) {
            if ((docs[i].token != req.params.tokenToExclude) && (!docs[i].dead)) {
                this.buffer.push(`${docs[i].name} (id ${docs[i]._id})`);
            };
        };
        res.send(JSON.stringify(this.buffer));
    });
});

app.get("/idByToken/:token", (req, res) => {
    players.find({token: req.params.token}, function(err, docs) {
        res.send(docs[0].id.toString())
    });
});

app.get("/roleById/:id", (req, res) => {
    players.find({_id: req.params.id}, function(err, docs) {
        res.send(docs[0].role.toString())
    });
});

app.get("/attackPlayer/:id", (req, res) => {
    players.find({_id: req.params.id}, function(err, docs) {
        this.buffer = parseInt(docs[0].attacked);
        this.buffer++;
        this.buffer = this.buffer.toString();
        players.update({_id: req.params.id}, {$set: {attacked: this.buffer}}, {});
        sendInfo(`!${docs[0].name} был атакован!`, io)
    });
    res.send("ok");
});

app.get("/defendPlayer/:id", (req, res) => {
    players.find({_id: req.params.id}, function(err, docs) {
        this.buffer = parseInt(docs[0].defended);
        this.buffer++;
        this.buffer = this.buffer.toString();
        players.update({_id: req.params.id}, {$set: {defended: this.buffer}}, {});
    });
    res.send("ok");
});

app.get("/clearAttacks/:token", (req, res) => {
    players.update({token: req.params.token}, {$set: {attacked: 0}}, {});
    players.update({token: req.params.token}, {$set: {defended: 0}}, {});
    res.send("ok");
});

app.get("/editReady/:token/:value", (req, res) => {
    players.update({token: req.params.token}, {$set: {ready: eval(req.params.value)}}, {});
    res.send("ok");
});

app.get("/checkReady/:token/", (req, res) => {
    players.find({token: req.params.token}, function(err, docs) {
        res.send(docs[0].ready.toString());
    });
});

app.get("/checkDead/:token/", (req, res) => {
    players.find({token: req.params.token}, function(err, docs) {
        res.send(docs[0].dead.toString());
    });
});

app.get("/writeMsgToPlayer/:token/:value", (req, res) => {
    try {
        players.update({token: req.params.token}, {$set: {msg: eval(req.params.value)}}, {});
    } catch (error) {
        players.update({token: req.params.token}, {$set: {msg: req.params.value}}, {});
    }
    res.send("ok");
});

app.get("/readMsgPlayer/:token/", (req, res) => {
    players.find({token: req.params.token}, function(err, docs) {
        res.send(docs[0].msg);
    });
});

app.get("/lastLoginPhase/:token/", (req, res) => {
    players.find({token: req.params.token}, function(err, docs) {
        res.send(docs[0].lastLoginPhase.toString());
    });
});

app.get("/writeLastLoginPhase/:token/:value/", (req, res) => {
    players.update({token: req.params.token}, {$set: {lastLoginPhase: req.params.value}}, {});
    res.send("ok");
});

app.get("/addToDone/:token/:action/:targetID", (req, res) => {
    game.find({}, function(err, docs) {
        players.find({token: req.params.token}, function(err1, docs1) {
            players.find({_id: req.params.targetID}, function(err2, docs2) {
                this.buffer = JSON.parse(docs[0].done);
                //Объект (0) выполнил действие (1) относительно кого-то (2)
                this.buffer.push([
                    docs1[0].name,
                    req.params.action
                        .split("checked").join("проверил"),
                    docs2[0].name
                ]);
                game.update({}, {$set: {done: JSON.stringify(this.buffer)}}, {});
            });
        });
    });
    res.send("ok");
});

app.get("/getResult", (req, res) => {
    game.find({}, function(err, docs) {
        res.send(docs[0].result);
    });
});

app.get("/groupRoles/:token/:args", (req, res) => {
    try {
        groupRolesBuffer = req.params.args.split(" ");
    } catch (error) {
        return console.log(error);
    };
    if (groupRolesBuffer.length != 3) {return console.log("Low length!")};
    players.find({}, function(err, docs) {
        for (i=0; i<docs.length; i++) {
            if (groupRolesBuffer[0] > 0) {
                this.forBuffer = "default";
                groupRolesBuffer[0]--;
            } else if (groupRolesBuffer[1] > 0) {
                this.forBuffer = "vamp";
                groupRolesBuffer[1]--;
            } else if (groupRolesBuffer[2] > 0) {
                this.forBuffer = "sher";
                groupRolesBuffer[2]--;
            };
            players.update({token: docs[i].token}, {$set: {role: this.forBuffer}}, {});
        };
    });
});

app.get("/index.css", (req, res) => {
    res.sendFile(`${__dirname}/index.css`);
});

server.listen(5000, () => {
    console.log("Ready!");
    players.find({}, function (err, docs) {
        console.log(docs)
    })
});