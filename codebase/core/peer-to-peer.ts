import { Blockchain } from './blockchain'
import { Block } from './block'
import { Transaction } from './transaction'
import { MINT_PUBLIC_ADDRESS } from './wallets'

import WS from 'ws'

type OpenNode = {
    socket: WS
    address: string
}

type messageData =
    | string
    | string[]
    | (number | Block)[]
    | (number | Transaction)[]
    | Transaction
    | { block: Block; isLastBlockOfTheChain: boolean }

export const COMMUNICATION_EVENTS = {
    HANDSHAKE: 'HANDSHAKE',
    UPDATE_CHAIN_ON_SUCCESSFUL_MINING: 'UPDATE_CHAIN_ON_SUCCESSFUL_MINING',
    REQUEST_LATEST_CHAIN_INFO_TO_HANDLE_CONFLICT:
        'REQUEST_LATEST_CHAIN_INFO_TO_HANDLE_CONFLICT',
    SEND_AND_RECEIVE_LATEST_CHAIN_INFO_TO_HANDLE_CONFLICT:
        'SEND_AND_RECEIVE_LATEST_CHAIN_INFO_TO_HANDLE_CONFLICT',
    CREATE_TRANSACTION: 'CREATE_TRANSACTION',
    REQUEST_ENTIRE_CHAIN: 'REQUEST_ENTIRE_CHAIN',
    SEND_ENTIRE_CHAIN_BLOCK_BY_BLOCK: 'SEND_ENTIRE_CHAIN_BLOCK_BY_BLOCK',
} as const

export class Node {
    public port: number
    public peers: string[]
    public myInstanceOfMugenChain: Blockchain
    public openedConnectionsNodes: OpenNode[] // Redundancy between this table and the below, we could simplify
    public connectedNodes: string[]
    public check: string[]
    public checked: string[]
    public checking: boolean
    public temporaryChainInRetrieval: Blockchain

    constructor({
        blockchain,
        port,
        peers,
    }: {
        blockchain: Blockchain
        port: number
        peers: string[]
    }) {
        this.port = port
        this.peers = peers
        this.myInstanceOfMugenChain = blockchain
        this.openedConnectionsNodes = []
        this.connectedNodes = []
        this.check = []
        this.checked = []
        this.checking = false
        this.temporaryChainInRetrieval = new Blockchain()
    }

    public wsConnection() {
        const MY_NODE_ADDRESS = `ws://localhost:${this.port}`
        const server = new WS.Server({ port: this.port }) // Creating 1 local websocket server

        server.on('connection', async (socket: WS) => {
            socket.on('message', (message: string) => {
                const _message: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    data: any
                    type: keyof typeof COMMUNICATION_EVENTS
                } = JSON.parse(message)

                console.log(`LOG - Message Received: ${_message.type}`)

                switch (_message.type) {
                    case COMMUNICATION_EVENTS.HANDSHAKE: {
                        const nodes: string[] = _message.data
                        nodes.forEach((node) => connect(this, node))
                        break
                    }

                    case COMMUNICATION_EVENTS.UPDATE_CHAIN_ON_SUCCESSFUL_MINING: {
                        updateChainOnSuccessfulMining(_message)
                        break
                    }

                    case COMMUNICATION_EVENTS.REQUEST_LATEST_CHAIN_INFO_TO_HANDLE_CONFLICT: // Send my latest chain info to the node requesting it
                        this.openedConnectionsNodes
                            .filter((node) => node.address === _message.data)[0] // Just sending to the requester
                            .socket.send(
                                JSON.stringify(
                                    this.buildMessage(
                                        COMMUNICATION_EVENTS.SEND_AND_RECEIVE_LATEST_CHAIN_INFO_TO_HANDLE_CONFLICT,
                                        JSON.stringify([
                                            this.myInstanceOfMugenChain.getLastBlock(),
                                            this.myInstanceOfMugenChain
                                                .transactionsPool,
                                            this.myInstanceOfMugenChain
                                                .miningDifficulty,
                                        ])
                                    )
                                )
                            )

                        break

                    case COMMUNICATION_EVENTS.SEND_AND_RECEIVE_LATEST_CHAIN_INFO_TO_HANDLE_CONFLICT:
                        if (this.checking) this.check.push(_message.data)
                        break

                    case COMMUNICATION_EVENTS.CREATE_TRANSACTION: {
                        // One node sends a new transaction to add to all nodes pools
                        const transaction: Transaction = _message.data
                        this.myInstanceOfMugenChain.addTransaction({
                            transaction,
                        })
                        break
                    }

                    case COMMUNICATION_EVENTS.REQUEST_ENTIRE_CHAIN: {
                        // Useful for all new nodes, to catch-up the whole chain
                        const socket = this.openedConnectionsNodes.filter(
                            (node) => node.address === _message.data
                        )[0].socket // Retrieves only the socket info of the requester

                        for (
                            let i = 1;
                            i < this.myInstanceOfMugenChain.chain.length;
                            i++
                        ) {
                            socket.send(
                                JSON.stringify(
                                    this.buildMessage(
                                        COMMUNICATION_EVENTS.SEND_ENTIRE_CHAIN_BLOCK_BY_BLOCK,
                                        {
                                            block: this.myInstanceOfMugenChain
                                                .chain[i],
                                            isLastBlockOfTheChain:
                                                i ===
                                                this.myInstanceOfMugenChain
                                                    .chain.length -
                                                    1,
                                        }
                                    )
                                )
                            )
                        }

                        break
                    }

                    case COMMUNICATION_EVENTS.SEND_ENTIRE_CHAIN_BLOCK_BY_BLOCK: {
                        const { block, isLastBlockOfTheChain } = _message.data

                        this.temporaryChainInRetrieval.chain.push(block)
                        if (isLastBlockOfTheChain) {
                            if (
                                Blockchain.isValid(
                                    this.temporaryChainInRetrieval
                                )
                            ) {
                                this.myInstanceOfMugenChain.chain =
                                    this.temporaryChainInRetrieval.chain
                            }
                            this.temporaryChainInRetrieval = new Blockchain()
                        }

                        break
                    }
                }
            })
        })

        async function connect(nodeInstance: Node, address: string) {
            if (
                !nodeInstance.connectedNodes.find(
                    (peerAddress) => peerAddress === address
                ) &&
                address !== MY_NODE_ADDRESS
            ) {
                const socket = new WS(address)

                socket.on('open', () => {
                    socket.send(
                        JSON.stringify(
                            nodeInstance.buildMessage(
                                COMMUNICATION_EVENTS.HANDSHAKE,
                                [
                                    MY_NODE_ADDRESS,
                                    ...nodeInstance.connectedNodes,
                                ]
                            )
                        )
                    )

                    nodeInstance.openedConnectionsNodes.forEach((node) =>
                        node.socket.send(
                            JSON.stringify(
                                nodeInstance.buildMessage(
                                    COMMUNICATION_EVENTS.HANDSHAKE,
                                    [address]
                                )
                            )
                        )
                    )

                    if (
                        !nodeInstance.openedConnectionsNodes.find(
                            (peer) => peer.address === address
                        ) &&
                        address !== MY_NODE_ADDRESS
                    ) {
                        nodeInstance.openedConnectionsNodes.push({
                            socket,
                            address,
                        })
                    }

                    if (
                        !nodeInstance.connectedNodes.find(
                            (peerAddress) => peerAddress === address
                        ) &&
                        address !== MY_NODE_ADDRESS
                    ) {
                        nodeInstance.connectedNodes.push(address)
                    }
                })

                socket.on('close', () => {
                    nodeInstance.openedConnectionsNodes.splice(
                        nodeInstance.connectedNodes.indexOf(address),
                        1
                    )
                    nodeInstance.connectedNodes.splice(
                        nodeInstance.connectedNodes.indexOf(address),
                        1
                    )
                })
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateChainOnSuccessfulMining = (message: any) => {
            const [newBlock, newDifficulty]: [Block, number] = message.data

            // Turning all the transactions I have in my pool in a comparable string
            const ourTransactions = [
                ...this.myInstanceOfMugenChain.transactionsPool.map(
                    (transaction) => JSON.stringify(transaction)
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
                    .map((transaction: Transaction) =>
                        JSON.stringify(transaction)
                    ),
            ]

            // Basic check to confirm that the new block received doesn't have the same parent
            // as the latest block on my copy of the chain
            // --- Warning/Question ---> There is a (slim) chance the chain successfuly
            // added x blocks in the meantime, not just 1
            if (
                newBlock.previousHash !==
                this.myInstanceOfMugenChain.getLastBlock().previousHash
            ) {
                this.synchronisePools(ourTransactions, theirTransactions)
                if (
                    theirTransactions.length === 0 && // To ensure that their transactions were all in our pool initially
                    Block.computeHash({
                        previousHash:
                            this.myInstanceOfMugenChain.getLastBlock().hash,
                        timestamp: newBlock.timestamp,
                        transactionList: newBlock.transactionList,
                        nonce: newBlock.nonce,
                    }) === newBlock.hash && // This check and the below are important, they check that the nonce indeed...
                    Block.hasExpectedLeadingZeros(
                        newBlock.hash,
                        this.myInstanceOfMugenChain.miningDifficulty
                    ) && // ...led to the proper leading zeros hash matching the difficulty
                    Block.hasValidTransactions(
                        newBlock,
                        this.myInstanceOfMugenChain
                    ) &&
                    Block.hasValidTimestamp(
                        newBlock.timestamp,
                        this.myInstanceOfMugenChain.getLastBlock().timestamp
                    ) &&
                    this.myInstanceOfMugenChain.getLastBlock().hash ===
                        newBlock.previousHash &&
                    Block.hasValidDifficulty(
                        newDifficulty,
                        this.myInstanceOfMugenChain.miningDifficulty
                    ) // --- Warning/Question ---> Again here, we assume not so many blocks were mined in-between
                ) {
                    this.myInstanceOfMugenChain.chain.push(newBlock)
                    this.myInstanceOfMugenChain.miningDifficulty = newDifficulty
                    this.myInstanceOfMugenChain.transactionsPool = [
                        // --- Comment ---> With JavaScript running on only 1 thread, this seems safe, as new events like transaction requests are in the event loop
                        ...ourTransactions.map((transaction) =>
                            JSON.parse(transaction)
                        ),
                    ]
                }
            } else if (
                !this.checked.includes(
                    JSON.stringify([
                        newBlock.previousHash,
                        this.myInstanceOfMugenChain.chain[
                            this.myInstanceOfMugenChain.chain.length - 2
                        ].timestamp || '',
                    ])
                ) // Verifies that this check was not already done, or ongoing
                // --- Note ---> Checked could be flushed after some time
            ) {
                this.checked.push(
                    JSON.stringify([
                        this.myInstanceOfMugenChain.getLastBlock().previousHash,
                        this.myInstanceOfMugenChain.chain[
                            this.myInstanceOfMugenChain.chain.length - 2
                        ].timestamp || '',
                    ])
                )

                const position = this.myInstanceOfMugenChain.chain.length - 1

                this.checking = true

                this.sendMessage(
                    this.buildMessage(
                        COMMUNICATION_EVENTS.REQUEST_LATEST_CHAIN_INFO_TO_HANDLE_CONFLICT,
                        MY_NODE_ADDRESS
                    )
                ) // Asking for the other blocks to send their latest block

                setTimeout(() => {
                    // We wait a few seconds to get all nodes to send their
                    this.checking = false

                    let mostAppeared = this.check[0] // This line and the below forEach find the block with the most occurences across all answering nodes
                    this.check.forEach((group) => {
                        if (
                            this.check.filter((_group) => _group === group)
                                .length >
                            this.check.filter(
                                (_group) => _group === mostAppeared
                            ).length
                        ) {
                            mostAppeared = group
                        }
                    })

                    const [
                        majorityLatestBlock,
                        majorityTransactionsPool,
                        majorityMiningDifficulty,
                    ] = JSON.parse(mostAppeared)

                    this.myInstanceOfMugenChain.chain[position] =
                        majorityLatestBlock
                    this.myInstanceOfMugenChain.transactionsPool = [
                        ...majorityTransactionsPool,
                    ]
                    this.myInstanceOfMugenChain.miningDifficulty =
                        majorityMiningDifficulty

                    this.check = []
                }, 5000) // --- Warning ---> 5 seconds is arbitrary, we don't really ensure
                // that the majority from the replies is representative
            }
        }

        this.peers.forEach((peer) => connect(this, peer))
    }

    public buildMessage(type: string, data: messageData) {
        return { type, data }
    }
    public sendMessage = (message: { type: string; data: messageData }) => {
        console.log(`LOG - Message Sent: ${message.type}`)
        this.openedConnectionsNodes.forEach((node) => {
            node.socket.send(JSON.stringify(message))
        })
    }

    public synchronisePools(
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
}
