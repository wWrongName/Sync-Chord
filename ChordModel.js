const CNode = require("./CNode.js")

class ChordModel {
    constructor(config) {
        console.info(`Chord config ${JSON.stringify(config)}`)
        this.config = config
        console.debug("Create ChordModel")
        this.nodes = []
        for (let nodeId = 0; nodeId < config.amountOfNodes; nodeId++) {
            const nodeConfig = {
                id: nodeId,
                successor: null,
                predecessor: null,
                fingers: [],
                active: config.preInitNodes.indexOf(nodeId) !== -1,
            }
            this.insertNode(nodeConfig)
        }
        this.updModel()
        console.debug("ChordModel has successfully been created")
    }

    getStatus() {
        let model = ["id", "active", "successor", "predecessor", "fingers"]
        model.forEach((param) => {
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
        this.node = this.node.filter((node) => node.id !== nodeId)
    }

    getNodeById(id) {
        return this.nodes.find((node) => node.id == id)
    }

    notifySucWhileDisc(id, predecessor) {
        let sNode = this.getNodeById(id)
        sNode.predecessor = predecessor 
    }

    notifyPreWhileDisc(id, successor) {
        let pNode = this.getNodeById(id)
        pNode.successor = successor 
    }

    deactivateNode(node) {
        node.active = false
        node.successor = null
        node.predecessor = null
        node.fingers = []
    }

    realDisconnection(id) {
        if (id > -1 && id < this.config.amountOfNodes) {
            let node = this.nodes.find((node) => node.id == id)
            this.notifySucWhileDisc(node.successor, node.predecessor)
            this.notifyPreWhileDisc(node.predecessor, node.successor)
            this.deactivateNode(node)
            // this.realUpdNetwork()
            return
        } else console.warn(`Id (${id}) is out of range`)
    }

    realConnection(newClientId, trustedClientId) {
        let trustedNode = this.getNodeById(trustedClientId)
        if (!trustedNode.active) {
            console.warn(`Inactive node ${trustedClientId}`)
            return
        }
        if (this.traceRouteInterface(trustedClientId, newClientId)) {
            console.warn(`Id ${newClientId} is occupied ;/`)
            return
        }
        console.trace(`Connect ${newClientId} by ${trustedClientId}`)
        let successor = this.findRealSuccessor(newClientId, trustedNode)
        let newClientNode = this.getNodeById(newClientId)
        newClientNode.active = true
        newClientNode.successor = successor
        newClientNode.predecessor = this.getNodeById(successor).predecessor
        newClientNode.fingers = [0, 0, 0]
        this.notify(successor, newClientId)
        this.realUpdNetwork()
    }

    realUpdNetwork() {
        console.trace(`Upd chord model`)
            for (let node of this.nodes) {
                if (!node.active) continue
                console.trace(`Upd node: ${JSON.stringify(node)}`)
                this.trueFixFingers(node)
                this.stabilize(node)
                console.trace(`Node ${node.id} has successfully been updated`)
            }
    }

    trueFixFingers(node) {
        for (let i in node.fingers)
            node.fingers[i] = this.findRealSuccessor(
                this.mod(node.id + Math.pow(2, i)),
                node
            )
    }

    stabilize(node) {
        let oldPredecessor = this.getPredecessorIdOfSuccessor(node)
        if (this.idInCircleRange(oldPredecessor, [node.id, node.successor]))
            node.successor = oldPredecessor
        this.notify(node.successor, node.id)
    }

    notify(nodeSuccessor, notifierId) {
        let sNode = this.getNodeById(nodeSuccessor)
        if (this.idInCircleRange(notifierId, [sNode.predecessor, sNode.id]))
            sNode.predecessor = notifierId
    }

    getPredecessorIdOfSuccessor(node) {
        return this.getNodeById(node.successor).predecessor
    }

    findRealSuccessor(clientId, trustedNode) {
        console.trace(
            `Find successor for node ${clientId} by ${trustedNode.id}`
        )
        if (
            this.idInCircleRange(clientId, [
                trustedNode.id,
                this.mod(trustedNode.successor + 1),
            ])
        ) {
            console.trace(
                `Get successor ${trustedNode.successor} for ${clientId}`
            )
            return trustedNode.successor
        } else {
            let closestNode = this.closestPrecedingNode(clientId, trustedNode)
            console.trace(`Get closest node ${closestNode.id}`)
            return this.findRealSuccessor(clientId, closestNode)
        }
    }

    closestPrecedingNode(clientId, trustedNode) {
        for (let fIndex = this.config.addrSize - 1; fIndex > -1; fIndex--) {
            let finger = trustedNode.fingers[fIndex]
            if (this.idInCircleRange(finger, [trustedNode.id, clientId]))
                return this.getNodeById(finger)
        }
        return trustedNode
    }

    idInCircleRange(id, range) {
        let [from, to] = range
        if (from > to) return (id > from && id < 8) || (id > -1 && id < to)
        else return id > from && id < to
    }

    connectNode() {
        let freeNode = this.nodes.find((node) => !node.active)
        if (freeNode) {
            freeNode.active = true
            console.trace(`Node connected. New id: ${freeNode.id}`)
            this.updModel()
            return freeNode.id
        } else console.warn("There is no free place for a new peer")
    }

    disconnectNode(id) {
        if (id > -1 && id < this.config.amountOfNodes) {
            let node = this.nodes.find((node) => node.id == id)
            node.active = false
            node.successor = null
            node.predecessor = null
            node.fingers = []
            this.updModel()
            return
        } else console.warn(`Id (${id}) is out of range`)
    }

    fixFingers(sourceNode) {
        console.trace(`Fix fingers for node: ${sourceNode.id}`)
        let fingers = []
        let log = this.log(2, this.config.amountOfNodes)
        for (let degree = 0; degree < log; degree++) {
            for (let offset = 0; offset < this.config.amountOfNodes; offset++) {
                let fingerId = this.mod(
                    sourceNode.id + Math.pow(2, degree) + offset
                )
                if (
                    this.nodes.find(
                        (nextNode) =>
                            nextNode.id === fingerId && nextNode.active
                    )
                ) {
                    console.trace(`Confirmed finger: ${fingerId}`)
                    fingers.push(fingerId)
                    break
                }
            }
        }
        sourceNode.fingers = fingers
    }

    log(base, num) {
        return Math.log(num) / Math.log(base)
    }

    findSuccessor(sourceNode) {
        console.trace(`Find successor for node: ${sourceNode.id}`)
        for (let offset = 1; offset < this.config.amountOfNodes; offset++) {
            let successorId = this.mod(sourceNode.id + offset)
            if (
                this.nodes.find(
                    (nextNode) => nextNode.id === successorId && nextNode.active
                )
            ) {
                console.trace(`Confirmed successor: ${successorId}`)
                sourceNode.successor = successorId
                return
            }
        }
    }

    findPredecessor(sourceNode) {
        console.trace(`Find predecessor for node: ${sourceNode.id}`)
        for (let offset = 1; offset < this.nodes.length; offset++) {
            let predecessorId = this.mod(sourceNode.id - offset)
            console.trace(`Supposed predecessor: ${predecessorId}`)
            if (
                this.nodes.find(
                    (nextNode) =>
                        nextNode.id === predecessorId && nextNode.active
                )
            ) {
                console.trace(`Confirmed predecessor: ${predecessorId}`)
                sourceNode.predecessor = predecessorId
                return
            }
        }
    }

    traceRouteInterface(sourceId, destinationId) {
        console.debug(`Trace route from: ${sourceId}, to: ${destinationId}`)
        this.nodes = this.nodes.map(node => {
            delete node.next
            return node
        })
        let sourceNode = this.nodes.find((node) => node.id == sourceId)
        return this.traceRoute([sourceNode], destinationId)
    }

    traceRoute(route, destinationId) {
        console.trace("trace route:", JSON.stringify(route))
        let node = route[route.length - 1]
        if (node.id == destinationId) {
            console.info("Successful execution. Route:", JSON.stringify(route))
            return route
        }
        try {
            let nextNode = this.getFreeFinger(route, node)
            route[route.length - 1].next = nextNode.id
            route.push({ ...nextNode, next: null })
        } catch (e) {
            console.warn(e)
            return
        }
        return this.traceRoute(route, destinationId)
    }

    getFreeFinger(route, _node) {
        for (let attempt = 0; attempt < this.config.addrSize; attempt++) {
            let finger = _node.fingers[attempt]
            if (
                route.find((node) => node.id == _node.id && node.next == finger)
            )
                continue
            return this.nodes.find((node) => node.id === finger)
        }
        throw "'Trace route' exception (dead loop)"
    }

    mod(num) {
        let p = this.config.amountOfNodes
        if (num < 0) {
            num = -num
            num = p - (num % p)
        }
        return num % p
    }

    updModel() {
        console.trace(`Upd chord model`)
        for (let node of this.nodes) {
            if (!node.active) continue
            console.trace(`Upd node: ${JSON.stringify(node)}`)
            this.fixFingers(node)
            this.findPredecessor(node)
            this.findSuccessor(node)
            console.trace(`Node ${node.id} has successfully been updated`)
        }
    }
}

module.exports = ChordModel
