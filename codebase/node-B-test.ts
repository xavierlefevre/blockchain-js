import { ec } from './core/cryptography'
import { Blockchain } from './core/blockchain'
import { Node, COMMUNICATION_EVENTS } from './core/peer-to-peer'

const myPrivateKey = process.env.PRIVATE_KEY || ''
const myKeyPair = ec.keyFromPrivate(myPrivateKey, 'hex')
const myPublicKey = myKeyPair.getPublic('hex')

// --- Warning/Question ---> New peers should be discoverable
const PEERS: string[] = ['ws://localhost:3000']

const MyLocalVersionOfMugen = new Blockchain()
const MyLocalNode = new Node({
    blockchain: MyLocalVersionOfMugen,
    port: 3001, // --- Comment ---> We are faking nodes on local, but this should come from env variables
    peers: PEERS,
})
MyLocalNode.wsConnection()

setTimeout(() => {
    if (MyLocalVersionOfMugen.transactionsPool.length !== 0) {
        MyLocalVersionOfMugen.mineBlock({ rewardAddress: myPublicKey })
        MyLocalNode.sendMessage(
            MyLocalNode.buildMessage(
                COMMUNICATION_EVENTS.UPDATE_CHAIN_ON_SUCCESSFUL_MINING,
                [
                    MyLocalVersionOfMugen.getLastBlock(),
                    MyLocalVersionOfMugen.miningDifficulty,
                ]
            )
        )
    }
}, 6500)

setTimeout(() => {
    // console.log(MyLocalNode.openedConnectionsNodes)
    console.log(MyLocalVersionOfMugen)
}, 10000)
