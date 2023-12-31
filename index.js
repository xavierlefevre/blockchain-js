const crypto = require('crypto')

const SHA256 = (message) =>
    crypto.createHash('sha256').update(message).digest('hex')

class Block {
    constructor(timestamp = '', data = []) {
        this.timestamp = timestamp
        this.data = data
        this.hash = this.getHash()
        this.prevHash = ''
    }

    getHash() {
        return SHA256(
            this.prevHash + this.timestamp + JSON.stringify(this.data)
        )
    }
}

class Blockchain {
    constructor() {
        this.chain = [new Block(Date.now().toString())]
    }

    getLastBlock() {
        return this.chain[this.chain.length - 1]
    }

    addBlock(block) {
        block.prevHash = this.getLastBlock().hash
        block.hash = block.getHash()

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
const nowTimestamp = Date.now().toString()

console.log('nowTimestamp', nowTimestamp)

const firstBlock = new Block(nowTimestamp, [1, 2, 3])

console.log('hash', firstBlock.getHash())
console.log('firstBlock', firstBlock)
