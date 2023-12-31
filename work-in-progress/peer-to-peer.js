// The real new code
const WS = require('ws')

const PORT = process.env.PORT || 3000
const PEERS = process.env.PEERS ? process.env.PEERS.split(',') : []
const MY_ADDRESS = process.env.MY_ADDRESS || 'ws://localhost:3000'
const server = new WS.Server({ port: PORT })

console.log('Listening on PORT', PORT)

// I will add this one line for error handling:
process.on('uncaughtException', (err) => console.log(err))

function produceMessage(type, data) {
    return { type, data }
}

// THE CONNECTION LISTENER
server.on('connection', async (socket, req) => {
    // Listens for messages
    socket.on('message', (message) => {
        // Parse the message from a JSON into an object
        const _message = JSON.parse(message)

        switch (_message.type) {
            case 'TYPE_HANDSHAKE':
                const nodes = _message.data

                nodes.forEach((node) => connect(node))

            // We will need to handle more types of messages in the future, so I have used a switch-case.
        }
    })
})

let opened = [],
    connected = []
// I will use "opened" for holding both sockets and addresses, "connected" is for addresses only.

async function connect(address) {
    // We will only connect to the node if we haven't, and we should not be able to connect to ourself
    if (
        !connected.find((peerAddress) => peerAddress === address) &&
        address !== MY_ADDRESS
    ) {
        const socket = new WS(address)

        socket.on('open', () => {
            // I will use the spread operator to include our connected nodes' addresses into the message's body and send it.
            socket.send(
                JSON.stringify(
                    produceMessage('TYPE_HANDSHAKE', [MY_ADDRESS, ...connected])
                )
            )

            // We should give other nodes' this one's address and ask them to connect.
            opened.forEach((node) =>
                node.socket.send(
                    JSON.stringify(produceMessage('TYPE_HANDSHAKE', [address]))
                )
            )

            // If "opened" already contained the address, we will not push.
            if (
                !opened.find((peer) => peer.address === address) &&
                address !== MY_ADDRESS
            ) {
                opened.push({ socket, address })
            }

            // If "connected" already contained the address, we will not push.
            if (
                !connected.find((peerAddress) => peerAddress === address) &&
                address !== MY_ADDRESS
            ) {
                connected.push(address)
            }

            // Two upper if statements exist because of the problem of asynchronous codes. Since they are running
            // concurrently, the first if statement can be passed easily, so there will be duplications.
        })

        // When they disconnect, we must remove them from our connected list.
        socket.on('close', () => {
            opened.splice(connected.indexOf(address), 1)
            connected.splice(connected.indexOf(address), 1)
        })
    }
}
