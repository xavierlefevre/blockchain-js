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
        // --- Question ---
        // The public key of the "from wallet", anyone can have it
        // so is it secure enough when signing and validating?
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
            // however if several transactions are sent to the pool, the total "pending" amount
            // is not checked
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
