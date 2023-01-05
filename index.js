const readline = require("readline")
const fConfig = require("./config.js")
const ChordModel = require("./ChordModel.js")
require("./initLogger.js")

const defaultConfig = {
    amountOfNodes : 8,
    preInitNodes : [0, 4, 7]
}
let config = Object.assign(defaultConfig, fConfig)
console.info(`Init config: ${JSON.stringify(config)}`)

class ChordCLI {
    constructor(config) {
        this.cmdModel = {
            exit : {
                mnemonic : ["exit", "e"],
                action : this.exit.bind(this),
                description : "Stop application execution"
            },
            help : {
                mnemonic : ["help", "h"],
                action : this.help.bind(this),
                description : "Show entire cmd list"
            },
            connect : {
                mnemonic : ["connect", "c"],
                action : this.connect.bind(this),
                description : "Connect new peer to the chord model"
            },
            disconnect : {
                mnemonic : ["disconnect", "d"],
                action : this.disconnect.bind(this),
                description : "Disconnect a peer from the chord model"
            },
            status : {
                mnemonic : ["status", "s"],
                action : this.status.bind(this),
                description : "Get status about the chord model"
            }
        }
        this.cmds = Object.keys(this.cmdModel)
        this.chordModel = new ChordModel(config)
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })
    }

    exit() {
        process.exit(0)
    }

    help() {
        this.cmds.forEach(cmdName => {
            let info = this.cmdModel[cmdName].description
            let mnemonic = this.cmdModel[cmdName].mnemonic
            console.log(JSON.stringify(mnemonic), "-", info)
        })
    }

    connect() {
        this.chordModel.connectNode()
    }

    disconnect(id) {
            this.chordModel.disconnectNode(id)
    }

    status() {
        this.chordModel.getStatus()
    }

    processInput(input) {
        input = input.split(" ")
        let inputData = input[0]
        let command = this.cmds.reduce((prev, cmdName) => {
            let command = this.cmdModel[cmdName]
            if (command.mnemonic.indexOf(inputData) !== -1)
                return command
            return prev
        }, undefined)
        try {
            if (input.length === 2)
                command.action(input[1])
            else
                command.action()
        } catch (e) {
            console.trace(e)
            console.error(`Wrong command: ${inputData}`)
        }
    }

    prompt(msg) { 
        return new Promise(resolve => {
            this.rl.question(msg, res => {
                resolve(res)
            })
        })
    }

    async start() {
        while (true) {
            let inputData = await this.prompt("*> ")
            this.processInput(inputData)
        }
    }
}

const chordCLI = new ChordCLI(config)
chordCLI.start()

