import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "../.env") });
import express from "express";
import { anchorBatch, Receipt } from "./anchor";
import { verifyReceipt, VerifyInput } from "./verify";

type StoredEntry = {
  receipt: Receipt;
  batch_id: string;
  tx_hash: string;
  block_number: number;
  merkle_proof: string[];
};

const store: StoredEntry[] = [];

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3001",
  "http://localhost:3002",
  "https://agent-receipts.vercel.app",
]);

const app = express();

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json());

const PORT = process.env.PORT ?? "3000";

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/receipts", (_req, res) => {
  res.json(store);
});

app.post("/anchor", async (req, res) => {
  const { receipts } = req.body as { receipts: Receipt[] };

  if (!Array.isArray(receipts) || receipts.length === 0) {
    res.status(400).json({ error: "receipts must be a non-empty array" });
    return;
  }

  try {
    const result = await anchorBatch(receipts);
    receipts.forEach((receipt, i) => {
      store.push({
        receipt,
        batch_id: result.batch_id,
        tx_hash: result.tx_hash,
        block_number: result.block_number,
        merkle_proof: result.proofs[i],
      });
    });
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[anchor] error:", message);
    res.status(500).json({ error: message });
  }
});

app.post("/verify", async (req, res) => {
  const input = req.body as VerifyInput;

  if (!input?.receipt || !input?.batch_id || !Array.isArray(input?.merkle_proof)) {
    res.status(400).json({ error: "receipt, batch_id, and merkle_proof are required" });
    return;
  }

  try {
    const result = await verifyReceipt(input);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[verify] error:", message);
    res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`anchor-service listening on port ${PORT}`);
});
