import { ec } from './core/cryptography'
import { Blockchain } from './core/blockchain'
import { Node, COMMUNICATION_EVENTS } from './core/peer-to-peer'

const privateKey =
    '39a4a81e8e631a0c51716134328ed944501589b447f1543d9279bacc7f3e3de7'
const keyPair = ec.keyFromPrivate(privateKey, 'hex')
const publicKey = keyPair.getPublic('hex')

const PEERS: string[] = ['ws://localhost:3000']

const MugenInstance = new Blockchain()
const NodeInstance = new Node({
    blockchain: MugenInstance,
    port: 3001,
    peers: PEERS,
})
NodeInstance.wsConnection()

process.on('uncaughtException', (err) => console.log(err))

setTimeout(() => {
    if (MugenInstance.transactionsPool.length !== 0) {
        MugenInstance.mineBlock({ rewardAddress: publicKey })
        NodeInstance.sendMessage(
            NodeInstance.buildMessage(
                COMMUNICATION_EVENTS.UPDATE_CHAIN_ON_SUCCESSFUL_MINING,
                [MugenInstance.getLastBlock(), MugenInstance.miningDifficulty]
            )
        )
    }
}, 6500)

setTimeout(() => {
    // console.log(NodeInstance.openedConnectionsNodes)
    console.log(MugenInstance)
}, 10000)
