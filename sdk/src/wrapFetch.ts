// sdk/src/wrapFetch.ts
// Wraps fetch to automatically generate receipts

import { v4 as uuidv4 } from 'uuid';
import { Receipt, UnsignedReceipt, AgentConfig } from './types';
import { signReceipt, computeReceiptHash } from './sign';
import { sha256, sha256Bytes } from './hash';
import { StorageClient, persistReceipt } from './storage';

/**
 * State for tracking receipt chain
 */
let lastReceiptHash = '0x0';
let receiptCount = 0;

/**
 * Reset chain state (for testing)
 */
export function resetChain(): void {
  lastReceiptHash = '0x0';
  receiptCount = 0;
}

/**
 * Get current chain state
 */
export function getChainState(): { lastReceiptHash: string; receiptCount: number } {
  return { lastReceiptHash, receiptCount };
}

/**
 * Extract first 500 UTF-8 safe characters
 */
function getExcerpt(text: string, maxLength: number = 500): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength);
}

/**
 * Filter sensitive headers
 */
function filterHeaders(headers: Record<string, string>): Record<string, string> {
  const sensitivePatterns = [
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'proxy-authorization',
    'bearer',
    'secret',
    'token',
  ];
  
  const filtered: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitivePatterns.some(
      pattern => lowerKey.includes(pattern)
    );
    if (!isSensitive) {
      filtered[key] = value;
    }
  }
  
  return filtered;
}

/**
 * Create a wrapped fetch that generates receipts
 */
export function createTrackedFetch(config: AgentConfig, storageClient?: StorageClient) {

  return async function trackedFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<{ response: Response; receipt: Receipt }> {
    
    const method = options.method || 'GET';
    const body = options.body?.toString() || null;
    
    // 1. Execute the real fetch
    const response = await fetch(url, options);
    
    // 2. Get response body
    const responseBuffer = await response.arrayBuffer();
    const responseBytes = Buffer.from(responseBuffer);
    const responseText = responseBytes.toString('utf-8');
    
    // 3. Build unsigned receipt
    const unsignedReceipt: UnsignedReceipt = {
      receipt_id: uuidv4(),
      agent_pubkey: config.publicKey,
      prev_receipt_hash: lastReceiptHash,
      task_id: config.taskId,
      timestamp: Date.now(),
      tool_url: url,
      tool_method: method,
      tool_request_hash: body ? sha256(body) : '0x0',
      tool_response_hash: sha256Bytes(responseBytes),
      tool_response_status: response.status,
      tool_response_excerpt: getExcerpt(responseText),
    };
    
    // 4. Sign it
    const signature = await signReceipt(unsignedReceipt, config.privateKey);
    
    // 5. Create full receipt
    const receipt: Receipt = {
      ...unsignedReceipt,
      signature,
    };
    
    // 6. Update chain state
    lastReceiptHash = computeReceiptHash(receipt);
    receiptCount++;

    // 7. Persist to 0G Storage if client provided
    if (storageClient) {
      await persistReceipt(receipt, storageClient);
    }

    // 8. Return both response and receipt
    // (We recreate response since we consumed the body)
    const newResponse = new Response(responseBytes, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    
    return { response: newResponse, receipt };
  };
}

/**
 * Simple wrapper that just returns response (receipts stored elsewhere)
 */
export function wrapFetch(config: AgentConfig, onReceipt?: (receipt: Receipt) => void) {
  const trackedFetch = createTrackedFetch(config);
  
  return async function(url: string, options: RequestInit = {}): Promise<Response> {
    const { response, receipt } = await trackedFetch(url, options);
    
    // Call receipt handler if provided
    if (onReceipt) {
      onReceipt(receipt);
    }
    
    return response;
  };
}