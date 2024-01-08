# Simple TypeScript Blockchain

## Introduction

This project is for personal educational purposes. It is full of limits and edge cases, but encompasses the core components of a blockchain. Its purpose is to help me build a mental model of a blockchain's design. Different online resources were leveraged to build-up this project, sources at the bottom of the page.

## Start

-   Install dependencies: `yarn`
-   **Option 1**: chain of events simulation on one machine: `yarn play-chain-of-events`
-   **Options 2**: node to node communication script: quickly run 2 nodes in 2 terminals
    -   Terminal 1: `yarn play-node-a`
    -   Terminal 2: `yarn play-node-b`

## Design

### Representation of the chain

![](documentation/chain-representation.png)

### Security

#### Transaction validity

Each wallet owner owns a key pair as unique identifier, address, transaction signing tool. The public key is accessible to the network. The private remains secret to its owner.

#### Blockchain validity through Proof of work

Blocks are chained via their hashes. If a previous block hash is changed, it invalidates all subsequent hashes. It will take more time for a solo hacker to re-mine each subsequent block hashes to build a fake chain, than the rest of the network to continue growing the valid chain.

## Improvement Ideas

-   Peer-to-peer:
    -   Handle concurrency
    -   Clarify the different jobs API: what can be called by who
-   Global economics:
    -   Draft a rational behind initial coin quantity then growth (minting and burning)
-   Improve the transaction & mining:
    -   Set a minimum gas allowed per transaction
    -   And/or a set time before transaction failed
    -   If too many transactions, let the miner pick and choose transactions, for instance based on gas
    -   Get a more consistant mining time (currently using a basic difficulty setting and refresh)
-   Performance:
    -   Create reliable intermediary images of the ledger, instead of recalculating balances through the entire history
-   Blockchain value:
    -   Explore contract execution like Ethereum
-   Code robustness:
    -   Add tests, unit to end-to-end
    -   Switch to funcitonal programming (FP-TS), with a more Domain Driven Design structure

## Sources

-   [Creating a blockchain in 60 lines of Javascript - by FreakCdev](https://dev.to/freakcdev297/creating-a-blockchain-in-60-lines-of-javascript-5fka)
-   [Build your own Blockchain in Javascript - by nambrot](https://github.com/nambrot/blockchain-in-js)
-   [Create a blockchain javascript - by Simply Explained](https://www.youtube.com/watch?v=zVqczFZr124&list=PLggJAWhpyrRxKmetiP3RdTa7VAbGaXWub&ab_channel=SimplyExplained)
