import { wrapFetch, generateKeypair } from "../sdk/src";
import type { Receipt } from "../sdk/src";

const ANCHOR_URL = "https://agent-receipts-anchor.onrender.com";
const TOOL_URL =
  "https://raw.githubusercontent.com/bitcoin/bitcoin/master/COPYING";

async function main() {
  // 1. Ephemeral keypair for this test run
  const { privateKey, publicKey } = await generateKeypair();
  console.log("agent_pubkey:", publicKey);

  // 2. Capture the receipt via wrapFetch callback
  let capturedReceipt: Receipt | null = null;

  const agentFetch = wrapFetch(
    { privateKey, publicKey, taskId: "e2e-test", storageEndpoint: "" },
    (receipt) => {
      capturedReceipt = receipt;
    }
  );

  // 3. Fetch the URL — produces a signed, chained receipt
  console.log("\nFetching:", TOOL_URL);
  await agentFetch(TOOL_URL);

  if (!capturedReceipt) throw new Error("No receipt captured from wrapFetch");
  const receipt = capturedReceipt as Receipt;
  console.log("receipt_id:", receipt.receipt_id);
  console.log("tool_response_hash:", receipt.tool_response_hash);

  // 4. Anchor the receipt on 0G mainnet
  console.log("\nPOST /anchor …");
  const anchorRes = await fetch(`${ANCHOR_URL}/anchor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ receipts: [receipt] }),
  });
  if (!anchorRes.ok) {
    throw new Error(`/anchor ${anchorRes.status}: ${await anchorRes.text()}`);
  }
  const anchorResult = await anchorRes.json() as {
    batch_id: string;
    merkle_root: string;
    tx_hash: string;
    block_number: number;
    receipt_count: number;
  };
  console.log("batch_id:", anchorResult.batch_id);
  console.log("tx_hash:", anchorResult.tx_hash);

  // 5. Verify — single-receipt batch so merkle_proof is empty
  console.log("\nPOST /verify …");
  const verifyRes = await fetch(`${ANCHOR_URL}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      receipt,
      batch_id: anchorResult.batch_id,
      merkle_proof: [],
    }),
  });
  if (!verifyRes.ok) {
    throw new Error(`/verify ${verifyRes.status}: ${await verifyRes.text()}`);
  }
  const verifyResult = await verifyRes.json() as {
    url_valid: boolean;
    signature_valid: boolean;
    chain_valid: boolean;
    anchor_valid: boolean;
    overall: boolean;
    detail: string;
  };

  console.log("\nVerify result:");
  console.log("  url_valid:       ", verifyResult.url_valid);
  console.log("  signature_valid: ", verifyResult.signature_valid);
  console.log("  chain_valid:     ", verifyResult.chain_valid);
  console.log("  anchor_valid:    ", verifyResult.anchor_valid);
  console.log("  overall:         ", verifyResult.overall);
  console.log("  detail:          ", verifyResult.detail);

  if (!verifyResult.overall) {
    console.error("\nFAIL — overall: false");
    process.exit(1);
  }

  console.log("\nPASS — overall: true");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
