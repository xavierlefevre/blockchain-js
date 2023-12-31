import * as crypto from 'crypto';
import { ec as EC } from 'elliptic';

const SHA256 = (message: string): string =>
    crypto.createHash('sha256').update(message).digest('hex');

const log16 = (n: number): number => Math.log(n) / Math.log(16);

const ec = new EC('secp256k1');

const keyPair = ec.genKeyPair();

const MINT_KEY_PAIR = ec.genKeyPair();
const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic('hex');

const holderKeyPair = ec.genKeyPair();

class Block {
    public timestamp: string;
    public data: Transaction[];
    public hash: string;
    public prevHash: string;
    public nonce: number;

    constructor(timestamp: string = '', data: Transaction[] = []) {
        this.timestamp = timestamp;
        this.data = data;
        this.hash = this.getHash();
        this.prevHash = '';
        this.nonce = 0;
    }

    getHash(): string {
        return SHA256(
            this.prevHash +
                this.timestamp +
                JSON.stringify(this.data) +
                this.nonce
        );
    }

    mine(difficulty: number): void {
        while (
            !this.hash.startsWith(
                '000' + Array(Math.round(log16(difficulty)) + 1).join('0')
            )
        ) {
            this.nonce++;
            this.hash = this.getHash();
        }
    }

    hasValidTransactions(chain: Blockchain): boolean {
        let gas = 0,
            reward = 0;

        this.data.forEach((transaction) => {
            if (transaction.from !== MINT_PUBLIC_ADDRESS) {
                gas += transaction.gas;
            } else {
                reward = transaction.amount;
            }
        });

        return (
            reward - gas === chain.reward &&
            this.data.every((transaction) =>
                transaction.isValid(transaction, chain)
            ) &&
            this.data.filter(
                (transaction) => transaction.from === MINT_PUBLIC_ADDRESS
            ).length === 1
        );
    }
}

class Transaction {
    public from: string;
    public to: string;
    public amount: number;
    public gas: number;
    public signature?: string;

    constructor(from: string, to: string, amount: number, gas: number = 0) {
        this.from = from;
        this.to = to;
        this.amount = amount;
        this.gas = gas;
    }

    sign(keyPair: EC.KeyPair): void {
        if (keyPair.getPublic('hex') === this.from) {
            this.signature = keyPair
                .sign(
                    SHA256(this.from + this.to + this.amount + this.gas),
                    'base64'
                )
                .toDER('hex');
        }
    }

    isValid(tx: Transaction, chain: Blockchain): boolean {
        return !!(
            tx.from &&
            tx.to &&
            tx.amount &&
            (chain.getBalance(tx.from) >= tx.amount + tx.gas ||
                tx.from === MINT_PUBLIC_ADDRESS) &&
            ec
                .keyFromPublic(tx.from, 'hex')
                .verify(
                    SHA256(tx.from + tx.to + tx.amount + tx.gas),
                    tx.signature!
                )
        );
    }
}

class Blockchain {
    public chain: Block[];
    public difficulty: number;
    public blockTime: number;
    public transactions: Transaction[];
    public reward: number;

    constructor() {
        const initialCoinRelease = new Transaction(
            MINT_PUBLIC_ADDRESS,
            holderKeyPair.getPublic('hex'),
            100000
        );
        this.chain = [new Block(Date.now().toString(), [initialCoinRelease])];
        this.difficulty = 1;
        this.blockTime = 1 * 60 * 1000;
        this.transactions = [];
        this.reward = 297;
    }

    getLastBlock(): Block {
        return this.chain[this.chain.length - 1];
    }

    addBlock(block: Block): void {
        block.prevHash = this.getLastBlock().hash;
        block.hash = block.getHash();
        block.mine(this.difficulty);
        this.chain.push(Object.freeze(block));

        this.difficulty +=
            Date.now() - parseInt(this.getLastBlock().timestamp) <
            this.blockTime
                ? 1
                : -1;
    }

    addTransaction(transaction: Transaction): void {
        if (transaction.isValid(transaction, this)) {
            this.transactions.push(transaction);
        }
    }

    mineTransactions(rewardAddress: string): void {
        let gas = 0;

        this.transactions.forEach((transaction) => {
            gas += transaction.gas;
        });

        const rewardTransaction = new Transaction(
            MINT_PUBLIC_ADDRESS,
            rewardAddress,
            this.reward + gas
        );
        rewardTransaction.sign(MINT_KEY_PAIR);

        if (this.transactions.length !== 0)
            this.addBlock(
                new Block(Date.now().toString(), [
                    rewardTransaction,
                    ...this.transactions,
                ])
            );

        this.transactions = [];
    }

    isValid(blockchain: Blockchain = this): boolean {
        for (let i = 1; i < blockchain.chain.length; i++) {
            const currentBlock = blockchain.chain[i];
            const prevBlock = blockchain.chain[i - 1];

            if (
                currentBlock.hash !== currentBlock.getHash() ||
                prevBlock.hash !== currentBlock.prevHash ||
                !currentBlock.hasValidTransactions(blockchain)
            ) {
                return false;
            }
        }

        return true;
    }

    getBalance(address: string): number {
        let balance = 0;

        this.chain.forEach((block) => {
            block.data.forEach((transaction) => {
                if (transaction.from === address) {
                    balance -= transaction.amount;
                    balance -= transaction.gas;
                }

                if (transaction.to === address) {
                    balance += transaction.amount;
                }
            });
        });

        return balance;
    }
}

// Play area
const JeChain = new Blockchain();

const girlfriendWallet = ec.genKeyPair();

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
