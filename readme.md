# Simple TypeScript Blockchain

## Introduction

This project is for personal educational purposes. My objective is to build a mental mapping of a blockchain's design.
I leverage different online resources to progressively build-up a more complete blockchain.

## Start

-   Install dependencies: `yarn`
-   Launch the transactions simulation: `npx ts-node index.ts`

## Todo

-   Draft and document the current implementation with a diagram
-   Improvement ideas:
    -   Build-up a rational between initial coin quantity, coin minting and burning
    -   Let the miner re-arrange the list of transactions based on gas
    -   Minimum gas allowed and/or deadline before transaction failed
    -   Create a chain validator persona
    -   Build a proper secure API: what can be called by who
    -   Handle concurrency at each step
    -   Setup a Peer-to-peer process
    -   Explore contract execution like Ethereum

## Sources

[Creating a blockchain in 60 lines of Javascript - by FreakCdev](https://dev.to/freakcdev297/creating-a-blockchain-in-60-lines-of-javascript-5fka)

### To explore

-   https://medium.com/coinmonks/building-a-blockchain-using-javascript-ac75d1b2af23
-   https://github.com/nambrot/blockchain-in-js
-   https://www.youtube.com/watch?v=zVqczFZr124&ab_channel=SimplyExplained
