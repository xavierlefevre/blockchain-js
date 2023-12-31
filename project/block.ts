import { MINT_PUBLIC_ADDRESS } from './constants'
import { SHA256 } from './helper'
import type { Transaction } from './transaction'
import type { Blockchain } from './blockchain'

const log16 = (n: number): number => Math.log(n) / Math.log(16)

export class Block {
    public timestamp: string
    public data: Transaction[]
    public hash: string
    public prevHash: string
    public nonce: number

    constructor(timestamp: string = '', data: Transaction[] = []) {
        this.timestamp = timestamp
        this.data = data
        this.hash = this.getHash()
        this.prevHash = ''
        this.nonce = 0
    }

    getHash(): string {
        return SHA256(
            this.prevHash +
                this.timestamp +
                JSON.stringify(this.data) +
                this.nonce
        )
    }

    mine(difficulty: number): void {
        while (
            !this.hash.startsWith(
                '000' + Array(Math.round(log16(difficulty)) + 1).join('0')
            )
        ) {
            this.nonce++
            this.hash = this.getHash()
        }
    }

    hasValidTransactions(chain: Blockchain): boolean {
        let gas = 0,
            reward = 0

        this.data.forEach((transaction) => {
            if (transaction.from !== MINT_PUBLIC_ADDRESS) {
                gas += transaction.gas
            } else {
                reward = transaction.amount
            }
        })

        return (
            reward - gas === chain.miningReward &&
            this.data.every((transaction) =>
                transaction.isValid({ transaction, chain })
            ) &&
            this.data.filter(
                (transaction) => transaction.from === MINT_PUBLIC_ADDRESS
            ).length === 1
        )
    }
}
