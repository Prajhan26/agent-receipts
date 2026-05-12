import fs from "node:fs";
import path from "node:path";

const ANCHOR_URL = "http://localhost:3000";

type Receipt = {
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

type AnchorResult = {
  batch_id: string;
  merkle_root: string;
  tx_hash: string;
  block_number: number;
  receipt_count: number;
  proofs: string[][];
};

type VerifyResult = {
  url_valid: boolean;
  signature_valid: boolean;
  chain_valid: boolean;
  anchor_valid: boolean;
  overall: boolean;
  detail: string;
};

async function main() {
  // 1. Read receipts
  const receiptsPath = path.join(__dirname, "demo-agent", "receipts.json");
  const receipts: Receipt[] = JSON.parse(fs.readFileSync(receiptsPath, "utf8"));
  console.log(`Loaded ${receipts.length} receipts from ${receiptsPath}\n`);

  // 2. Anchor all receipts as a single batch
  console.log("POST /anchor …");
  const anchorRes = await fetch(`${ANCHOR_URL}/anchor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ receipts }),
  });
  if (!anchorRes.ok) {
    throw new Error(`/anchor ${anchorRes.status}: ${await anchorRes.text()}`);
  }
  const anchorResult = (await anchorRes.json()) as AnchorResult;

  console.log("tx_hash:     ", anchorResult.tx_hash);
  console.log("batch_id:    ", anchorResult.batch_id);
  console.log("merkle_root: ", anchorResult.merkle_root);
  console.log("receipts:    ", anchorResult.receipt_count);
  console.log();

  // 3. Verify each receipt
  console.log("Verifying receipts…\n");

  for (let i = 0; i < receipts.length; i++) {
    const receipt = receipts[i];
    const merkle_proof = anchorResult.proofs[i];
    const prev_receipt = i > 0 ? receipts[i - 1] : undefined;

    const verifyRes = await fetch(`${ANCHOR_URL}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receipt,
        prev_receipt,
        batch_id: anchorResult.batch_id,
        merkle_proof,
      }),
    });

    if (!verifyRes.ok) {
      console.log(`[${i + 1}] ${receipt.tool_url}`);
      console.log(`     ERROR ${verifyRes.status}: ${await verifyRes.text()}\n`);
      continue;
    }

    const v = (await verifyRes.json()) as VerifyResult;
    const status = v.overall ? "PASS" : "FAIL";

    console.log(`[${i + 1}] ${receipt.tool_url}`);
    console.log(`     ${status}  url:${v.url_valid ? "✓" : "✗"}  sig:${v.signature_valid ? "✓" : "✗"}  chain:${v.chain_valid ? "✓" : "✗"}  anchor:${v.anchor_valid ? "✓" : "✗"}`);
    console.log(`     ${v.detail}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
