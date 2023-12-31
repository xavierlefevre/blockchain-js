import * as crypto from 'crypto';
import { ec as EC } from 'elliptic';

export const ec = new EC('secp256k1');

export const SHA256 = (message: string): string =>
    crypto.createHash('sha256').update(message).digest('hex');