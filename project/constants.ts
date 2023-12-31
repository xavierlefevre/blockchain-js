import { ec } from './helper';

export const MINT_KEY_PAIR = ec.genKeyPair();
export const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic('hex');

export const holderKeyPair = ec.genKeyPair();
export const girlfriendWallet = ec.genKeyPair();