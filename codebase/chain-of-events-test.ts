import { ec } from './core/cryptography'

const xavierWallet = ec.genKeyPair()
const lumaWallet = ec.genKeyPair()

const minerPrivateKey = process.env.PRIVATE_KEY || ''
const minerWallet = ec.keyFromPrivate(minerPrivateKey, 'hex')

import { Transaction } from './core/transaction'
import { Blockchain } from './core/blockchain'
import type { Block } from './core/block'

const xavierPublic = xavierWallet.getPublic('hex')
const lumaPublic = lumaWallet.getPublic('hex')
const minerPublic = minerWallet.getPublic('hex')

const Mugen = new Blockchain()

// Step 1

const transactionToXavier1 = new Transaction({
    from: minerPublic,
    to: xavierPublic,
    amount: 5000,
    gas: 10,
})
transactionToXavier1.sign({ keyPair: minerWallet })
Mugen.addTransaction({ transaction: transactionToXavier1 })

Mugen.mineBlock({ rewardAddress: minerPublic })

// Step 2

const transactionToLuma1 = new Transaction({
    from: xavierPublic,
    to: lumaPublic,
    amount: 150,
    gas: 15,
})
transactionToLuma1.sign({ keyPair: xavierWallet })
Mugen.addTransaction({ transaction: transactionToLuma1 })

Mugen.mineBlock({ rewardAddress: minerPublic })

// Step 3

setTimeout(() => {
    const transactionToLuma2 = new Transaction({
        from: xavierPublic,
        to: lumaPublic,
        amount: 340,
        gas: 23,
    })
    transactionToLuma2.sign({ keyPair: xavierWallet })
    Mugen.addTransaction({ transaction: transactionToLuma2 })
}, 1)

setTimeout(() => {
    Mugen.mineBlock({ rewardAddress: minerPublic })
}, 1)

// Step 4

setTimeout(() => {
    const transactionToXavier2 = new Transaction({
        from: lumaPublic,
        to: xavierPublic,
        amount: 50,
        gas: 3,
    })
    transactionToXavier2.sign({ keyPair: lumaWallet })
    Mugen.addTransaction({ transaction: transactionToXavier2 })
}, 1)

setTimeout(() => {
    Mugen.mineBlock({ rewardAddress: minerPublic })
}, 1)

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
}, 10)
