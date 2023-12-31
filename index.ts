import { holderKeyPair, girlfriendWallet } from './project/constants';
import { Transaction } from './project/transaction';
import { Blockchain } from './project/blockchain';

// Play area
const JeChain = new Blockchain();

const transaction = new Transaction(
    holderKeyPair.getPublic('hex'),
    girlfriendWallet.getPublic('hex'),
    100,
    10
);
transaction.sign(holderKeyPair);

JeChain.addTransaction(transaction);
JeChain.mineTransactions(holderKeyPair.getPublic('hex'));

console.log('Your balance:', JeChain.getBalance(holderKeyPair.getPublic('hex')));
console.log(
    "Your girlfriend's balance:",
    JeChain.getBalance(girlfriendWallet.getPublic('hex'))
);
