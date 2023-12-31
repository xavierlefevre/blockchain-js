import { ec as EC } from 'elliptic'

import { MINT_PUBLIC_ADDRESS } from './constants'
import { ec, SHA256 } from './helper'
import type { Blockchain } from './blockchain'

export class Transaction {
    public from: string
    public to: string
    public amount: number
    public gas: number
    public signature?: string

    constructor({
        from,
        to,
        amount,
        gas = 0,
    }: {
        from: string
        to: string
        amount: number
        gas?: number
    }) {
        this.from = from
        this.to = to
        this.amount = amount
        this.gas = gas
    }

    sign({ keyPair }: { keyPair: EC.KeyPair }): void {
        if (keyPair.getPublic('hex') === this.from) {
            this.signature = keyPair
                .sign(
                    SHA256(this.from + this.to + this.amount + this.gas),
                    'base64'
                )
                .toDER('hex')
        }
    }

    isValid({
        transaction,
        chain,
    }: {
        transaction: Transaction
        chain: Blockchain
    }): boolean {
        return !!(
            transaction.from &&
            transaction.to &&
            transaction.amount &&
            (chain.getBalance(transaction.from) >=
                transaction.amount + transaction.gas ||
                transaction.from === MINT_PUBLIC_ADDRESS) &&
            ec
                .keyFromPublic(transaction.from, 'hex')
                .verify(
                    SHA256(
                        transaction.from +
                            transaction.to +
                            transaction.amount +
                            transaction.gas
                    ),
                    transaction.signature!
                )
        )
    }
}
