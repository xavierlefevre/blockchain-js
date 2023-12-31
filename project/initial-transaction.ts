import { xavierWallet, MINT_PUBLIC_ADDRESS } from './constants'
import { Transaction } from './transaction'

export const firstTransaction = new Transaction({
    from: MINT_PUBLIC_ADDRESS,
    to: xavierWallet.getPublic('hex'),
    amount: 100000,
})
