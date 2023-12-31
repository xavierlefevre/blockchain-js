const crypto = require('crypto')

const SHA256 = (message) =>
    crypto.createHash('sha256').update(message).digest('hex')

const log16 = (n) => Math.log(n) / Math.log(16)

const EC = require('elliptic').ec
const ec = new EC('secp256k1')

const keyPair = ec.genKeyPair()

const MINT_KEY_PAIR = ec.genKeyPair()
const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic('hex')

const holderKeyPair = ec.genKeyPair()

class Block {
    constructor(timestamp = '', data = []) {
        this.timestamp = timestamp
        this.data = data
        this.hash = this.getHash()
        this.prevHash = ''
        this.nonce = 0
    }

    getHash() {
        return SHA256(
            this.prevHash +
                this.timestamp +
                JSON.stringify(this.data) +
                this.nonce
        )
    }

    mine(difficulty) {
        while (
            !this.hash.startsWith(
                '000' + Array(Math.round(log16(difficulty)) + 1).join('0')
            )
        ) {
            this.nonce++
            this.hash = this.getHash()
        }
    }

    hasValidTransactions(chain) {
        return this.data.every((transaction) =>
            transaction.isValid(transaction, chain)
        )
    }
}

class Transaction {
    constructor(from, to, amount) {
        this.from = from
        this.to = to
        this.amount = amount
    }

    sign(keyPair) {
        // Check if the public key matches the "from" address of the transaction
        if (keyPair.getPublic('hex') === this.from) {
            // Sign the transaction
            this.signature = keyPair
                .sign(SHA256(this.from + this.to + this.amount), 'base64')
                .toDER('hex')
        }
    }

    isValid(tx, chain) {
        return (
            tx.from &&
            tx.to &&
            tx.amount &&
            (chain.getBalance(tx.from) >= tx.amount ||
                tx.from === MINT_PUBLIC_ADDRESS) &&
            ec
                .keyFromPublic(tx.from, 'hex')
                .verify(SHA256(tx.from + tx.to + tx.amount), tx.signature)
        )
    }
}

class Blockchain {
    constructor() {
        const initalCoinRelease = new Transaction(
            MINT_PUBLIC_ADDRESS,
            holderKeyPair.getPublic('hex'),
            100000
        )
        this.chain = [new Block(Date.now().toString(), [initalCoinRelease])]
        this.difficulty = 1
        this.blockTime = 1 * 60 * 1000
        this.transactions = []
        this.reward = 297
    }

    getLastBlock() {
        return this.chain[this.chain.length - 1]
    }

    addBlock(block) {
        block.prevHash = this.getLastBlock().hash
        block.hash = block.getHash()
        block.mine(this.difficulty)
        this.chain.push(Object.freeze(block))

        this.difficulty +=
            Date.now() - parseInt(this.getLastBlock().timestamp) <
            this.blockTime
                ? 1
                : -1
    }

    addTransaction(transaction) {
        if (transaction.isValid(transaction, this)) {
            this.transactions.push(transaction)
        }
    }

    mineTransactions(rewardAddress) {
        const rewardTransaction = new Transaction(
            MINT_PUBLIC_ADDRESS,
            rewardAddress,
            this.reward
        )
        rewardTransaction.sign(MINT_KEY_PAIR)

        // We will add the reward transaction into the pool.
        this.addBlock(
            new Block(Date.now().toString(), [
                rewardTransaction,
                ...this.transactions,
            ])
        )

        this.transactions = []
    }

    isValid(blockchain = this) {
        for (let i = 1; i < blockchain.chain.length; i++) {
            const currentBlock = blockchain.chain[i]
            const prevBlock = blockchain.chain[i - 1]

            if (
                currentBlock.hash !== currentBlock.getHash() ||
                prevBlock.hash !== currentBlock.prevHash ||
                !currentBlock.hasValidTransactions(blockchain)
            ) {
                return false
            }
        }

        return true
    }

    getBalance(address) {
        let balance = 0

        this.chain.forEach((block) => {
            block.data.forEach((transaction) => {
                if (transaction.from === address) {
                    balance -= transaction.amount
                }

                if (transaction.to === address) {
                    balance += transaction.amount
                }
            })
        })

        return balance
    }
}

// Play area
const JeChain = new Blockchain()
JeChain.addBlock(
    new Block(Date.now().toString(), { from: 'John', to: 'Bob', amount: 100 })
)
JeChain.addBlock(
    new Block(Date.now().toString(), { from: 'Bob', to: 'John', amount: 50 })
)
JeChain.addBlock(
    new Block(Date.now().toString(), { from: 'Xav', to: 'John', amount: 10 })
)
JeChain.addBlock(
    new Block(Date.now().toString(), { from: 'John', to: 'Xav', amount: 10000 })
)
JeChain.addBlock(
    new Block(Date.now().toString(), { from: 'John', to: 'Bob', amount: 105 })
)

console.log('Chain class', JeChain)
