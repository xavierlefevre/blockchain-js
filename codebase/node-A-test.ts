import { ec } from './core/cryptography'
import { Transaction } from './core/transaction'
import { Blockchain } from './core/blockchain'
import { Node, COMMUNICATION_EVENTS } from './core/peer-to-peer'

const myPrivateKey = process.env.PRIVATE_KEY || ''
const myKeyPair = ec.keyFromPrivate(myPrivateKey, 'hex')
const myPublicKey = myKeyPair.getPublic('hex')

const sendMoneyTo =
    '046856ec283a5ecbd040cd71383a5e6f6ed90ed2d7e8e599dbb5891c13dff26f2941229d9b7301edf19c5aec052177fac4231bb2515cb59b1b34aea5c06acdef43'

// --- Warning/Question ---> New peers should be discoverable
const PEERS: string[] = []

const MyLocalVersionOfMugen = new Blockchain()
const MyLocalNode = new Node({
    blockchain: MyLocalVersionOfMugen,
    port: 3000, // --- Comment ---> We are faking nodes on local, but this should come from env variables
    peers: PEERS,
})
MyLocalNode.wsConnection()

setTimeout(() => {
    const transaction = new Transaction({
        from: myPublicKey,
        to: sendMoneyTo,
        amount: 200,
        gas: 10,
    })

    transaction.sign({ keyPair: myKeyPair })

    MyLocalNode.sendMessage(
        MyLocalNode.buildMessage(
            COMMUNICATION_EVENTS.CREATE_TRANSACTION,
            transaction
        )
    )

    MyLocalVersionOfMugen.addTransaction({ transaction })
}, 5000)

setTimeout(() => {
    // console.log(MyLocalNode.openedConnectionsNodes)
    console.log(MyLocalVersionOfMugen)
}, 10000)
