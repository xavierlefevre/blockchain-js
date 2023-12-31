import { ec } from './helper'

export const MINT_KEY_PAIR = ec.genKeyPair()
export const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic('hex')

export const xavierWallet = ec.genKeyPair()
export const lumaWallet = ec.genKeyPair()
export const minerWallet = ec.genKeyPair()
