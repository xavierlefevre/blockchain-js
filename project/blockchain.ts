import { holderKeyPair, MINT_KEY_PAIR, MINT_PUBLIC_ADDRESS } from './constants';
import { Block } from './block';
import { Transaction } from './transaction';

export class Blockchain {
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