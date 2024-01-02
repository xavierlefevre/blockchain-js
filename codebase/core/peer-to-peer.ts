import { Blockchain } from './blockchain'
import { Block } from './block'
import { Transaction } from './transaction'
import { MINT_PUBLIC_ADDRESS } from './wallets'

import WS from 'ws'

const Mugen = new Blockchain()

// In the original repository, there are 2 files, for each node, to run in each of their separate windows!
// TO DO!!
const PORT = 3001
const PEERS: string[] = ['ws://localhost:3000']
const MY_NODE_ADDRESS = `ws://localhost:${PORT}`
const server = new WS.Server({ port: PORT }) // Creating 1 local websocket server

type OpenNode = {
    socket: WS
    address: string
}

const openedConnectionsNodes: OpenNode[] = [] // Redundancy between those two tables, we could simplify
const connectedNodes: string[] = []
let check: string[] = []
const checked: string[] = []
let checking: boolean = false
let temporaryChainInRetrieval = new Blockchain()

console.log('Listening on PORT', PORT)

server.on('connection', async (socket: WS) => {
    socket.on('message', (message: string) => {
        const _message = JSON.parse(message)

        console.log(_message)

        switch (_message.type) {
            case 'HANDSHAKE': {
                const nodes: string[] = _message.data
                nodes.forEach((node) => connect(node))
                break
            }

            case 'UPDATE_CHAIN_ON_SUCCESSFUL_MINING': {
                updateChainOnSuccessfulMining(_message)
                break
            }

            case 'REQUEST_LATEST_CHAIN_INFO_TO_HANDLE_CONFLICT': // Send my latest chain info to the node requesting it
                openedConnectionsNodes
                    .filter((node) => node.address === _message.data)[0] // Just sending to the requester
                    .socket.send(
                        JSON.stringify(
                            buildMessage(
                                'SEND_AND_RECEIVE_LATEST_CHAIN_INFO_TO_HANDLE_CONFLICT',
                                JSON.stringify([
                                    Mugen.getLastBlock(),
                                    Mugen.transactionsPool,
                                    Mugen.miningDifficulty,
                                ])
                            )
                        )
                    )

                break

            case 'SEND_AND_RECEIVE_LATEST_CHAIN_INFO_TO_HANDLE_CONFLICT':
                if (checking) check.push(_message.data)
                break

            case 'CREATE_TRANSACTION': {
                // One node sends a new transaction to add to all nodes pools
                const transaction: Transaction = _message.data
                Mugen.addTransaction({ transaction })
                break
            }

            case 'REQUEST_ENTIRE_CHAIN': {
                // Useful for all new nodes, to catch-up the whole chain
                const socket = openedConnectionsNodes.filter(
                    (node) => node.address === _message.data
                )[0].socket // Retrieves only the socket info of the requester

                for (let i = 1; i < Mugen.chain.length; i++) {
                    socket.send(
                        JSON.stringify(
                            buildMessage('SEND_ENTIRE_CHAIN_BLOCK_BY_BLOCK', {
                                block: Mugen.chain[i],
                                isLastBlockOfTheChain:
                                    i === Mugen.chain.length - 1,
                            })
                        )
                    )
                }

                break
            }

            case 'SEND_ENTIRE_CHAIN_BLOCK_BY_BLOCK': {
                const { block, isLastBlockOfTheChain } = _message.data

                temporaryChainInRetrieval.chain.push(block)
                if (isLastBlockOfTheChain) {
                    if (Blockchain.isValid(temporaryChainInRetrieval)) {
                        Mugen.chain = temporaryChainInRetrieval.chain
                    }
                    temporaryChainInRetrieval = new Blockchain()
                }

                break
            }
        }
    })
})

async function connect(address: string) {
    if (
        !connectedNodes.find((peerAddress) => peerAddress === address) &&
        address !== MY_NODE_ADDRESS
    ) {
        const socket = new WS(address)

        socket.on('open', () => {
            socket.send(
                JSON.stringify(
                    buildMessage('HANDSHAKE', [
                        MY_NODE_ADDRESS,
                        ...connectedNodes,
                    ])
                )
            )

            openedConnectionsNodes.forEach((node) =>
                node.socket.send(
                    JSON.stringify(buildMessage('HANDSHAKE', [address]))
                )
            )

            if (
                !openedConnectionsNodes.find(
                    (peer) => peer.address === address
                ) &&
                address !== MY_NODE_ADDRESS
            ) {
                openedConnectionsNodes.push({ socket, address })
            }

            if (
                !connectedNodes.find(
                    (peerAddress) => peerAddress === address
                ) &&
                address !== MY_NODE_ADDRESS
            ) {
                connectedNodes.push(address)
            }
        })

        socket.on('close', () => {
            openedConnectionsNodes.splice(connectedNodes.indexOf(address), 1)
            connectedNodes.splice(connectedNodes.indexOf(address), 1)
        })
    }
}

type messageData =
    | string
    | string[]
    | (number | Block)[]
    | (number | Transaction[])[]
    | { block: Block; isLastBlockOfTheChain: boolean }

function buildMessage(type: string, data: messageData) {
    return { type, data }
}
function sendMessage(message: { type: string; data: messageData }) {
    openedConnectionsNodes.forEach((node) => {
        node.socket.send(JSON.stringify(message))
    })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function updateChainOnSuccessfulMining(message: any) {
    const [newBlock, newDifficulty]: [Block, number] = message.data

    // Turning all the transactions I have in my pool in a comparable string
    const ourTransactions = [
        ...Mugen.transactionsPool.map((transaction) =>
            JSON.stringify(transaction)
        ),
    ]
    // Then doing the same with the transactions engraved in this new block
    // also removing the mining reward transactions because they never enter the pool
    const theirTransactions = [
        ...newBlock.transactionList
            .filter(
                (transaction: Transaction) =>
                    transaction.from !== MINT_PUBLIC_ADDRESS
            )
            .map((transaction: Transaction) => JSON.stringify(transaction)),
    ]

    // Basic check to confirm that the new block received doesn't have the same parent
    // as the latest block on my copy of the chain
    // --- Warning/Question ---> There is a (slim) chance the chain successfuly
    // added x blocks in the meantime, not just 1
    if (newBlock.previousHash !== Mugen.getLastBlock().previousHash) {
        synchronisePools(ourTransactions, theirTransactions)

        if (
            theirTransactions.length === 0 && // To ensure that their transactions were all in our pool initially
            Block.computeHash({
                previousHash: Mugen.getLastBlock().hash,
                timestamp: newBlock.timestamp,
                transactionList: newBlock.transactionList,
                nonce: newBlock.nonce,
            }) === newBlock.hash && // This check and the below are important, they check that the nonce indeed...
            Block.hasExpectedLeadingZeros(
                newBlock.hash,
                Mugen.miningDifficulty
            ) && // ...led to the proper leading zeros hash matching the difficulty
            Block.hasValidTransactions(newBlock, Mugen) &&
            Block.hasValidTimestamp(
                newBlock.timestamp,
                Mugen.getLastBlock().timestamp
            ) &&
            Mugen.getLastBlock().hash === newBlock.previousHash &&
            Block.hasValidDifficulty(newDifficulty, Mugen.miningDifficulty) // --- Warning/Question ---> Again here, we assume no so many blocks were mined in-between
        ) {
            Mugen.chain.push(newBlock)
            Mugen.miningDifficulty = newDifficulty
            Mugen.transactionsPool = [
                // --- Comment ---> With JavaScript running on only 1 thread, this seems safe, as new events like transaction requests are in the event loop
                ...ourTransactions.map((transaction) =>
                    JSON.parse(transaction)
                ),
            ]
        }
    } else if (
        !checked.includes(
            JSON.stringify([
                newBlock.previousHash,
                Mugen.chain[Mugen.chain.length - 2].timestamp || '',
            ])
        ) // Verifies that this check was not already done, or ongoing --- Note ---> Checked could be flushed after some time
    ) {
        checked.push(
            JSON.stringify([
                Mugen.getLastBlock().previousHash,
                Mugen.chain[Mugen.chain.length - 2].timestamp || '',
            ])
        )

        const position = Mugen.chain.length - 1

        checking = true

        sendMessage(
            buildMessage(
                'REQUEST_LATEST_CHAIN_INFO_TO_HANDLE_CONFLICT',
                MY_NODE_ADDRESS
            )
        ) // Asking for the other blocks to send their latest block

        setTimeout(() => {
            // We wait a few seconds to get all nodes to send their
            checking = false

            let mostAppeared = check[0] // This line and the below forEach find the block with the most occurences across all answering nodes
            check.forEach((group) => {
                if (
                    check.filter((_group) => _group === group).length >
                    check.filter((_group) => _group === mostAppeared).length
                ) {
                    mostAppeared = group
                }
            })

            const [
                majorityLatestBlock,
                majorityTransactionsPool,
                majorityMiningDifficulty,
            ] = JSON.parse(mostAppeared)

            Mugen.chain[position] = majorityLatestBlock
            Mugen.transactionsPool = [...majorityTransactionsPool]
            Mugen.miningDifficulty = majorityMiningDifficulty

            check = []
        }, 5000) // --- Warning ---> 5 seconds is arbitrary, we don't really ensure that the majority from the replies is representative
    }
}

function synchronisePools(
    ourTransactions: string[],
    theirTransactions: string[]
) {
    for (let i = 0; i < theirTransactions.length; i++) {
        // Checking one by one each of their transactions, so that we
        // can remove them from our transaction pool
        // Is it assumed here that all nodes have the same image of the transaction pool
        // --- Warning/Question ---> Because of communication/propagation delay, there is a possibility
        // the pools were not in complete syncronisation, which would break out from this loop, stop the pool
        // synchronisation, instead of adding the missing transaction to our pool, and continuing
        const index = ourTransactions.indexOf(theirTransactions[0])

        if (index === -1) break

        ourTransactions.splice(index, 1) // Remove 1 element of the array at the position equal to the index
        theirTransactions.splice(0, 1) // Remove first element of the array
    }
}

// --- TEST ---

// Connexion
process.on('uncaughtException', (err: Error) => console.log(err))

PEERS.forEach((peer) => connect(peer))

// // First node "operations"
// setTimeout(() => {
//     const transaction = new Transaction(
//         publicKey,
//         '046856ec283a5ecbd040cd71383a5e6f6ed90ed2d7e8e599dbb5891c13dff26f2941229d9b7301edf19c5aec052177fac4231bb2515cb59b1b34aea5c06acdef43',
//         200,
//         10
//     )

//     transaction.sign(keyPair)

//     sendMessage(buildMessage('CREATE_TRANSACTION', transaction))

//     Mugen.addTransaction(transaction)
// }, 5000)

// setTimeout(() => {
//     console.log(openedConnectionsNodes)
//     console.log(Mugen)
// }, 10000)

// // Second node "operations"
// setTimeout(() => {
//     if (Mugen.transactionsPool.length !== 0) {
//         Mugen.mineBlock({ rewardAddress: minerPublicKey })

//         sendMessage(
//             buildMessage('UPDATE_CHAIN_ON_SUCCESSFUL_MINING', [
//                 Mugen.getLastBlock(),
//                 Mugen.miningDifficulty,
//             ])
//         )
//     }
// }, 6500)

// setTimeout(() => {
//     console.log(openedConnectionsNodes)
//     console.log(Mugen)
// }, 10000)
