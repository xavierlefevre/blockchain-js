import { MINT_KEY_PAIR, MINT_PUBLIC_ADDRESS } from './wallets'
import { Block } from './block'
import { Transaction } from './transaction'
import { firstTransaction } from './initial-transaction'

export class Blockchain {
    public chain: Block[]
    public transactionsPool: Transaction[]
    public miningDifficulty: number
    public targetBlockCreationTime: number
    public miningReward: number
    public mining: boolean

    constructor() {
        const initialCoinReleaseTransaction = firstTransaction
        const firstBlock = new Block({
            timestamp: '1704276347504',
            previousHash: '', // --- Explanation ---> First block doesn't have an ancestor
            transactionList: [initialCoinReleaseTransaction],
        })
        this.chain = [firstBlock]
        this.transactionsPool = []
        this.miningDifficulty = 1
        this.targetBlockCreationTime = 1 * 60 * 1000 // --- Explanation ---> 1min in milliseconds
        this.miningReward = 100
        this.mining = false
    }

    public getLastBlock(): Block {
        return this.chain[this.chain.length - 1]
    }

    public addTransaction({ transaction }: { transaction: Transaction }): void {
        if (Transaction.isValid({ transaction, chain: this })) {
            this.transactionsPool.push(transaction)
        }
    }

    private buildRewardTransaction({
        rewardAddress,
    }: {
        rewardAddress: string
    }): Transaction {
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

        return rewardTransaction
    }

    public mineBlock({ rewardAddress }: { rewardAddress: string }): void {
        // --- Explanation ---
        // Ensuring that at least one legit transaction has been processed by the miner
        if (this.transactionsPool.length !== 0 && !this.mining) {
            this.mining = true // Prevent piling asynchronous mining calls if already ongoing
            // --- Limit ---
            // Due to the difficulty, mining is supposed to take a set average time
            // During the process, at each loop trying to compute the right hash, the miner
            // should be able to include more transactions

            const newBlock = new Block({
                timestamp: Date.now().toString(),
                previousHash: this.getLastBlock().hash,
                transactionList: [
                    this.buildRewardTransaction({
                        rewardAddress,
                    }),
                    ...this.transactionsPool, // --- Note ---> Should be ok to calculate transaction reward, then spread the same object as JavaScript is mono-thread
                ],
            })

            newBlock.mine(this.miningDifficulty)

            this.chain.push(Object.freeze(newBlock))
            this.transactionsPool = []

            // --- Explanation ---
            // Re-adjustment of the mining difficulty after each new block successfully created
            this.miningDifficulty +=
                Date.now() - parseInt(this.getLastBlock().timestamp) <
                this.targetBlockCreationTime
                    ? 1
                    : -1

            this.mining = false
        }
    }

    static isValid(blockchain: Blockchain): boolean {
        for (let i = 1; i < blockchain.chain.length; i++) {
            const currentBlock = blockchain.chain[i]
            const prevBlock = blockchain.chain[i - 1]

            if (
                currentBlock.hash !== Block.computeHash(currentBlock) ||
                prevBlock.hash !== currentBlock.previousHash ||
                !Block.hasValidTransactions(currentBlock, blockchain)
            ) {
                return false
            }
        }

        return true
    }

    public getBalance(address: string): number {
        let balance = 0

        // --- Limit ---
        // Not computationally efficient for long chains
        this.chain.forEach((block) => {
            block.transactionList.forEach((transaction) => {
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
