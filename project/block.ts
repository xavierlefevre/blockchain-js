import { MINT_PUBLIC_ADDRESS } from './wallets'
import { SHA256 } from './cryptography'
import type { Transaction } from './transaction'
import type { Blockchain } from './blockchain'

const log16 = (n: number): number => Math.log(n) / Math.log(16)

export class Block {
    public timestamp: string
    public transactionList: Transaction[]
    public hash: string
    public previousHash: string
    public nonce: number

    constructor({
        timestamp,
        previousHash,
        transactionList,
    }: {
        timestamp: string
        previousHash: string
        transactionList: Transaction[]
    }) {
        this.timestamp = timestamp
        this.transactionList = transactionList
        this.previousHash = previousHash
        this.hash = this.computeHash()
        this.nonce = 0
    }

    public computeHash(): string {
        return SHA256(
            this.previousHash +
                this.timestamp +
                JSON.stringify(this.transactionList) +
                this.nonce
        )
    }

    public mine(difficulty: number): void {
        while (
            !this.hash.startsWith(
                '000' + Array(Math.round(log16(difficulty)) + 1).join('0')
            )
        ) {
            this.nonce++
            this.hash = this.computeHash()
        }
    }

    // --- Explanation ---
    // Not used at the moment, just called by the Blockchain validation function, not used
    public hasValidTransactions(chain: Blockchain): boolean {
        let gas = 0,
            reward = 0

        this.transactionList.forEach((transaction) => {
            if (transaction.from !== MINT_PUBLIC_ADDRESS) {
                gas += transaction.gas
            } else {
                reward = transaction.amount
            }
        })

        return (
            reward - gas === chain.miningReward &&
            this.transactionList.every((transaction) =>
                transaction.isValid({ transaction, chain })
            ) &&
            this.transactionList.filter(
                (transaction) => transaction.from === MINT_PUBLIC_ADDRESS
            ).length === 1
        )
    }
}
