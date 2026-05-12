"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────────────

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

type VerifyResult = {
  url_valid: boolean;
  signature_valid: boolean;
  chain_valid: boolean;
  anchor_valid: boolean;
  overall: boolean;
  detail: string;
};

type StoredEntry = {
  receipt: Receipt;
  batch_id: string;
  tx_hash: string;
  block_number: number;
  merkle_proof: string[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const ANCHOR_URL =
  process.env.NEXT_PUBLIC_ANCHOR_SERVICE_URL ?? "https://agent-receipts-anchor.onrender.com";

const CONTRACT_ADDRESS = "0xcB33A8b65a599767301DcA89a8EdB15e8c4465E3";

// ── Helpers ───────────────────────────────────────────────────────────────────

function shorten(str: string, head = 8, tail = 6): string {
  if (str.length <= head + tail + 3) return str;
  return `${str.slice(0, head)}…${str.slice(-tail)}`;
}

async function callVerify(
  receipt: Receipt,
  batch_id: string,
  merkle_proof: string[]
): Promise<VerifyResult> {
  const res = await fetch(`${ANCHOR_URL}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ receipt, batch_id, merkle_proof }),
  });
  return res.json() as Promise<VerifyResult>;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CheckPill({ label, pass }: { label: string; pass: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        pass
          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      }`}
    >
      {pass ? "✓" : "✗"} {label}
    </span>
  );
}

function TrustBadge({ result }: { result: VerifyResult | null }) {
  if (!result) {
    return (
      <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        UNVERIFIED
      </span>
    );
  }
  return result.overall ? (
    <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-900/40 dark:text-green-400">
      TRUSTED
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 dark:bg-red-900/40 dark:text-red-400">
      TAMPERED
    </span>
  );
}

function ReceiptCard({ entry, index }: { entry: StoredEntry; index: number }) {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runVerify() {
    setLoading(true);
    setResult(null);
    try {
      setResult(
        await callVerify(entry.receipt, entry.batch_id, entry.merkle_proof)
      );
    } catch {
      setResult({
        url_valid: false,
        signature_valid: false,
        chain_valid: false,
        anchor_valid: false,
        overall: false,
        detail: "Failed to reach anchor service",
      });
    } finally {
      setLoading(false);
    }
  }

  const { receipt } = entry;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="break-all text-sm font-mono">
              #{index + 1} {receipt.tool_url}
            </CardTitle>
            <CardDescription className="mt-1 font-mono text-xs">
              {receipt.receipt_id}
            </CardDescription>
          </div>
          <TrustBadge result={result} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-lg bg-muted/50 p-3 text-xs font-mono">
          <span className="font-semibold text-foreground">hash</span>
          <span className="break-all text-muted-foreground">
            {receipt.tool_response_hash}
          </span>
          <span className="font-semibold text-foreground">batch</span>
          <span className="text-muted-foreground">{shorten(entry.batch_id)}</span>
          <span className="font-semibold text-foreground">tx</span>
          <span className="text-muted-foreground">
            <a
              href={`https://chainscan.0g.ai/tx/${entry.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              {shorten(entry.tx_hash)}
            </a>
          </span>
          <span className="font-semibold text-foreground">block</span>
          <span className="text-muted-foreground">{entry.block_number}</span>
        </div>
        {result && (
          <>
            <div className="flex flex-wrap gap-1.5">
              <CheckPill label="URL hash" pass={result.url_valid} />
              <CheckPill label="Signature" pass={result.signature_valid} />
              <CheckPill label="Chain" pass={result.chain_valid} />
              <CheckPill label="On-chain" pass={result.anchor_valid} />
            </div>
            <p className="text-xs font-mono text-muted-foreground">
              {result.detail}
            </p>
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button size="sm" onClick={runVerify} disabled={loading}>
          {loading ? "Verifying…" : "Verify Receipt"}
        </Button>
      </CardFooter>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [receipts, setReceipts] = useState<StoredEntry[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [tamperResult, setTamperResult] = useState<VerifyResult | null>(null);
  const [tamperLoading, setTamperLoading] = useState(false);

  useEffect(() => {
    fetch(`${ANCHOR_URL}/receipts`)
      .then((r) => r.json())
      .then((data) => setReceipts(data as StoredEntry[]))
      .catch((e: Error) => setFetchError(e.message))
      .finally(() => setFetchLoading(false));
  }, []);

  async function runTamperDemo() {
    if (!receipts[0]) return;
    setTamperLoading(true);
    setTamperResult(null);
    const tampered: Receipt = {
      ...receipts[0].receipt,
      tool_response_hash:
        "0000000000000000000000000000000000000000000000000000000000000000",
    };
    try {
      setTamperResult(
        await callVerify(tampered, receipts[0].batch_id, receipts[0].merkle_proof)
      );
    } catch {
      setTamperResult({
        url_valid: false,
        signature_valid: false,
        chain_valid: false,
        anchor_valid: false,
        overall: false,
        detail: "Failed to reach anchor service",
      });
    } finally {
      setTamperLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">AgentReceipts</h1>
          <p className="mt-2 text-muted-foreground">
            Tamper-proof receipts for AI agent tool calls, anchored on{" "}
            <a
              href={`https://chainscan.0g.ai/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              0G Chain
            </a>
          </p>
          <p className="mt-1 text-xs font-mono text-muted-foreground">
            Contract:{" "}
            <a
              href={`https://chainscan.0g.ai/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              {CONTRACT_ADDRESS}
            </a>
          </p>
        </div>

        {/* Receipt list */}
        <div className="space-y-4 mb-10">
          <h2 className="text-lg font-semibold">Receipts</h2>

          {fetchLoading && (
            <p className="text-sm text-muted-foreground">Loading receipts…</p>
          )}
          {fetchError && (
            <p className="text-sm text-destructive">
              Could not reach anchor service: {fetchError}
            </p>
          )}
          {!fetchLoading && !fetchError && receipts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No receipts yet. Run{" "}
              <code className="text-xs">cd examples && npm run e2e</code> to
              generate receipts.
            </p>
          )}

          {receipts.map((entry, i) => (
            <ReceiptCard
              key={entry.receipt.receipt_id}
              entry={entry}
              index={i}
            />
          ))}
        </div>

        {/* Tamper Demo */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Tamper Demo</h2>
          <Card>
            <CardHeader>
              <CardTitle>Simulate Receipt Tampering</CardTitle>
              <CardDescription>
                {receipts[0] ? (
                  <>
                    Takes receipt #1 and replaces its{" "}
                    <code className="text-xs">tool_response_hash</code> with
                    all-zeros — simulating an agent that modified its receipt
                    after the fact. The URL hash check should catch this.
                  </>
                ) : (
                  "Run the e2e test first to load a receipt for tampering."
                )}
              </CardDescription>
            </CardHeader>
            {receipts[0] && (
              <CardContent className="space-y-3">
                <div className="rounded-lg border border-dashed border-destructive/50 bg-destructive/5 p-3 text-xs font-mono text-muted-foreground">
                  <span className="font-semibold text-destructive">
                    tampered:{" "}
                  </span>
                  tool_response_hash ={" "}
                  <span className="text-destructive font-semibold">
                    0000000000000000000000000000000000000000000000000000000000000000
                  </span>
                </div>
                {tamperResult && (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      <CheckPill label="URL hash" pass={tamperResult.url_valid} />
                      <CheckPill
                        label="Signature"
                        pass={tamperResult.signature_valid}
                      />
                      <CheckPill label="Chain" pass={tamperResult.chain_valid} />
                      <CheckPill
                        label="On-chain"
                        pass={tamperResult.anchor_valid}
                      />
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">
                      {tamperResult.detail}
                    </p>
                    <div
                      className={`rounded-lg p-3 text-sm font-semibold ${
                        tamperResult.overall
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {tamperResult.overall
                        ? "TRUSTED — tamper not detected (unexpected)"
                        : "TAMPERED — receipt rejected"}
                    </div>
                  </>
                )}
              </CardContent>
            )}
            <CardFooter>
              <Button
                variant="destructive"
                size="sm"
                onClick={runTamperDemo}
                disabled={tamperLoading || !receipts[0]}
              >
                {tamperLoading ? "Running…" : "Run Tamper Demo"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
