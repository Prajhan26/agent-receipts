import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import canonicalize from "canonicalize";
import { MerkleTree } from "merkletreejs";
import { ethers } from "ethers";
import * as ed from "@noble/ed25519";
import { Receipt } from "./anchor";

// Wire Node's built-in SHA-512 into @noble/ed25519 v3
ed.hashes.sha512 = (msg: Uint8Array) =>
  createHash("sha512").update(msg).digest();

// ── Types ─────────────────────────────────────────────────────────────────────

export type VerifyInput = {
  receipt: Receipt;
  prev_receipt?: Receipt;
  batch_id: string;
  merkle_proof: string[];
};

export type VerifyResult = {
  url_valid: boolean;
  signature_valid: boolean;
  chain_valid: boolean;
  anchor_valid: boolean;
  overall: boolean;
  detail: string;
};

// ── Config ────────────────────────────────────────────────────────────────────

const DEPLOYMENT = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../../contract/deployments/0g-mainnet.json"),
    "utf8"
  )
);

const RPC_URL = "https://evmrpc.0g.ai";

const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

// sha256 for merkletreejs — must match what anchor.ts used when building the tree
const sha256 = (data: Buffer): Buffer =>
  createHash("sha256").update(data).digest();

// ── Helpers ───────────────────────────────────────────────────────────────────

// receipt_hash = SHA-256(canonical_json(receipt_without_signature))
function hashReceipt(receipt: Receipt): string {
  const { signature: _sig, ...withoutSig } = receipt;
  return createHash("sha256")
    .update(canonicalize(withoutSig)!)
    .digest("hex");
}

// ── Core verify function ──────────────────────────────────────────────────────

export async function verifyReceipt(input: VerifyInput): Promise<VerifyResult> {
  const { receipt, prev_receipt, batch_id, merkle_proof } = input;
  const parts: string[] = [];

  // 1. Re-fetch tool_url and compare SHA-256 of response body to tool_response_hash
  let url_valid = false;
  try {
    const res = await fetch(receipt.tool_url);
    const body = await res.arrayBuffer();
    const refetchHash = createHash("sha256")
      .update(Buffer.from(body))
      .digest("hex");
    url_valid = refetchHash === receipt.tool_response_hash;
    parts.push(`url:${url_valid ? "PASS" : "FAIL(hash mismatch)"}`);
  } catch (err) {
    parts.push(`url:FAIL(${(err as Error).message})`);
  }

  // 2. Verify ed25519 signature over canonical JSON of receipt without agent_signature
  let signature_valid = false;
  try {
    const { signature, ...withoutSig } = receipt;
    const msgBytes = Buffer.from(canonicalize(withoutSig)!);
    signature_valid = ed.verify(
      Buffer.from(signature, "hex"),
      msgBytes,
      Buffer.from(receipt.agent_pubkey, "hex")
    );
    parts.push(`sig:${signature_valid ? "PASS" : "FAIL(invalid)"}`);
  } catch (err) {
    parts.push(`sig:FAIL(${(err as Error).message})`);
  }

  // 3. Verify chain: prev_receipt_hash must equal SHA-256 of the previous receipt
  let chain_valid = false;
  if (receipt.prev_receipt_hash === ZERO_HASH || receipt.prev_receipt_hash === "0x0") {
    chain_valid = true;
    parts.push("chain:PASS(first in chain)");
  } else if (!prev_receipt) {
    parts.push("chain:FAIL(prev_receipt not provided)");
  } else {
    const prevHash = hashReceipt(prev_receipt);
    chain_valid = prevHash === receipt.prev_receipt_hash;
    parts.push(`chain:${chain_valid ? "PASS" : "FAIL(hash mismatch)"}`);
  }

  // 4. Verify on-chain anchor: getBatchRoot → verify Merkle proof
  let anchor_valid = false;
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(
      DEPLOYMENT.address,
      DEPLOYMENT.abi,
      provider
    );
    const onChainRoot: string = await contract.getBatchRoot(
      "0x" + batch_id.replace(/^0x/, "")
    );

    if (onChainRoot === ZERO_HASH || onChainRoot === ethers.ZeroHash) {
      parts.push("anchor:FAIL(batch not anchored on-chain)");
    } else {
      const leaf = Buffer.from(hashReceipt(receipt), "hex");
      const rootBuffer = Buffer.from(onChainRoot.replace(/^0x/, ""), "hex");
      const proofBuffers = merkle_proof.map((p) =>
        Buffer.from(p.replace(/^0x/, ""), "hex")
      );
      const tree = new MerkleTree([], sha256, { sortPairs: true });
      anchor_valid = tree.verify(proofBuffers, leaf, rootBuffer);
      parts.push(`anchor:${anchor_valid ? "PASS" : "FAIL(proof invalid)"}`);
    }
  } catch (err) {
    parts.push(`anchor:FAIL(${(err as Error).message})`);
  }

  const overall = url_valid && signature_valid && chain_valid && anchor_valid;

  return {
    url_valid,
    signature_valid,
    chain_valid,
    anchor_valid,
    overall,
    detail: parts.join(" | "),
  };
}
