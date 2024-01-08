import type { ec as EC } from 'elliptic'

import { MINT_PUBLIC_ADDRESS } from './wallets'
import { ec, SHA256 } from './cryptography'
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

    public sign({ keyPair }: { keyPair: EC.KeyPair }): void {
        if (keyPair.getPublic('hex') === this.from) {
            this.signature = keyPair
                .sign(
                    SHA256(this.from + this.to + this.amount + this.gas),
                    'base64'
                )
                .toDER('hex')
        }
        // --- Question ---
        // Why not do the signing at the same time as creating the transaction?
        // Possible answer: in order to allow the creation of the transaction by someone else, like the receiver
        // however the gas will still be paid by the sender
    }

    static isValid({
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
            // --- Limit ---
            // The below checks if the sender has enough money in the chain
            // however if several transactions were sent in a row, the total "pending" amount
            // is not used for the check, which could make sense because the pool transactions were not validated
            // but it means that those transactions would have to wait for the next mining
            // We could consider getting the balance from the existing pool when adding a transaction to it
            // then checking the included pool when mining and validating a block
            // However if block can choose the transactions, they'd have to be careful of those "dependencies"
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
