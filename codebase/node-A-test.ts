import { ec } from './core/cryptography'
import { Transaction } from './core/transaction'
import { Blockchain } from './core/blockchain'
import { Node } from './core/peer-to-peer'

const privateKey =
    '62d101759086c306848a0c1020922a78e8402e1330981afe9404d0ecc0a4be3d'
const keyPair = ec.keyFromPrivate(privateKey, 'hex')
const publicKey = keyPair.getPublic('hex')

const MugenInstance = new Blockchain()
const NodeInstance = new Node({
    blockchain: MugenInstance,
    port: 3000,
    peers: [],
})
NodeInstance.wsConnection()

process.on('uncaughtException', (err) => console.log(err))

setTimeout(() => {
    const transaction = new Transaction({
        from: publicKey,
        to: '046856ec283a5ecbd040cd71383a5e6f6ed90ed2d7e8e599dbb5891c13dff26f2941229d9b7301edf19c5aec052177fac4231bb2515cb59b1b34aea5c06acdef43',
        amount: 200,
        gas: 10,
    })

    transaction.sign({ keyPair })

    NodeInstance.sendMessage(
        NodeInstance.buildMessage('CREATE_TRANSACTION', transaction)
    )

    MugenInstance.addTransaction({ transaction })
}, 5000)

setTimeout(() => {
    // console.log(NodeInstance.openedConnectionsNodes)
    console.log(MugenInstance)
}, 10000)
