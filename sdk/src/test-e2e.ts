// sdk/src/test-e2e.ts
// End-to-end test: fetch → sign → upload to 0G → download → verify
// Requires: ZEROG_PRIVATE_KEY env var (funded mainnet wallet)

import { createTrackedFetch, resetChain } from './wrapFetch';
import { generateKeypair } from './sign';
import { verifyReceipt } from './verify';
import { initStorage, persistReceipt, downloadReceipt } from './storage';

async function testE2E() {
  const privateKey = process.env.ZEROG_PRIVATE_KEY;
  if (!privateKey) {
    console.error('Set ZEROG_PRIVATE_KEY env var before running this test');
    process.exit(1);
  }

  console.log('=== AgentReceipts E2E Test ===\n');

  // 1. Keypair
  console.log('1. Generating agent keypair...');
  const { privateKey: agentPrivKey, publicKey: agentPubKey } = await generateKeypair();
  console.log('   Agent pubkey:', agentPubKey.slice(0, 16) + '...');

  // 2. Init 0G storage client
  console.log('\n2. Connecting to 0G Storage...');
  const storageClient = initStorage(privateKey);
  console.log('   Connected to https://evmrpc.0g.ai');

  // 3. Fetch a URL and capture receipt
  console.log('\n3. Fetching URL with receipt tracking...');
  resetChain();
  const config = {
    privateKey: agentPrivKey,
    publicKey: agentPubKey,
    taskId: `e2e-test-${Date.now()}`,
    storageEndpoint: 'https://indexer-storage-turbo.0g.ai',
  };
  const trackedFetch = createTrackedFetch(config);

  const { response, receipt } = await trackedFetch('https://httpbin.org/json');
  console.log('   HTTP status:', response.status);
  console.log('   Receipt ID:', receipt.receipt_id);
  console.log('   Response hash:', receipt.tool_response_hash.slice(0, 16) + '...');

  // 4. Verify signature locally
  console.log('\n4. Verifying signature locally...');
  const localResult = await verifyReceipt(receipt);
  console.log('   Signature valid:', localResult.verified);
  if (!localResult.verified) throw new Error('Local verification failed — not uploading');

  // 5. Upload to 0G Storage
  console.log('\n5. Uploading receipt to 0G Storage Log...');
  const uploadResult = await persistReceipt(receipt, storageClient);
  console.log('   TX hash:', uploadResult.txHash);
  console.log('   Root hash:', uploadResult.rootHash);
  console.log('   (Root hash is your permanent receipt address on 0G)');

  // 6. Download back from 0G
  console.log('\n6. Downloading receipt back from 0G...');
  const downloaded = await downloadReceipt(uploadResult.rootHash, storageClient);
  console.log('   Downloaded receipt ID:', downloaded.receipt_id);
  const idsMatch = downloaded.receipt_id === receipt.receipt_id;
  console.log('   Receipt IDs match:', idsMatch);

  // 7. Verify the downloaded receipt
  console.log('\n7. Verifying downloaded receipt...');
  const downloadedResult = await verifyReceipt(downloaded);
  console.log('   Verified:', downloadedResult.verified);

  if (!idsMatch || !downloadedResult.verified) {
    throw new Error('E2E test failed — receipt round-trip broken');
  }

  console.log('\n=== All E2E tests passed ===');
  console.log(`\nReceipt permanently stored on 0G:`);
  console.log(`  Root hash: ${uploadResult.rootHash}`);
  console.log(`  TX:        ${uploadResult.txHash}`);
}

testE2E().catch(console.error);
