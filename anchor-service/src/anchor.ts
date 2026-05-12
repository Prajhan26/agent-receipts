import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import canonicalize from "canonicalize";
import { MerkleTree } from "merkletreejs";
import { ethers } from "ethers";
import { Indexer, MemData, Batcher, getFlowContract } from "@0gfoundation/0g-storage-ts-sdk";

// ── Types from INTERFACES.md ──────────────────────────────────────────────────

export type Receipt = {
  receipt_id: string;
  agent_pubkey: string;
  prev_receipt_hash: string;
  task_id: string;
  timestamp: number;
  tool_url: string;
  tool_method: string;
  tool_request_hash: string;
  tool_response_hash: string;
  tool_response_status: number;
  tool_response_excerpt: string;
  signature: string;
};

type Batch = {
  batch_id: string;
  receipt_ids: string[];
  merkle_root: string;
  anchored_at: number;
  tx_hash: string;
  block_number: number;
};

export type AnchorResult = {
  batch_id: string;
  merkle_root: string;
  storage_root_hash: string;
  tx_hash: string;
  block_number: number;
  receipt_count: number;
  proofs: string[][];
};

// ── Config ────────────────────────────────────────────────────────────────────

const DEPLOYMENT = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../../contract/deployments/0g-mainnet.json"),
    "utf8"
  )
);

const RPC_URL = "https://evmrpc.0g.ai";
const INDEXER_URL = "https://indexer-storage-turbo.0g.ai";
const FLOW_CONTRACT = "0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526";
const STREAM_ID = "0x" + createHash("sha256").update("agent-receipts").digest("hex");

// ── Hashing helpers ───────────────────────────────────────────────────────────

// SHA-256 for merkletreejs (accepts and returns Buffer)
const sha256 = (data: Buffer): Buffer =>
  createHash("sha256").update(data).digest();

// receipt_hash = SHA-256(canonical_json(receipt_without_signature))
function hashReceipt(receipt: Receipt): string {
  const { signature: _sig, ...withoutSig } = receipt;
  return createHash("sha256")
    .update(canonicalize(withoutSig)!)
    .digest("hex");
}

// batch_id = SHA-256(canonical_json(sorted receipt_ids))
function computeBatchId(receiptIds: string[]): string {
  const sorted = [...receiptIds].sort();
  return createHash("sha256")
    .update(canonicalize(sorted)!)
    .digest("hex");
}

// ── Core anchor function ──────────────────────────────────────────────────────

export async function anchorBatch(receipts: Receipt[]): Promise<AnchorResult> {
  if (receipts.length === 0) throw new Error("receipts array is empty");

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error("PRIVATE_KEY env var not set");

  // 1. Compute receipt hashes
  const hashes = receipts.map(hashReceipt);

  // 2. Build Merkle tree over receipt hashes
  const leaves = hashes.map((h) => Buffer.from(h, "hex"));
  const tree = new MerkleTree(leaves, sha256, { sortPairs: true });
  const merkleRoot = tree.getRoot().toString("hex");
  const proofs = leaves.map((leaf) => tree.getHexProof(leaf));

  // 3. Compute batch_id from receipt_ids
  const receiptIds = receipts.map((r) => r.receipt_id);
  const batchId = computeBatchId(receiptIds);

  // 4. Call anchorBatch on ReceiptAnchor contract
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(
    DEPLOYMENT.address,
    DEPLOYMENT.abi,
    signer
  );

  const tx = await contract.anchorBatch(
    "0x" + batchId,
    "0x" + merkleRoot,
    BigInt(receipts.length)
  );
  const txReceipt = await tx.wait();

  // 5. Build Batch object per INTERFACES.md schema
  const batch: Batch = {
    batch_id: batchId,
    receipt_ids: receiptIds,
    merkle_root: merkleRoot,
    anchored_at: Date.now(),
    tx_hash: tx.hash,
    block_number: txReceipt.blockNumber,
  };

  // 6. Store batch JSON on 0G Storage, capture rootHash for KV
  const batchBytes = Buffer.from(JSON.stringify(batch));
  const memData = new MemData(batchBytes);
  const indexer = new Indexer(INDEXER_URL);
  const [uploadResult, uploadErr] = await indexer.upload(memData, RPC_URL, signer);
  if (uploadErr != null) throw new Error(`0G Storage upload failed: ${uploadErr.message}`);
  const storageRootHash: string =
    "rootHash" in uploadResult ? uploadResult.rootHash : uploadResult.rootHashes[0];

  // 7. Write to 0G KV (second on-chain tx)
  const [kvClients, kvErr] = await indexer.selectNodes(1, "min");
  if (kvErr != null) throw new Error(`Failed to select 0G nodes for KV: ${kvErr.message}`);
  const flow = getFlowContract(FLOW_CONTRACT, signer);
  const batcher = new Batcher(0, kvClients, flow, RPC_URL);

  batcher.streamDataBuilder.set(
    STREAM_ID,
    Buffer.from("batch:" + batchId),
    Buffer.from(
      JSON.stringify({
        merkle_root: merkleRoot,
        storage_root_hash: storageRootHash,
        tx_hash: tx.hash,
        receipt_ids: receiptIds,
      })
    )
  );
  for (const receiptId of receiptIds) {
    batcher.streamDataBuilder.set(
      STREAM_ID,
      Buffer.from("receipt:" + receiptId + ":batch"),
      Buffer.from(batchId)
    );
  }
  const [, kvExecErr] = await batcher.exec();
  if (kvExecErr != null) throw new Error(`0G KV write failed: ${kvExecErr.message}`);

  return {
    batch_id: batchId,
    merkle_root: merkleRoot,
    storage_root_hash: storageRootHash,
    tx_hash: tx.hash,
    block_number: txReceipt.blockNumber,
    receipt_count: receipts.length,
    proofs,
  };
}
