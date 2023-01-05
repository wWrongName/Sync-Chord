const CNode = require("./CNode.js")


class ChordModel {
    constructor(config) {
        console.info(`Chord config ${JSON.stringify(config)}`)
        this.config = config
        console.debug("Create ChordModel")
        this.nodes = []
        for (let nodeId = 0; nodeId < config.amountOfNodes; nodeId++) {
            const nodeConfig = {
                id : nodeId,
                successor : null,
                predecessor : null,
                fingers : [],
                active : config.preInitNodes.indexOf(nodeId) !== -1
            }
            this.insertNode(nodeConfig)
        }
        this.updModel()
        console.debug("ChordModel has successfully been created")
    }

    getStatus () {
        let model = ["id", "active", "successor", "predecessor", "fingers"]
        model.forEach(param => {
            let paramsStr = this.nodes.reduce((prev, cur) => {
                prev += `${param.substring(0, 1)}:${cur[param]}\t\t`
                return prev
            }, "")
            console.log(paramsStr)
        }) 
    }

    insertNode(nodeConfig) {
        console.trace(`Add new node: ${JSON.stringify(nodeConfig)}`)
        this.nodes.push(new CNode(nodeConfig))
    }

    removeNode(nodeId) {
        console.trace(`Remove node: ${nodeId}`)
        this.node = this.node.filter(node => node.id !== nodeId)
    }

    //findSuccessor(id) {
    //    if (id > this.config.id && id < this.config.successor) {
    //        return this.config.successor
    //    } else {
    //        
    //    }
    //}

    //closestPrecedingNode(id) {
    //    for (let counter = this.config.addrLen, counter > 0, counter--) {
    //        let finger = this.config.finders[counter]
    //        if (finger > this.id && finger < id)
    //            return finger
    //    }
    //    return this.id
    //}


    connectNode() {
        let freeNode = this.nodes.find(node => !node.active)
        if (freeNode) {
            freeNode.active = true
            console.trace(`Node connected. New id: ${freeNode.id}`)
            this.updModel()
            return freeNode.id
        } else 
            console.warn("There is no free place for a new peer")

    }

    disconnectNode(id) {
        if (id > -1 && id < this.config.amountOfNodes) {
            let node = this.nodes.find(node => node.id == id)
            node.active = false
            node.successor = null
            node.predecessor = null
            node.fingers = []
            this.updModel()
            return
        } else 
            console.warn(`Id (${id}) is out of range`)
    }

    fix_fingers(sourceNode) {
        console.trace(`Fix fingers for node: ${sourceNode.id}`)
        let fingers = []
        let log = this.log(2, this.config.amountOfNodes)
        for (let degree = 0; degree < log; degree++) {
            for (let offset = 0; offset < this.config.amountOfNodes; offset++) {
                let fingerId = this.mod(sourceNode.id + Math.pow(2, degree) + offset)
                if (this.nodes.find(nextNode => nextNode.id === fingerId && nextNode.active)) {
                    console.trace(`Confirmed finger: ${fingerId}`) 
                    fingers.push(fingerId)
                    break;
                }
            }
        }
        sourceNode.fingers = fingers
    }

    log(base, num) {
        return Math.log(num) / Math.log(base)
    }

    find_successor(sourceNode) {
        console.trace(`Find successor for node: ${sourceNode.id}`)
        for (let offset = 0; offset < this.config.amountOfNodes; offset++) {
            let successorId = this.mod(sourceNode.id + offset)
            if (this.nodes.find(nextNode => nextNode.id === successorId && nextNode.active)) {
                console.trace(`Confirmed successor: ${successorId}`)
                sourceNode.successor = successorId
                return
            }
        }
    }

    find_predecessor(sourceNode) {
        console.trace(`Find predecessor for node: ${sourceNode.id}`)
        for (let offset = 0; offset < this.nodes.length; offset++) {
            let predecessorId = this.mod(sourceNode.id - offset)
            console.trace(`Supposed predecessor: ${predecessorId}`)
            if (this.nodes.find(nextNode => nextNode.id === predecessorId && nextNode.active)) {
                console.trace(`Confirmed predecessor: ${predecessorId}`)
                sourceNode.predecessor = predecessorId
                return
            }
        }
    }

    mod(num) {
        let p = this.config.amountOfNodes
        if (num < 0) {
            num = -num
            num = p - num % p
        }
        return num % p
    }

    updModel() {
        console.trace(`Upd chord model`)
        for (let node of this.nodes) {
            if (!node.active)
                continue
            console.trace(`Upd node: ${JSON.stringify(node)}`)
            this.fix_fingers(node)
            this.find_predecessor(node)
            this.find_successor(node)
            console.trace(`Node ${node.id} has successfully been updated`)
        }
    }
        
}

module.exports = ChordModel

