import { xavierWallet, lumaWallet, minersWallet } from './project/constants'
import { Transaction } from './project/transaction'
import { Blockchain } from './project/blockchain'

// Test Area

// Official launch of the blockchain Mugen by its creators, therefore first (and last) instantiation
const Mugen = new Blockchain()

// First transaction by Xavier to Luma
const transaction = new Transaction({
    from: xavierWallet.getPublic('hex'),
    to: lumaWallet.getPublic('hex'),
    amount: 100,
    gas: 10,
})
// Signature of the transaction by Xavier
transaction.sign({ keyPair: xavierWallet })

// Sending of the transaction to the blockchain's pool
Mugen.addTransaction({ transaction })

// Mining of the transactions by a miner
Mugen.mineTransactions({ rewardAddress: minersWallet.getPublic('hex') })

// Reading of the result
console.log(' ')
console.log(
    "Xavier's balance:",
    Mugen.getBalance(xavierWallet.getPublic('hex'))
)
console.log("Luma's balance:", Mugen.getBalance(lumaWallet.getPublic('hex')))
console.log("Miner's balance:", Mugen.getBalance(minersWallet.getPublic('hex')))
console.log(' ')
