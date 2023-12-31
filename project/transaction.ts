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

    constructor(from: string, to: string, amount: number, gas: number = 0) {
        this.from = from
        this.to = to
        this.amount = amount
        this.gas = gas
    }

    sign(keyPair: EC.KeyPair): void {
        if (keyPair.getPublic('hex') === this.from) {
            this.signature = keyPair
                .sign(
                    SHA256(this.from + this.to + this.amount + this.gas),
                    'base64'
                )
                .toDER('hex')
        }
    }

    isValid(tx: Transaction, chain: Blockchain): boolean {
        return !!(
            tx.from &&
            tx.to &&
            tx.amount &&
            (chain.getBalance(tx.from) >= tx.amount + tx.gas ||
                tx.from === MINT_PUBLIC_ADDRESS) &&
            ec
                .keyFromPublic(tx.from, 'hex')
                .verify(
                    SHA256(tx.from + tx.to + tx.amount + tx.gas),
                    tx.signature!
                )
        )
    }
}
