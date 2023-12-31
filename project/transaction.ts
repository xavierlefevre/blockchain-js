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
        // Question: the public key of the "from wallet", anyone can have it
        // so is it secure enough when signing and validating?
        if (keyPair.getPublic('hex') === this.from) {
            this.signature = keyPair
                .sign(
                    SHA256(this.from + this.to + this.amount + this.gas),
                    'base64'
                )
                .toDER('hex')
        }
        // Question: Why not do the signing at the same time as creating the transaction?
        // Possible answer: in order to allow the creation of the transaction by someone else, like the receiver
        // however the gas will still be paid by the sender
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
