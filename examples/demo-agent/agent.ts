// examples/demo-agent/agent.ts
// Dogfood agent: fetches real URLs, generates chained receipts, uploads to 0G Storage.
// Outputs receipts.json for Hari's anchor service to consume.

import 'dotenv/config';
import fs from 'fs';
import {
  generateKeypair,
  createTrackedFetch,
  resetChain,
  initStorage,
  persistReceipt,
} from '../../sdk/src/index';
import type { Receipt } from '../../sdk/src/index';

const URLS = [
  'https://httpbin.org/json',
  'https://jsonplaceholder.typicode.com/todos/1',
  'https://jsonplaceholder.typicode.com/posts/1',
  'https://httpbin.org/uuid',
  'https://jsonplaceholder.typicode.com/users/1',
];

async function main() {
  // ── 1. Check required env ─────────────────────────────────────────────────
  const zerogKey = process.env.ZEROG_PRIVATE_KEY;
  if (!zerogKey) {
    console.error('ERROR: ZEROG_PRIVATE_KEY not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }

  // ── 2. Agent keypair ──────────────────────────────────────────────────────
  let privateKey: string;
  let publicKey: string;

  if (process.env.AGENT_PRIVATE_KEY && process.env.AGENT_PUBLIC_KEY) {
    privateKey = process.env.AGENT_PRIVATE_KEY;
    publicKey = process.env.AGENT_PUBLIC_KEY;
    console.log('Using agent keypair from env');
  } else {
    ({ privateKey, publicKey } = await generateKeypair());
    console.log('Generated fresh agent keypair (add to .env to reuse):');
    console.log('  AGENT_PRIVATE_KEY=' + privateKey);
    console.log('  AGENT_PUBLIC_KEY=' + publicKey);
  }
  console.log('  Agent pubkey:', publicKey.slice(0, 16) + '...\n');

  // ── 3. Storage client + tracked fetch ─────────────────────────────────────
  // storageClient is NOT passed to createTrackedFetch — we call persistReceipt
  // manually so we can capture rootHash + txHash per upload.
  const storageClient = initStorage(zerogKey);
  const agentConfig = {
    privateKey,
    publicKey,
    taskId: 'demo-agent-run',
    storageEndpoint: '',
  };

  resetChain();
  const trackedFetch = createTrackedFetch(agentConfig);

  // ── 4. Fetch URLs, sign receipts, upload each to 0G ───────────────────────
  const receipts: Receipt[] = [];
  const uploads: Array<{ receipt_id: string; rootHash: string; txHash: string }> = [];

  console.log(`Fetching ${URLS.length} URLs...\n`);

  for (let i = 0; i < URLS.length; i++) {
    const url = URLS[i];
    process.stdout.write(`[${i + 1}/${URLS.length}] ${url}\n`);

    try {
      const { receipt, response } = await trackedFetch(url);
      receipts.push(receipt);
      console.log('  receipt_id   :', receipt.receipt_id);
      console.log('  status       :', response.status);
      console.log('  response_hash:', receipt.tool_response_hash.slice(0, 16) + '...');

      process.stdout.write('  uploading to 0G Storage... ');
      const { rootHash, txHash } = await persistReceipt(receipt, storageClient);
      uploads.push({ receipt_id: receipt.receipt_id, rootHash, txHash });
      console.log('done');
      console.log('  rootHash     :', rootHash);
      console.log('  txHash       :', txHash);
    } catch (err: any) {
      console.error('  FAILED:', err.message);
    }

    console.log();
  }

  // ── 5. Save receipts.json ─────────────────────────────────────────────────
  const outputPath = './receipts.json';
  fs.writeFileSync(outputPath, JSON.stringify(receipts, null, 2));
  console.log(`Saved ${receipts.length} receipts → ${outputPath}`);
  console.log('Share receipts.json with Hari to test the anchor service.\n');

  // ── 6. Summary ────────────────────────────────────────────────────────────
  console.log('=== Summary ===');
  console.log('Agent pubkey :', publicKey);
  console.log('Task ID      :', agentConfig.taskId);
  console.log('Receipts     :', receipts.length);
  console.log('Uploaded     :', uploads.length);
  console.log('\nReceipt IDs + root hashes:');
  uploads.forEach((u, i) =>
    console.log(`  [${i + 1}] ${u.receipt_id}\n       rootHash: ${u.rootHash}`)
  );
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
