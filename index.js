const crypto = require('crypto')

const SHA256 = (message) =>
    crypto.createHash('sha256').update(message).digest('hex')

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
        while (!this.hash.startsWith(Array(difficulty + 1).join('0'))) {
            this.nonce++
            this.hash = this.getHash()
        }
    }
}

class Blockchain {
    constructor() {
        this.chain = [new Block(Date.now().toString())]
        this.difficulty = 1
    }

    getLastBlock() {
        return this.chain[this.chain.length - 1]
    }

    addBlock(block) {
        block.prevHash = this.getLastBlock().hash
        block.hash = block.getHash()
        block.mine(this.difficulty)
        this.chain.push(Object.freeze(block))
    }

    isValid(blockchain = this) {
        for (let i = 1; i < blockchain.chain.length; i++) {
            const currentBlock = blockchain.chain[i]
            const prevBlock = blockchain.chain[i - 1]

            if (
                currentBlock.hash !== currentBlock.getHash() ||
                prevBlock.hash !== currentBlock.prevHash
            ) {
                return false
            }
        }

        return true
    }
}

// Play area
const JeChain = new Blockchain()
JeChain.addBlock(
    new Block(Date.now().toString(), { from: 'John', to: 'Bob', amount: 100 })
)

console.log(JeChain.chain)
