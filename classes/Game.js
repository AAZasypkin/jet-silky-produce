//это не импортируем, следим за жсон файлом по этому

module.exports = class {
    constructor() {
        this.running = false;
        this.phase = 0;
    }
    start() {
        if (this.running) {
            return console.error("Game is already started.")
        }
        this.running = true;
    }
    nextPhase() {
        this.phase += 1;
        return this.phase;
    }
};

/*
Номера фаз:
    0 - подготовка, вход игроков.
*/