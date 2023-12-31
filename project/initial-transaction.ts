import { xavierWallet, MINT_PUBLIC_ADDRESS } from './constants'
import { Transaction } from './transaction'

export const firstTransaction = new Transaction(
    MINT_PUBLIC_ADDRESS,
    xavierWallet.getPublic('hex'),
    100000
)
