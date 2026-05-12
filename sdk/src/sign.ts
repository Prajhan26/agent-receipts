// sdk/src/sign.ts
// Ed25519 signing and verification

import * as ed from '@noble/ed25519';
import { toCanonicalJson } from './canonicalJson';
import { sha256 } from './hash';
import { Receipt, UnsignedReceipt } from './types';

export async function generateKeypair(): Promise<{ privateKey: string; publicKey: string }> {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);

  return {
    privateKey: Buffer.from(privateKey).toString('hex'),
    publicKey: Buffer.from(publicKey).toString('hex'),
  };
}

export async function signReceipt(
  unsignedReceipt: UnsignedReceipt,
  privateKeyHex: string
): Promise<string> {
  const canonical = toCanonicalJson(unsignedReceipt);
  const msgBytes = new TextEncoder().encode(canonical);
  const privateKey = Buffer.from(privateKeyHex, 'hex');
  const signature = await ed.signAsync(msgBytes, privateKey);
  return Buffer.from(signature).toString('hex');
}

export async function verifySignature(receipt: Receipt): Promise<boolean> {
  try {
    const { signature: sigHex, ...unsignedReceipt } = receipt;
    const canonical = toCanonicalJson(unsignedReceipt);
    const msgBytes = new TextEncoder().encode(canonical);
    const signature = Buffer.from(sigHex, 'hex');
    const publicKey = Buffer.from(receipt.agent_pubkey, 'hex');
    return await ed.verifyAsync(signature, msgBytes, publicKey);
  } catch {
    return false;
  }
}

// Computes the receipt hash used for chaining (prev_receipt_hash of the next receipt)
export function computeReceiptHash(receipt: Receipt): string {
  const { signature: _sig, ...unsignedReceipt } = receipt;
  return sha256(toCanonicalJson(unsignedReceipt));
}
