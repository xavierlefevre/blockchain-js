import { publicKey, MINT_PUBLIC_ADDRESS } from './wallets'
import { Transaction } from './transaction'

export const firstTransaction = new Transaction({
    from: MINT_PUBLIC_ADDRESS,
    to: publicKey,
    amount: 100000000,
})
