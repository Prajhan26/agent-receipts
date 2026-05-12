// sdk/src/storage.ts
// 0G Storage Log uploads and KV index management

import { Indexer, MemData, KvClient, Batcher, getFlowContract } from '@0gfoundation/0g-storage-ts-sdk';
import { ethers } from 'ethers';
import { Receipt, AgentRecord } from './types';
import { sha256 } from './hash';

const DEFAULT_CONFIG = {
  evmRpc: process.env.ZEROG_EVM_RPC || 'https://evmrpc.0g.ai',
  storageIndexer: process.env.ZEROG_STORAGE_INDEXER || 'https://indexer-storage-turbo.0g.ai',
  chainId: 16661,
  flowContract: '0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526',
  kvNode: process.env.ZEROG_KV_NODE || 'http://mainnet-kv.0g.ai:6789',
};

// Fixed stream ID for all AgentReceipts KV data (SHA-256 of "agentreceipts" = bytes32)
const STREAM_ID = '0x' + sha256('agentreceipts');

export type StorageClient = {
  indexer: Indexer;
  signer: ethers.Wallet;
};

export type UploadResult = {
  txHash: string;
  rootHash: string;
};

export function initStorage(privateKey: string): StorageClient {
  const provider = new ethers.JsonRpcProvider(DEFAULT_CONFIG.evmRpc);
  const signer = new ethers.Wallet(privateKey, provider);
  const indexer = new Indexer(DEFAULT_CONFIG.storageIndexer);
  return { indexer, signer };
}

/**
 * Upload a receipt as JSON to 0G Storage Log.
 * Returns txHash + rootHash. Store rootHash to retrieve the receipt later.
 */
export async function uploadReceipt(
  receipt: Receipt,
  client: StorageClient
): Promise<UploadResult> {
  const json = JSON.stringify(receipt);
  const bytes = new TextEncoder().encode(json);
  const memData = new MemData(bytes);

  // merkleTree() must be called before upload — populates internal state
  const [, treeErr] = await memData.merkleTree();
  if (treeErr) throw new Error(`Merkle tree failed: ${treeErr.message}`);

  // signer cast: SDK expects ethers v5 types, we use v6 — runtime compatible
  const [result, err] = await client.indexer.upload(memData, DEFAULT_CONFIG.evmRpc, client.signer as any);
  if (err) throw new Error(`0G upload failed: ${err.message}`);

  // upload returns {rootHash,txHash} for single files or {rootHashes[],txHashes[]} for >4GB
  if ('rootHash' in result) {
    return { txHash: result.txHash, rootHash: result.rootHash };
  }
  return { txHash: result.txHashes[0], rootHash: result.rootHashes[0] };
}

/**
 * Download a receipt from 0G Storage Log by rootHash.
 */
export async function downloadReceipt(
  rootHash: string,
  client: StorageClient
): Promise<Receipt> {
  const [blob, err] = await client.indexer.downloadToBlob(rootHash);
  if (err) throw new Error(`0G download failed: ${err.message}`);

  const text = await blob.text();
  return JSON.parse(text) as Receipt;
}

// ─── KV Index Functions ───────────────────────────────────────────────────────
// These manage the fast-lookup indexes in 0G Storage KV.
// Requires DEFAULT_CONFIG.kvNode env var (mainnet KV node URL — ask 0G Telegram).

function kvKey(key: string): Uint8Array {
  return new TextEncoder().encode(key);
}

function kvVal(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}

async function kvWrite(
  entries: Array<{ key: string; value: unknown }>,
  client: StorageClient
): Promise<string> {
  const [nodes, err] = await client.indexer.selectNodes(1);
  if (err) throw new Error(`Node selection failed: ${err.message}`);

  const flow = getFlowContract(DEFAULT_CONFIG.flowContract, client.signer);
  const batcher = new Batcher(1, nodes, flow, DEFAULT_CONFIG.evmRpc);

  for (const { key, value } of entries) {
    batcher.streamDataBuilder.set(STREAM_ID, kvKey(key), kvVal(value));
  }

  const [result, batchErr] = await batcher.exec();
  if (batchErr) throw new Error(`KV write failed: ${batchErr.message}`);
  return result.txHash;
}

async function kvRead(key: string): Promise<string | null> {
  if (!DEFAULT_CONFIG.kvNode) throw new Error('DEFAULT_CONFIG.kvNode not set — get mainnet KV node URL from 0G Telegram');
  const kvClient = new KvClient(DEFAULT_CONFIG.kvNode);
  const val = await kvClient.getValue(STREAM_ID, kvKey(key));
  if (!val) return null;
  return Buffer.from(val.data).toString('utf-8');
}

/**
 * Register or update an agent record in KV, and append receipt_id to agent's list.
 */
export async function updateAgentKV(
  receipt: Receipt,
  client: StorageClient
): Promise<void> {
  // Read current receipt list
  const listRaw = await kvRead(`agent:${receipt.agent_pubkey}:receipts`).catch(() => null);
  const receiptIds: string[] = listRaw ? JSON.parse(listRaw) : [];
  receiptIds.push(receipt.receipt_id);

  const agentRecord: AgentRecord = {
    agent_pubkey: receipt.agent_pubkey,
    registered_at: receiptIds.length === 1 ? receipt.timestamp : 0,
    latest_receipt_hash: receipt.receipt_id,
    receipt_count: receiptIds.length,
    task_count: 0, // tracked separately
  };

  await kvWrite([
    { key: `agent:${receipt.agent_pubkey}`, value: agentRecord },
    { key: `agent:${receipt.agent_pubkey}:receipts`, value: receiptIds },
  ], client);
}

/**
 * Append a receipt_id to a task's receipt list in KV.
 */
export async function updateTaskKV(
  receipt: Receipt,
  client: StorageClient
): Promise<void> {
  const listRaw = await kvRead(`task:${receipt.task_id}`).catch(() => null);
  const receiptIds: string[] = listRaw ? JSON.parse(listRaw) : [];
  receiptIds.push(receipt.receipt_id);

  await kvWrite([
    { key: `task:${receipt.task_id}`, value: receiptIds },
  ], client);
}

/**
 * Full persist: upload receipt to Storage Log + update all KV indexes.
 * This is the function wrapFetch.ts will call.
 */
export async function persistReceipt(
  receipt: Receipt,
  client: StorageClient
): Promise<UploadResult> {
  const result = await uploadReceipt(receipt, client);

  // KV updates are best-effort — timeout after 30s, don't fail the upload
  if (DEFAULT_CONFIG.kvNode) {
    const timeout = (ms: number) => new Promise<never>((_, r) => setTimeout(() => r(new Error('KV timeout')), ms));
    await Promise.race([updateAgentKV(receipt, client), timeout(30000)]).catch(console.error);
    await Promise.race([updateTaskKV(receipt, client), timeout(30000)]).catch(console.error);
  }

  return result;
}
