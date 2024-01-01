import { xavierWallet, lumaWallet, minerWallet } from './project/wallets'
import { Transaction } from './project/transaction'
import { Blockchain } from './project/blockchain'
import type { Block } from './project/block'

const xavierPublic = xavierWallet.getPublic('hex')
const lumaPublic = lumaWallet.getPublic('hex')
const minerPublic = minerWallet.getPublic('hex')

// ************************
// Real-life scenario
// ************************

// ------ Creators ------
// D-DAY -> Launch of the new blockchain and crypto Mugen!
const Mugen = new Blockchain()

// ------ User: Xavier ------
// DAY 1.0 -> First transaction to Luma
const transactionToLuma1 = new Transaction({
    from: xavierPublic,
    to: lumaPublic,
    amount: 100,
    gas: 10,
})
transactionToLuma1.sign({ keyPair: xavierWallet })
Mugen.addTransaction({ transaction: transactionToLuma1 })

// DAY 1.1 -> Second transaction to Luma
const transactionToLuma2 = new Transaction({
    from: xavierPublic,
    to: lumaPublic,
    amount: 150,
    gas: 15,
})
transactionToLuma2.sign({ keyPair: xavierWallet })
Mugen.addTransaction({ transaction: transactionToLuma2 })

// DAY 2.1 -> Third transaction to Luma
setTimeout(() => {
    const transactionToLuma3 = new Transaction({
        from: xavierPublic,
        to: lumaPublic,
        amount: 340,
        gas: 23,
    })
    transactionToLuma3.sign({ keyPair: xavierWallet })
    Mugen.addTransaction({ transaction: transactionToLuma3 })
}, 2)

// ------ User: Luma ------
// DAY 2.0 -> First transaction to Xavier
setTimeout(() => {
    const transactionToXavier1 = new Transaction({
        from: lumaPublic,
        to: xavierPublic,
        amount: 50,
        gas: 3,
    })
    transactionToXavier1.sign({ keyPair: lumaWallet })
    Mugen.addTransaction({ transaction: transactionToXavier1 })
}, 1)

// ------ Miner ------
// DAY 1.2 -> Mining of the transactions in the pool
Mugen.mineBlock({ rewardAddress: minerPublic })

// DAY 2.2 -> Mining of the transactions in the pool
setTimeout(() => {
    Mugen.mineBlock({ rewardAddress: minerPublic })
}, 3)

// xxxxxxxx Result xxxxxxxx
setTimeout(() => {
    console.log(' ')
    console.log('Chain', Mugen)
    console.log('-----')
    console.log(' ')
    console.log('-----')
    Mugen.chain.map((block: Block) => {
        console.log(
            `Transactions in block ${block.hash}`,
            block.transactionList
        )
    })
    console.log('-----')
    console.log(' ')
    console.log('-----')
    console.log("Xavier's balance:", Mugen.getBalance(xavierPublic))
    console.log("Luma's balance:", Mugen.getBalance(lumaPublic))
    console.log("Miner's balance:", Mugen.getBalance(minerPublic))
    console.log(' ')
}, 4)
