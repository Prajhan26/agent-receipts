"use client";

import { useState } from "react";
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

type ReceiptEntry = {
  receipt: Receipt;
  label: string;
  description: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const ANCHOR_URL =
  process.env.NEXT_PUBLIC_ANCHOR_SERVICE_URL ?? "http://localhost:3000";

const CONTRACT_ADDRESS = "0xcB33A8b65a599767301DcA89a8EdB15e8c4465E3";

const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

const FAKE_PUBKEY =
  "a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1";

const FAKE_SIG =
  "a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1" +
  "a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1";

const MOCK_BATCH_ID =
  "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";

// Mock receipts — URLs verified May 11, 2026 (see examples/DEMO_URLS.md)
const ENTRIES: ReceiptEntry[] = [
  {
    label: "Linux Kernel COPYING",
    description: "Fetched Linux kernel license from GitHub raw",
    receipt: {
      receipt_id: "r-001-linux",
      agent_pubkey: FAKE_PUBKEY,
      prev_receipt_hash: ZERO_HASH,
      task_id: "task-demo-001",
      timestamp: 1747008000,
      tool_url:
        "https://raw.githubusercontent.com/torvalds/linux/master/COPYING",
      tool_method: "GET",
      tool_request_hash:
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      tool_response_hash:
        "fb5a425bd3b3cd6071a3a9aff9909a859e7c1158d54d32e07658398cd67eb6a0",
      tool_response_status: 200,
      tool_response_excerpt: "Linux kernel is released under the GNU GPL v2",
      signature: FAKE_SIG,
    },
  },
  {
    label: "IPFS Document",
    description: "Fetched immutable document from IPFS",
    receipt: {
      receipt_id: "r-002-ipfs",
      agent_pubkey: FAKE_PUBKEY,
      prev_receipt_hash:
        "1111111111111111111111111111111111111111111111111111111111111111",
      task_id: "task-demo-001",
      timestamp: 1747008060,
      tool_url:
        "https://ipfs.io/ipfs/QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX",
      tool_method: "GET",
      tool_request_hash:
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      tool_response_hash:
        "9cc40206d15aca2c8e3a9492aba7ebb4664b4dc2106df06fd3df26848fff36fd",
      tool_response_status: 200,
      tool_response_excerpt: "Content-addressed document on IPFS",
      signature: FAKE_SIG,
    },
  },
  {
    label: "Bitcoin COPYING",
    description: "Fetched Bitcoin Core license from GitHub raw",
    receipt: {
      receipt_id: "r-003-bitcoin",
      agent_pubkey: FAKE_PUBKEY,
      prev_receipt_hash:
        "2222222222222222222222222222222222222222222222222222222222222222",
      task_id: "task-demo-001",
      timestamp: 1747008120,
      tool_url:
        "https://raw.githubusercontent.com/bitcoin/bitcoin/master/COPYING",
      tool_method: "GET",
      tool_request_hash:
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      tool_response_hash:
        "b028769f3852a9368ab10bd754ff01ebb741f84a2fa658c9aff82a631bc6ecfc",
      tool_response_status: 200,
      tool_response_excerpt: "The MIT License — Bitcoin Core developers",
      signature: FAKE_SIG,
    },
  },
];

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

async function callVerify(receipt: Receipt): Promise<VerifyResult> {
  const res = await fetch(`${ANCHOR_URL}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ receipt, batch_id: MOCK_BATCH_ID, merkle_proof: [] }),
  });
  return res.json() as Promise<VerifyResult>;
}

function ReceiptCard({ entry, index }: { entry: ReceiptEntry; index: number }) {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runVerify() {
    setLoading(true);
    setResult(null);
    try {
      setResult(await callVerify(entry.receipt));
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>
              #{index + 1} {entry.label}
            </CardTitle>
            <CardDescription className="mt-1">{entry.description}</CardDescription>
          </div>
          <TrustBadge result={result} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono break-all text-muted-foreground">
          <span className="font-semibold text-foreground">URL: </span>
          {entry.receipt.tool_url}
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono break-all text-muted-foreground">
          <span className="font-semibold text-foreground">SHA-256: </span>
          {entry.receipt.tool_response_hash}
        </div>
        {result && (
          <>
            <div className="flex flex-wrap gap-1.5 pt-1">
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
  const [tamperResult, setTamperResult] = useState<VerifyResult | null>(null);
  const [tamperLoading, setTamperLoading] = useState(false);

  async function runTamperDemo() {
    setTamperLoading(true);
    setTamperResult(null);
    const tampered: Receipt = {
      ...ENTRIES[0].receipt,
      tool_response_hash:
        "0000000000000000000000000000000000000000000000000000000000000000",
    };
    try {
      setTamperResult(await callVerify(tampered));
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
          {ENTRIES.map((entry, i) => (
            <ReceiptCard key={entry.receipt.receipt_id} entry={entry} index={i} />
          ))}
        </div>

        {/* Tamper Demo */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Tamper Demo</h2>
          <Card>
            <CardHeader>
              <CardTitle>Simulate Receipt Tampering</CardTitle>
              <CardDescription>
                Takes receipt #1 and replaces its <code className="text-xs">tool_response_hash</code> with
                all-zeros — simulating an agent that modified its receipt after the fact.
                The URL hash check should catch this.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-dashed border-destructive/50 bg-destructive/5 p-3 text-xs font-mono text-muted-foreground">
                <span className="font-semibold text-destructive">tampered: </span>
                tool_response_hash ={" "}
                <span className="text-destructive font-semibold">
                  0000000000000000000000000000000000000000000000000000000000000000
                </span>
              </div>
              {tamperResult && (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    <CheckPill label="URL hash" pass={tamperResult.url_valid} />
                    <CheckPill label="Signature" pass={tamperResult.signature_valid} />
                    <CheckPill label="Chain" pass={tamperResult.chain_valid} />
                    <CheckPill label="On-chain" pass={tamperResult.anchor_valid} />
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
            <CardFooter>
              <Button
                variant="destructive"
                size="sm"
                onClick={runTamperDemo}
                disabled={tamperLoading}
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
