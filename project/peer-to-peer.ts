import { Blockchain } from './blockchain'
import { Block } from './block'
import { Transaction } from './transaction'
import { SHA256 } from './cryptography'
import { MINT_PUBLIC_ADDRESS, minerPublicKey } from './wallets'

import WS from 'ws'

const Mugen = new Blockchain()

const PORT = 3001
const PEERS: string[] = ['ws://localhost:3000']
const MY_ADDRESS = 'ws://localhost:3001'
const server = new WS.Server({ port: PORT })

type OpenNode = {
    socket: WS
    address: string
}

const opened: OpenNode[] = []
const connected: string[] = []
const check: string[] = []
const checked: string[] = []
let checking: boolean = false
let tempChain = new Blockchain()

console.log('Listening on PORT', PORT)

server.on('connection', async (socket: WS) => {
    socket.on('message', (message: string) => {
        const _message = JSON.parse(message)

        console.log(_message)

        switch (_message.type) {
            case 'TYPE_REPLACE_CHAIN': {
                const [newBlock, newDiff]: [Block, number] = _message.data

                const ourTx = [
                    ...Mugen.transactionsPool.map((tx) => JSON.stringify(tx)),
                ]
                const theirTx = [
                    ...newBlock.transactionList
                        .filter(
                            (tx: Transaction) => tx.from !== MINT_PUBLIC_ADDRESS
                        )
                        .map((tx: Transaction) => JSON.stringify(tx)),
                ]
                const n = theirTx.length

                if (
                    newBlock.previousHash !== Mugen.getLastBlock().previousHash
                ) {
                    for (let i = 0; i < n; i++) {
                        const index = ourTx.indexOf(theirTx[0])

                        if (index === -1) break

                        ourTx.splice(index, 1)
                        theirTx.splice(0, 1)
                    }

                    if (
                        theirTx.length === 0 &&
                        SHA256(
                            Mugen.getLastBlock().hash +
                                newBlock.timestamp +
                                JSON.stringify(newBlock.transactionList) +
                                newBlock.nonce
                        ) === newBlock.hash &&
                        newBlock.hash.startsWith(
                            '000' +
                                Array(
                                    Math.round(
                                        Math.log(Mugen.miningDifficulty) /
                                            Math.log(16) +
                                            1
                                    )
                                ).join('0')
                        ) &&
                        Block.hasValidTransactions(newBlock, Mugen) &&
                        (parseInt(newBlock.timestamp) >
                            parseInt(Mugen.getLastBlock().timestamp) ||
                            Mugen.getLastBlock().timestamp === '') &&
                        parseInt(newBlock.timestamp) < Date.now() &&
                        Mugen.getLastBlock().hash === newBlock.previousHash &&
                        (newDiff + 1 === Mugen.miningDifficulty ||
                            newDiff - 1 === Mugen.miningDifficulty)
                    ) {
                        Mugen.chain.push(newBlock)
                        Mugen.miningDifficulty = newDiff
                        Mugen.transactionsPool = [
                            ...ourTx.map((tx) => JSON.parse(tx)),
                        ]
                    }
                } else if (
                    !checked.includes(
                        JSON.stringify([
                            newBlock.previousHash,
                            Mugen.chain[Mugen.chain.length - 2].timestamp || '',
                        ])
                    )
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
                        produceMessage('TYPE_REQUEST_CHECK', MY_ADDRESS)
                    )

                    setTimeout(() => {
                        checking = false

                        let mostAppeared = check[0]

                        check.forEach((group) => {
                            if (
                                check.filter((_group) => _group === group)
                                    .length >
                                check.filter(
                                    (_group) => _group === mostAppeared
                                ).length
                            ) {
                                mostAppeared = group
                            }
                        })

                        const group = JSON.parse(mostAppeared)

                        Mugen.chain[position] = group[0]
                        Mugen.transactionsPool = [...group[1]]
                        Mugen.miningDifficulty = group[2]

                        check.splice(0, check.length)
                    }, 5000)
                }

                break
            }

            case 'TYPE_REQUEST_CHECK':
                opened
                    .filter((node) => node.address === _message.data)[0]
                    .socket.send(
                        JSON.stringify(
                            produceMessage(
                                'TYPE_SEND_CHECK',
                                JSON.stringify([
                                    Mugen.getLastBlock(),
                                    Mugen.transactionsPool,
                                    Mugen.miningDifficulty,
                                ])
                            )
                        )
                    )

                break

            case 'TYPE_SEND_CHECK':
                if (checking) check.push(_message.data)
                break

            case 'TYPE_CREATE_TRANSACTION': {
                const transaction: Transaction = _message.data
                Mugen.addTransaction({ transaction })
                break
            }

            case 'TYPE_SEND_CHAIN': {
                const { block, finished } = _message.data

                if (!finished) {
                    tempChain.chain.push(block)
                } else {
                    tempChain.chain.push(block)
                    if (Blockchain.isValid(tempChain)) {
                        Mugen.chain = tempChain.chain
                    }
                    tempChain = new Blockchain()
                }

                break
            }

            case 'TYPE_REQUEST_CHAIN': {
                const socket = opened.filter(
                    (node) => node.address === _message.data
                )[0].socket

                for (let i = 1; i < Mugen.chain.length; i++) {
                    socket.send(
                        JSON.stringify(
                            produceMessage('TYPE_SEND_CHAIN', {
                                block: Mugen.chain[i],
                                finished: i === Mugen.chain.length - 1,
                            })
                        )
                    )
                }

                break
            }

            case 'TYPE_REQUEST_INFO':
                opened
                    .filter((node) => node.address === _message.data)[0]
                    .socket.send(
                        JSON.stringify(
                            produceMessage('TYPE_SEND_INFO', [
                                Mugen.miningDifficulty,
                                Mugen.transactionsPool,
                            ])
                        )
                    )

                break

            case 'TYPE_SEND_INFO':
                ;[Mugen.miningDifficulty, Mugen.transactionsPool] =
                    _message.data

                break

            case 'TYPE_HANDSHAKE': {
                const nodes: string[] = _message.data
                nodes.forEach((node) => connect(node))
                break
            }
        }
    })
})

async function connect(address: string): Promise<void> {
    if (
        !connected.find((peerAddress) => peerAddress === address) &&
        address !== MY_ADDRESS
    ) {
        const socket = new WS(address)

        socket.on('open', () => {
            socket.send(
                JSON.stringify(
                    produceMessage('TYPE_HANDSHAKE', [MY_ADDRESS, ...connected])
                )
            )

            opened.forEach((node) =>
                node.socket.send(
                    JSON.stringify(produceMessage('TYPE_HANDSHAKE', [address]))
                )
            )

            if (
                !opened.find((peer) => peer.address === address) &&
                address !== MY_ADDRESS
            ) {
                opened.push({ socket, address })
            }

            if (
                !connected.find((peerAddress) => peerAddress === address) &&
                address !== MY_ADDRESS
            ) {
                connected.push(address)
            }
        })

        socket.on('close', () => {
            opened.splice(connected.indexOf(address), 1)
            connected.splice(connected.indexOf(address), 1)
        })
    }
}

function produceMessage(
    type: string,
    data:
        | string
        | string[]
        | (number | Block)[]
        | (number | Transaction[])[]
        | { block: Block; finished: boolean }
) {
    return { type, data }
}

function sendMessage(message: {
    type: string
    data:
        | string
        | string[]
        | (number | Block)[]
        | (number | Transaction[])[]
        | { block: Block; finished: boolean }
}): void {
    opened.forEach((node) => {
        node.socket.send(JSON.stringify(message))
    })
}

process.on('uncaughtException', (err: Error) => console.log(err))

PEERS.forEach((peer) => connect(peer))

setTimeout(() => {
    if (Mugen.transactionsPool.length !== 0) {
        Mugen.mineBlock({ rewardAddress: minerPublicKey })

        sendMessage(
            produceMessage('TYPE_REPLACE_CHAIN', [
                Mugen.getLastBlock(),
                Mugen.miningDifficulty,
            ])
        )
    }
}, 6500)

setTimeout(() => {
    console.log(opened)
    console.log(Mugen)
}, 10000)
