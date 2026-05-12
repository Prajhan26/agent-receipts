// sdk/src/test-verify.ts
// Test verification logic

import { createTrackedFetch, resetChain } from './wrapFetch';
import { generateKeypair } from './sign';
import { verifyReceipt, verifyReceiptChain } from './verify';
import { Receipt } from './types';

async function testVerify() {
  console.log('🔑 Generating keypair...');
  const { privateKey, publicKey } = await generateKeypair();
  
  resetChain();
  
  const config = {
    privateKey,
    publicKey,
    taskId: 'test-task-001',
    storageEndpoint: 'http://localhost:3000',
  };
  
  const trackedFetch = createTrackedFetch(config);
  
  // Create some receipts
  const testUrl = 'https://httpbin.org/json';
  
  console.log('\n📡 Creating receipts...');
  
  const { receipt: receipt1 } = await trackedFetch(testUrl);
  console.log('   Receipt 1 created');
  
  const { receipt: receipt2 } = await trackedFetch(testUrl);
  console.log('   Receipt 2 created');
  
  const { receipt: receipt3 } = await trackedFetch(testUrl);
  console.log('   Receipt 3 created');
  
  // Test 1: Verify single receipt (signature only)
  console.log('\n✅ Test 1: Verify signature');
  const result1 = await verifyReceipt(receipt1);
  console.log('   Verified:', result1.verified);
  console.log('   Signature valid:', result1.details?.signature_valid);
  
  // Test 2: Verify with refetch
  console.log('\n✅ Test 2: Verify with refetch');
  const result2 = await verifyReceipt(receipt1, { refetch: true });
  console.log('   Verified:', result2.verified);
  console.log('   Hash match:', result2.details?.response_hash_match);
  
  // Test 3: Verify chain
  console.log('\n✅ Test 3: Verify chain');
  const chainResult = await verifyReceiptChain([receipt1, receipt2, receipt3]);
  console.log('   Chain verified:', chainResult.verified);
  console.log('   All receipts valid:', chainResult.results.every(r => r.verified));
  
  // Test 4: Tampered receipt (should fail)
  console.log('\n🔴 Test 4: Tampered receipt');
  const tamperedReceipt: Receipt = {
    ...receipt1,
    tool_url: 'https://evil.com/fake',
  };
  const tamperedResult = await verifyReceipt(tamperedReceipt);
  console.log('   Verified:', tamperedResult.verified, '(should be false)');
  console.log('   Reason:', tamperedResult.reason);
  
  // Test 5: Broken chain (should fail)
  console.log('\n🔴 Test 5: Broken chain');
  const brokenReceipt2: Receipt = {
    ...receipt2,
    prev_receipt_hash: 'wrong_hash_here',
    signature: receipt2.signature, // signature won't match now
  };
  // Re-sign wouldn't help because prev_receipt_hash is wrong
  const brokenChainResult = await verifyReceiptChain([receipt1, brokenReceipt2]);
  console.log('   Chain verified:', brokenChainResult.verified, '(should be false)');
  console.log('   Broken at index:', brokenChainResult.brokenAt);
  
  console.log('\n✅ All verification tests complete!');
}

testVerify().catch(console.error);