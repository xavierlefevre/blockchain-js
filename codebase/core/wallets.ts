import { ec } from './cryptography'

const MINT_PRIVATE_ADDRESS =
    '0700a1ad28a20e5b2a517c00242d3e25a88d84bf54dce9e1733e6096e6d6495e'
export const MINT_KEY_PAIR = ec.keyFromPrivate(MINT_PRIVATE_ADDRESS, 'hex')
export const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic('hex')
