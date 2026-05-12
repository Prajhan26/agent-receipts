// sdk/src/verify.ts
// Verification logic for receipts

import { Receipt, VerificationResult } from './types';
import { verifySignature, computeReceiptHash } from './sign';
import { sha256Bytes } from './hash';

/**
 * Verify a single receipt
 * - Checks signature
 * - Optionally re-fetches URL to compare hash
 */
export async function verifyReceipt(
  receipt: Receipt,
  options: {
    refetch?: boolean;           // Re-fetch URL and compare hash
    prevReceipt?: Receipt;       // Previous receipt for chain verification
  } = {}
): Promise<VerificationResult> {
  
  const details = {
    signature_valid: false,
    chain_intact: true,
    response_hash_match: true,
    refetch_status: undefined as number | undefined,
    refetch_hash: undefined as string | undefined,
  };
  
  // 1. Verify signature
  details.signature_valid = await verifySignature(receipt);
  if (!details.signature_valid) {
    return {
      verified: false,
      reason: 'invalid_signature',
      details,
    };
  }
  
  // 2. Verify chain integrity (if previous receipt provided)
  if (options.prevReceipt) {
    const expectedPrevHash = computeReceiptHash(options.prevReceipt);
    details.chain_intact = receipt.prev_receipt_hash === expectedPrevHash;
    
    if (!details.chain_intact) {
      return {
        verified: false,
        reason: 'broken_chain',
        details,
      };
    }
  }
  
  // 3. Re-fetch URL and compare hash (if requested)
  if (options.refetch) {
    try {
      const response = await fetch(receipt.tool_url, {
        method: receipt.tool_method,
      });
      
      details.refetch_status = response.status;
      
      const responseBuffer = await response.arrayBuffer();
      const responseBytes = Buffer.from(responseBuffer);
      const refetchHash = sha256Bytes(responseBytes);
      
      details.refetch_hash = refetchHash;
      details.response_hash_match = refetchHash === receipt.tool_response_hash;
      
      if (!details.response_hash_match) {
        return {
          verified: false,
          reason: 'response_mismatch',
          details,
        };
      }
      
    } catch (error) {
      return {
        verified: false,
        reason: 'refetch_failed',
        details,
      };
    }
  }
  
  // All checks passed
  return {
    verified: true,
    details,
  };
}

/**
 * Verify a chain of receipts
 */
export async function verifyReceiptChain(
  receipts: Receipt[],
  options: { refetch?: boolean } = {}
): Promise<{
  verified: boolean;
  results: VerificationResult[];
  brokenAt?: number;
}> {
  const results: VerificationResult[] = [];
  
  for (let i = 0; i < receipts.length; i++) {
    const receipt = receipts[i];
    const prevReceipt = i > 0 ? receipts[i - 1] : undefined;
    
    const result = await verifyReceipt(receipt, {
      refetch: options.refetch,
      prevReceipt,
    });
    
    results.push(result);
    
    if (!result.verified) {
      return {
        verified: false,
        results,
        brokenAt: i,
      };
    }
  }
  
  return {
    verified: true,
    results,
  };
}