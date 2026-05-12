// sdk/src/test-sign.ts
import { generateKeypair, signReceipt, verifySignature, computeReceiptHash } from './sign';
import { UnsignedReceipt, Receipt } from './types';
import { v4 as uuidv4 } from 'uuid';

async function testSigning() {
  console.log('Generating keypair...');
  const { privateKey, publicKey } = await generateKeypair();
  console.log('Private key:', privateKey.slice(0, 16) + '...');
  console.log('Public key:', publicKey.slice(0, 16) + '...');

  const unsignedReceipt: UnsignedReceipt = {
    receipt_id: uuidv4(),
    agent_pubkey: publicKey,
    prev_receipt_hash: '0x0',
    task_id: 'test-task-001',
    timestamp: Date.now(),
    tool_url: 'https://example.com/api',
    tool_method: 'GET',
    tool_request_hash: '0x0',
    tool_response_hash: 'abc123def456',
    tool_response_status: 200,
    tool_response_excerpt: 'Hello World',
  };

  console.log('\nSigning receipt...');
  const signature = await signReceipt(unsignedReceipt, privateKey);
  console.log('Signature:', signature.slice(0, 32) + '...');

  const receipt: Receipt = { ...unsignedReceipt, signature };

  console.log('\nVerifying signature...');
  const isValid = await verifySignature(receipt);
  console.log('Valid:', isValid);

  console.log('\nComputing receipt hash...');
  const hash = computeReceiptHash(receipt);
  console.log('Hash:', hash);

  console.log('\nTesting tamper detection...');
  const tamperedReceipt = { ...receipt, tool_url: 'https://evil.com' };
  const isTamperedValid = await verifySignature(tamperedReceipt);
  console.log('Tampered receipt valid:', isTamperedValid, '(should be false)');

  if (!isValid) throw new Error('Valid receipt failed verification');
  if (isTamperedValid) throw new Error('Tampered receipt passed verification');

  console.log('\nAll tests passed!');
}

testSigning().catch(console.error);
