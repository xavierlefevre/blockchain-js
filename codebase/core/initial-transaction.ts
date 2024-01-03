import { MINT_PUBLIC_ADDRESS } from './wallets'
import { Transaction } from './transaction'

export const firstTransaction = new Transaction({
    from: MINT_PUBLIC_ADDRESS,
    to: '04719af634ece3e9bf00bfd7c58163b2caf2b8acd1a437a3e99a093c8dd7b1485c20d8a4c9f6621557f1d583e0fcff99f3234dd1bb365596d1d67909c270c16d64',
    amount: 100000000,
})
