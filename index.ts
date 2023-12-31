import { xavierWallet, lumaWallet } from './project/constants'
import { Transaction } from './project/transaction'
import { Blockchain } from './project/blockchain'

// Test Area
const Mugen = new Blockchain()

const transaction = new Transaction(
    xavierWallet.getPublic('hex'),
    lumaWallet.getPublic('hex'),
    100,
    10
)
transaction.sign(xavierWallet)

Mugen.addTransaction(transaction)
Mugen.mineTransactions(xavierWallet.getPublic('hex'))

console.log(' ')
console.log(
    "Xavier's balance:",
    Mugen.getBalance(xavierWallet.getPublic('hex'))
)
console.log("Luma's balance:", Mugen.getBalance(lumaWallet.getPublic('hex')))
console.log(' ')
