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

    constructor() {
        const initialCoinReleaseTransaction = firstTransaction
        const firstBlock = new Block({
            timestamp: Date.now().toString(),
            previousHash: '', // --- Explanation ---> First block doesn't have an elder
            transactionList: [initialCoinReleaseTransaction],
        })
        this.chain = [firstBlock]
        this.transactionsPool = []
        this.miningDifficulty = 1
        this.targetBlockCreationTime = 1 * 60 * 1000
        this.miningReward = 100
    }

    public getLastBlock(): Block {
        return this.chain[this.chain.length - 1]
    }

    public addTransaction({ transaction }: { transaction: Transaction }): void {
        if (transaction.isValid({ transaction, chain: this })) {
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
        // --- Limit ---
        // Giving a fixed amount of coins even if the miner only adds 1 transaction
        // is not economical, either the amount of minting should depend on the
        // - mining time: because it corresponds to the energy and time spent by the miner
        // or
        // - transactions number, value or gas: because it corresponds to the value provided to users

        // --- Explanation ---
        // Ensuring that at least one legit transaction has been processed by the miner
        if (this.transactionsPool.length !== 0) {
            const newBlock = new Block({
                timestamp: Date.now().toString(),
                previousHash: this.getLastBlock().hash,
                transactionList: [
                    this.buildRewardTransaction({
                        rewardAddress,
                    }),
                    ...this.transactionsPool,
                ],
            })

            newBlock.mine(this.miningDifficulty)

            // --- Limit ---
            // The miner is both mining, adding to the chain and resetting the transaction pool
            // thus no on ensures that the work is legit
            this.chain.push(Object.freeze(newBlock))
            this.transactionsPool = []

            // --- Explanation ---
            // Re-adjustment of the mining difficulty after each new block successfully created
            this.miningDifficulty +=
                Date.now() - parseInt(this.getLastBlock().timestamp) <
                this.targetBlockCreationTime
                    ? 1
                    : -1
        }
    }

    // --- Explanation ---
    // Not used at the moment
    public isValid(blockchain: Blockchain = this): boolean {
        for (let i = 1; i < blockchain.chain.length; i++) {
            const currentBlock = blockchain.chain[i]
            const prevBlock = blockchain.chain[i - 1]

            if (
                currentBlock.hash !== currentBlock.computeHash() ||
                prevBlock.hash !== currentBlock.previousHash ||
                !currentBlock.hasValidTransactions(blockchain)
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
