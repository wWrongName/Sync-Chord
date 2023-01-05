class CNode {
    constructor(config) {
        this.active = config.active
        this.id = config.id
        this.predecessor = config.predecessor
        this.successor = config.successor
        this.fingers = config.fingers
    }
}

module.exports = CNode

