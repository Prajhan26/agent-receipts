// sdk/src/test-fetch.ts
// Test the wrapped fetch

import { createTrackedFetch, resetChain, getChainState } from './wrapFetch';
import { generateKeypair, verifySignature } from './sign';
import { Receipt } from './types';

async function testFetch() {
  console.log('🔑 Generating keypair...');
  const { privateKey, publicKey } = await generateKeypair();
  
  // Reset chain
  resetChain();
  
  // Create tracked fetch
  const config = {
    privateKey,
    publicKey,
    taskId: 'test-task-001',
    storageEndpoint: 'http://localhost:3000', // placeholder
  };
  
  const trackedFetch = createTrackedFetch(config);
  
  // Test URL - using a fast, reliable JSON API
  const testUrl = 'https://httpbin.org/json';
  
  console.log('\n📡 Fetching:', testUrl);
  console.log('(This may take a few seconds...)\n');
  
  try {
    // First fetch
    const { response: res1, receipt: receipt1 } = await trackedFetch(testUrl);
    
    console.log('✅ Fetch 1 complete');
    console.log('   Status:', res1.status);
    console.log('   Receipt ID:', receipt1.receipt_id);
    console.log('   Response hash:', receipt1.tool_response_hash.slice(0, 16) + '...');
    console.log('   Prev hash:', receipt1.prev_receipt_hash);
    console.log('   Excerpt:', receipt1.tool_response_excerpt.slice(0, 80) + '...');
    
    // Verify signature
    const isValid1 = await verifySignature(receipt1);
    console.log('   Signature valid:', isValid1);
    
    // Second fetch (to test chaining)
    console.log('\n📡 Fetching again (to test chaining)...\n');
    const { response: res2, receipt: receipt2 } = await trackedFetch(testUrl);
    
    console.log('✅ Fetch 2 complete');
    console.log('   Receipt ID:', receipt2.receipt_id);
    console.log('   Prev hash:', receipt2.prev_receipt_hash.slice(0, 16) + '...');
    console.log('   (Should match receipt 1 hash)');
    
    // Verify chain
    const isValid2 = await verifySignature(receipt2);
    console.log('   Signature valid:', isValid2);
    
    // Check chain state
    const state = getChainState();
    console.log('\n🔗 Chain state:');
    console.log('   Receipt count:', state.receiptCount);
    console.log('   Last hash:', state.lastReceiptHash.slice(0, 16) + '...');
    
    // Verify chaining is correct
    const { computeReceiptHash } = await import('./sign');
    const receipt1Hash = computeReceiptHash(receipt1);
    const chainingCorrect = receipt2.prev_receipt_hash === receipt1Hash;
    console.log('   Chaining correct:', chainingCorrect);
    
    console.log('\n✅ All fetch tests passed!');
    
  } catch (error) {
    console.error('❌ Fetch failed:', error);
  }
}

testFetch().catch(console.error);