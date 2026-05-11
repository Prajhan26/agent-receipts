import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "../.env") });
import express from "express";
import { anchorBatch, Receipt } from "./anchor";

const app = express();
app.use(express.json());

const PORT = process.env.PORT ?? "3000";

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/anchor", async (req, res) => {
  const { receipts } = req.body as { receipts: Receipt[] };

  if (!Array.isArray(receipts) || receipts.length === 0) {
    res.status(400).json({ error: "receipts must be a non-empty array" });
    return;
  }

  try {
    const result = await anchorBatch(receipts);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[anchor] error:", message);
    res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`anchor-service listening on port ${PORT}`);
});
