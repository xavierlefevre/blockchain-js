import { ec } from './core/cryptography'
import { Blockchain } from './core/blockchain'
import { Node, COMMUNICATION_EVENTS } from './core/peer-to-peer'

// --- Warning ---> My private key should be hidden and protected
const myPrivateKey =
    '39a4a81e8e631a0c51716134328ed944501589b447f1543d9279bacc7f3e3de7'
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
