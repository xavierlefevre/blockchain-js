import { MINT_KEY_PAIR, MINT_PUBLIC_ADDRESS } from './constants'
import { Block } from './block'
import { Transaction } from './transaction'
import { firstTransaction } from './initial-transaction'

export class Blockchain {
    public chain: Block[]
    public transactionsPool: Transaction[]
    public miningDifficulty: number
    public targetBlockCreationTime: number
    public miningReward: number

    constructor() {
        const initialCoinRelease = firstTransaction
        this.chain = [new Block(Date.now().toString(), [initialCoinRelease])]
        this.transactionsPool = []
        this.miningDifficulty = 1
        this.targetBlockCreationTime = 1 * 60 * 1000
        this.miningReward = 100
    }

    getLastBlock(): Block {
        return this.chain[this.chain.length - 1]
    }

    addBlock(block: Block): void {
        block.prevHash = this.getLastBlock().hash
        block.hash = block.getHash()
        block.mine(this.miningDifficulty)
        this.chain.push(Object.freeze(block))

        // Re-adjustment of the mining difficulty after each new block created
        this.miningDifficulty +=
            Date.now() - parseInt(this.getLastBlock().timestamp) <
            this.targetBlockCreationTime
                ? 1
                : -1
    }

    addTransaction({ transaction }: { transaction: Transaction }): void {
        if (transaction.isValid({ transaction, chain: this })) {
            this.transactionsPool.push(transaction)
        }
    }

    mineTransactions({ rewardAddress }: { rewardAddress: string }): void {
        let gas = 0

        this.transactionsPool.forEach((transaction) => {
            gas += transaction.gas
        })

        const rewardTransaction = new Transaction({
            from: MINT_PUBLIC_ADDRESS,
            to: rewardAddress,
            amount: this.miningReward + gas,
        })
        rewardTransaction.sign({ keyPair: MINT_KEY_PAIR })

        // Ensuring that at least one legit transaction has been processed by the miner
        if (this.transactionsPool.length !== 0)
            this.addBlock(
                new Block(Date.now().toString(), [
                    rewardTransaction,
                    ...this.transactionsPool,
                ])
            )

        this.transactionsPool = []
    }

    isValid(blockchain: Blockchain = this): boolean {
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

    getBalance(address: string): number {
        let balance = 0

        this.chain.forEach((block) => {
            block.data.forEach((transaction) => {
                if (transaction.from === address) {
                    balance -= transaction.amount
                    balance -= transaction.gas
                }

                if (transaction.to === address) {
                    balance += transaction.amount
                }
            })
        })

        return balance
    }
}
