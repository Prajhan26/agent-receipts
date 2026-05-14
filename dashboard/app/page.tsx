"use client";

import { useEffect, useRef, useState } from "react";

// UI Spec Reference: ProofShell v2

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

type TerminalLine = {
  text: string;
  tone?: "default" | "muted" | "success" | "accent";
};

// ── Constants ─────────────────────────────────────────────────────────────────

const ANCHOR_URL =
  process.env.NEXT_PUBLIC_ANCHOR_SERVICE_URL ??
  "https://agent-receipts-anchor.onrender.com";

const CONTRACT_ADDRESS = "0xcB33A8b65a599767301DcA89a8EdB15e8c4465E3";
const GREEN = "#39ff14";
const TERMINAL_SCRIPT: TerminalLine[] = [
  { text: "$ npm install agent-receipts", tone: "default" },
  { text: "✓ installed sdk and verification helpers", tone: "success" },
  { text: "" },
  { text: "$ cp examples/demo-agent/.env.example .env", tone: "default" },
  { text: "✓ configured anchor service and chain settings", tone: "success" },
  { text: "" },
  { text: "$ npm run demo:verify", tone: "default" },
  { text: "Connecting signer to 0G Mainnet...", tone: "muted" },
  { text: "https://chainscan.0g.ai/address/0xcB33A8b65a...8c4465E3", tone: "accent" },
  { text: "" },
  { text: "✓ wrapped live fetch and generated signed receipt", tone: "success" },
  { text: "✓ uploaded receipt batch to 0G Storage", tone: "success" },
  { text: "✓ anchored Merkle root on 0G Mainnet", tone: "success" },
  { text: "✓ verification hash matched fetched response", tone: "success" },
  { text: "" },
  { text: "trusted: every tool call is provable", tone: "success" },
];

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
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.65rem] font-mono font-medium uppercase tracking-[0.24em]"
      style={
        pass
          ? { color: GREEN, borderColor: "rgba(12,255,145,0.55)", background: "rgba(12,255,145,0.09)" }
          : { color: "#ff6666", borderColor: "rgba(255,102,102,0.4)", background: "rgba(255,68,68,0.08)" }
      }
    >
      {pass ? "✓" : "✗"} {label}
    </span>
  );
}

function TrustBadge({ result }: { result: VerifyResult | null }) {
  if (!result) {
    return (
      <span className="inline-flex rounded-full border border-white/12 px-3 py-1 text-[0.68rem] font-mono font-semibold tracking-[0.24em] text-neutral-400">
        UNVERIFIED
      </span>
    );
  }
  return result.overall ? (
    <span
      className="inline-flex rounded-full border px-3 py-1 text-[0.68rem] font-mono font-semibold tracking-[0.24em]"
      style={{ color: GREEN, borderColor: "rgba(12,255,145,0.55)", background: "rgba(12,255,145,0.09)" }}
    >
      TRUSTED
    </span>
  ) : (
    <span className="inline-flex rounded-full border border-red-500/40 bg-red-500/5 px-3 py-1 text-[0.68rem] font-mono font-semibold tracking-[0.24em] text-red-400">
      TAMPERED
    </span>
  );
}

function ProofPanel() {
  const prompt = "Install AgentReceipts and verify one live tool call for me.";
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [promptIndex, setPromptIndex] = useState(0);
  const [phase, setPhase] = useState<"prompt" | "thinking" | "output">("prompt");
  const logViewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (phase === "prompt") {
      if (promptIndex < prompt.length) {
        const timer = window.setTimeout(() => {
          setPromptIndex((value) => value + 1);
        }, 28);
        return () => window.clearTimeout(timer);
      }

      const timer = window.setTimeout(() => {
        setPhase("thinking");
      }, 450);
      return () => window.clearTimeout(timer);
    }

    if (phase === "thinking") {
      const timer = window.setTimeout(() => {
        setPhase("output");
        setLineIndex(0);
        setCharIndex(0);
      }, 1300);
      return () => window.clearTimeout(timer);
    }

    const currentLine = TERMINAL_SCRIPT[lineIndex];

    if (!currentLine) {
      const resetTimer = window.setTimeout(() => {
        setPhase("prompt");
        setPromptIndex(0);
        setLineIndex(0);
        setCharIndex(0);
      }, 2200);
      return () => window.clearTimeout(resetTimer);
    }

    if (charIndex < currentLine.text.length) {
      const typeTimer = window.setTimeout(() => {
        setCharIndex((value) => value + 1);
      }, currentLine.text.startsWith("$") ? 42 : 24);
      return () => window.clearTimeout(typeTimer);
    }

    const nextLineTimer = window.setTimeout(() => {
      setLineIndex((value) => value + 1);
      setCharIndex(0);
    }, currentLine.text === "" ? 140 : 520);

    return () => window.clearTimeout(nextLineTimer);
  }, [charIndex, lineIndex, phase, prompt.length, promptIndex]);

  useEffect(() => {
    if (phase !== "output" || !logViewportRef.current) return;
    logViewportRef.current.scrollTo({
      top: logViewportRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [charIndex, lineIndex, phase]);

  function toneClass(tone: TerminalLine["tone"]) {
    switch (tone) {
      case "success":
        return "text-[#00ff88]";
      case "accent":
        return "text-[#4fc3ff]";
      case "muted":
        return "text-neutral-500";
      default:
        return "text-neutral-300";
    }
  }

  const completedLines = TERMINAL_SCRIPT.slice(0, lineIndex);
  const activeLine = TERMINAL_SCRIPT[lineIndex];

  return (
    <div
      className="flex h-[34rem] flex-col overflow-hidden bg-[#0b0b0b]"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      {/* ── Title bar ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-[9px]">
        <span className="text-[10px] uppercase tracking-[0.22em] text-neutral-600">
          proof-session
        </span>
        <div className="flex items-center gap-1.5">
          <span className="h-[9px] w-[9px] rounded-full bg-white/10" />
          <span className="h-[9px] w-[9px] rounded-full bg-white/10" />
          <span className="h-[9px] w-[9px] rounded-full bg-white/10" />
        </div>
      </div>

      {/* ── Init output ── */}
      <div className="shrink-0 border-b border-white/6 px-4 py-3 text-[12px] leading-[1.7] text-neutral-400">
        <div>$ agent-receipts init proof-demo</div>
        <div className="text-[#00ff88]">✓ workspace created and checked out in 4.2s</div>
      </div>

      {/* ── Identity strip ── */}
      <div className="shrink-0 border-b border-white/6 px-4 py-3 text-[12px] leading-[1.6]">
        <div className="flex items-start gap-2.5">
          <svg viewBox="0 0 64 64" className="mt-[3px] h-[28px] w-[28px] shrink-0 text-[#ef8d67]" aria-hidden="true">
            <rect x="14" y="18" width="36" height="24" fill="currentColor" rx="2" />
            <rect x="18" y="14" width="8" height="6" fill="currentColor" />
            <rect x="38" y="14" width="8" height="6" fill="currentColor" />
            <rect x="24" y="26" width="4" height="6" fill="#25120d" />
            <rect x="36" y="26" width="4" height="6" fill="#25120d" />
            <rect x="10" y="26" width="6" height="4" fill="currentColor" />
            <rect x="48" y="26" width="6" height="4" fill="currentColor" />
            <rect x="16" y="42" width="4" height="10" fill="currentColor" />
            <rect x="24" y="42" width="4" height="10" fill="currentColor" />
            <rect x="36" y="42" width="4" height="10" fill="currentColor" />
            <rect x="44" y="42" width="4" height="10" fill="currentColor" />
          </svg>
          <div className="min-w-0">
            <div className="text-[#f5f5f0]">
              AgentReceipts SDK{" "}
              <span className="text-neutral-500">v0.1.0</span>
            </div>
            <div className="text-[11px] text-neutral-500">0G Mainnet · receipt signer ready</div>
            <div className="truncate text-[11px] text-neutral-600">
              ~/agent-receipts/examples/demo-agent
            </div>
          </div>
        </div>
      </div>

      {/* ── Prompt band ── */}
      <div className="shrink-0 border-b border-white/6 bg-white/[0.02] px-4 py-2.5 text-[12px] text-[#f5f5f0]">
        <span className="mr-2 text-[#4fc3ff]">›</span>
        {prompt.slice(0, promptIndex)}
        {phase === "prompt" && (
          <span className="ml-[1px] inline-block h-[1em] w-[7px] translate-y-[2px] animate-pulse bg-[#f5f5f0]" />
        )}
      </div>

      {/* ── Status line ── */}
      <div className="shrink-0 border-b border-white/6 px-4 py-[7px] text-[11px]">
        {phase === "thinking" ? (
          <>
            <span className="text-[#ffb091]">* Proofing…</span>
            <span className="ml-2 text-neutral-600">(thinking)</span>
          </>
        ) : (
          <span className="text-neutral-700">? press esc to interrupt</span>
        )}
      </div>

      {/* ── Log viewport — fixed height, internal scroll ── */}
      <div
        ref={logViewportRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="space-y-[3px] text-[12px] leading-[1.65]">
          {phase === "output" &&
            completedLines.map((line, index) => (
              <div key={`${line.text}-${index}`} className={toneClass(line.tone)}>
                {line.text === "" ? <span className="block h-[0.5em]" /> : line.text}
              </div>
            ))}
          {phase === "output" && activeLine && (
            <div className={toneClass(activeLine.tone)}>
              {activeLine.text.slice(0, charIndex)}
              <span className="ml-[1px] inline-block h-[1em] w-[7px] translate-y-[2px] animate-pulse bg-[#f5f5f0]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductStep({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="border border-white/10 bg-[#111111] px-5 py-5">
      <div className="mb-5 font-mono text-[11px] uppercase tracking-[0.24em] text-[#00ff88]">
        {number}
      </div>
      <div className="mb-4 max-w-sm text-[1.6rem] font-bold leading-[0.95] tracking-[-0.05em] text-[#f5f5f0]">
        {title}
      </div>
      <p className="max-w-md font-mono text-sm leading-7 text-[#7a7a7a]">{body}</p>
    </div>
  );
}

function ReceiptCard({ entry, index }: { entry: StoredEntry; index: number }) {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runVerify() {
    setLoading(true);
    setResult(null);
    try {
      setResult(await callVerify(entry.receipt, entry.batch_id, entry.merkle_proof));
    } catch {
      setResult({ url_valid: false, signature_valid: false, chain_valid: false, anchor_valid: false, overall: false, detail: "Failed to reach anchor service" });
    } finally {
      setLoading(false);
    }
  }

  const { receipt } = entry;

  return (
    <div className="space-y-5 border border-white/10 bg-[#111111] p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 font-mono text-[0.7rem] uppercase tracking-[0.24em] text-neutral-500">
            Receipt #{index + 1}
          </p>
          <p className="break-all text-lg font-semibold tracking-[-0.02em] text-white md:text-xl">
            {receipt.tool_url}
          </p>
          <p className="mt-2 font-mono text-xs text-neutral-500">{receipt.receipt_id}</p>
        </div>
        <TrustBadge result={result} />
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border border-white/8 bg-black p-4 font-mono text-xs">
        <span className="text-neutral-500">hash</span>
        <span className="text-neutral-300 break-all">{receipt.tool_response_hash}</span>
        <span className="text-neutral-500">batch</span>
        <span className="text-neutral-300">{shorten(entry.batch_id)}</span>
        <span className="text-neutral-500">tx</span>
        <span>
          <a
            href={`https://chainscan.0g.ai/tx/${entry.tx_hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs hover:underline"
            style={{ color: GREEN }}
          >
            {shorten(entry.tx_hash)}
          </a>
        </span>
        <span className="text-neutral-500">block</span>
        <span className="text-neutral-300">{entry.block_number}</span>
      </div>

      {result && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <CheckPill label="URL hash" pass={result.url_valid} />
            <CheckPill label="Signature" pass={result.signature_valid} />
            <CheckPill label="Chain" pass={result.chain_valid} />
            <CheckPill label="On-chain" pass={result.anchor_valid} />
          </div>
          <p className="font-mono text-xs text-neutral-500">{result.detail}</p>
        </div>
      )}

      <button
        onClick={runVerify}
        disabled={loading}
        className="w-full border px-4 py-3 font-mono text-[0.72rem] font-medium tracking-[0.24em] transition-colors disabled:opacity-40 sm:w-auto"
        style={{
          borderColor: "rgba(12,255,145,0.75)",
          color: GREEN,
          background: loading ? "rgba(12,255,145,0.08)" : "transparent",
        }}
        onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "rgba(12,255,145,0.1)"; }}
        onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        {loading ? "VERIFYING…" : "VERIFY RECEIPT"}
      </button>
    </div>
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
      tool_response_hash: "0000000000000000000000000000000000000000000000000000000000000000",
    };
    try {
      setTamperResult(await callVerify(tampered, receipts[0].batch_id, receipts[0].merkle_proof));
    } catch {
      setTamperResult({ url_valid: false, signature_valid: false, chain_valid: false, anchor_valid: false, overall: false, detail: "Failed to reach anchor service" });
    } finally {
      setTamperLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="sticky top-0 z-20 border-b border-white/8 bg-[#0a0a0a]/92 backdrop-blur-md">
        <div className="mx-auto flex h-18 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-8">
            <span className="text-[1.55rem] font-black tracking-[-0.08em] text-[#f5f2eb] sm:text-[2.1rem]">
            Agent<span style={{ color: GREEN }}>Receipts</span>
            </span>
            <div className="hidden items-center gap-6 font-mono text-[13px] text-neutral-400 lg:flex">
              <a href="#product" className="transition-colors hover:text-white">Product</a>
              <a href="#workflow" className="transition-colors hover:text-white">Workflow</a>
              <a href="#receipts" className="transition-colors hover:text-white">Receipts</a>
            </div>
          </div>
          <div
            className="hidden items-center gap-2 rounded-[2px] border px-[12.8px] py-[4.8px] font-mono text-[12px] font-normal tracking-[0.12em] opacity-75 sm:flex"
            style={{ borderColor: "rgba(0,255,136,0.65)", color: "#00ff88", background: "transparent" }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: GREEN }} />
            LIVE ON 0-G MAINNET
          </div>
        </div>
      </nav>

      <section id="product" className="hero relative overflow-hidden border-b border-white/8 bg-[#0a0a0a]">
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
          <div className="border border-white/10">
            <div className="items-start lg:grid lg:grid-cols-[1.05fr_0.95fr]">
              <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r lg:p-8">
                <ProofPanel />
              </div>
              <div className="p-6 lg:p-10">
                <div className="mb-5 font-mono text-[12px] text-neutral-400">
                  <span className="mr-2 inline-block h-4 w-[3px] bg-neutral-300 align-middle" />
                  Proof-first infrastructure
                </div>
                <h1
                  className="max-w-[620px] text-[clamp(3rem,5.4vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-[rgb(245,245,240)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Prove what AI agents
                  <br />
                  actually saw, did,
                  <br />
                  and returned.
                </h1>
                <p className="mt-6 max-w-[560px] font-mono text-[15px] leading-8 text-[#7a7a7a]">
                  Every tool call an AI agent makes is signed, chained, stored on
                  0G Storage, and anchored to 0G Chain mainnet. No trust me logs.
                  No unverifiable claims. Just cryptographic receipts.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="#receipts"
                    className="inline-flex items-center justify-center border border-white/12 bg-[#f5f5f0] px-5 py-3 text-[15px] font-medium text-black transition-colors hover:bg-white"
                  >
                    Inspect live receipts
                  </a>
                  <a
                    href="https://github.com/Prajhan26/agent-receipts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center border border-white/12 px-5 py-3 font-mono text-[13px] text-neutral-300 transition-colors hover:border-white/30 hover:text-white"
                  >
                    View GitHub
                  </a>
                </div>
                <div className="mt-8 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-3">
                  {[
                    ["Sign", "ed25519 receipt chain"],
                    ["Store", "0G Storage batch records"],
                    ["Anchor", "Merkle roots on 0G Chain"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-neutral-500">
                        {label}
                      </div>
                      <div className="mt-2 text-sm text-neutral-300">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="border-b border-white/8">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div className="mb-4 font-mono text-[12px] text-neutral-400">
                <span className="mr-2 inline-block h-4 w-[3px] bg-neutral-300 align-middle" />
                Workflow
              </div>
              <h2 className="max-w-[520px] text-[clamp(2.2rem,4vw,4rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-[#f5f5f0]">
                Verification that behaves like infrastructure, not logging.
              </h2>
            </div>
            <div className="grid gap-[1px] bg-white/10 lg:grid-cols-3">
              <ProductStep
                number="01"
                title="Agent makes a tool call"
                body="The SDK wraps the request, captures the URL, method, and response body hash before an agent can rewrite the story."
              />
              <ProductStep
                number="02"
                title="Receipt signed and stored"
                body="Every receipt is ed25519 signed, linked to the previous receipt, and committed into a durable batch on 0G Storage."
              />
              <ProductStep
                number="03"
                title="Batch anchored on-chain"
                body="The anchor service builds a Merkle tree and publishes the root to the ReceiptAnchor contract for independent verification."
              />
            </div>
          </div>
        </div>
      </section>

      <section id="receipts" className="border-b border-white/8">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
          <div className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 font-mono text-[12px] text-neutral-400">
                <span className="mr-2 inline-block h-4 w-[3px] bg-neutral-300 align-middle" />
                Live receipts
              </div>
              <p className="max-w-xl text-sm text-neutral-500">
                Inspect real receipts, verify their signatures, and confirm that the
                batch resolves to an on-chain anchor.
              </p>
            </div>
            {!fetchLoading && !fetchError && (
              <span className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
                {receipts.length} receipt{receipts.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {fetchLoading && (
              <p className="font-mono text-xs text-neutral-500">Loading receipts…</p>
            )}
            {fetchError && (
              <p className="font-mono text-xs text-red-400">
                Could not reach anchor service: {fetchError}
              </p>
            )}
            {!fetchLoading && !fetchError && receipts.length === 0 && (
              <p className="font-mono text-xs text-neutral-500">
                No receipts yet. Run{" "}
                <code>cd examples && npm run e2e</code> to generate receipts.
              </p>
            )}
            {receipts.map((entry, i) => (
              <ReceiptCard key={entry.receipt.receipt_id} entry={entry} index={i} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/8 bg-[#070707]">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
          <div className="grid gap-[1px] bg-white/10 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="border border-white/0 bg-[#101010] p-6">
              <div className="mb-3 font-mono text-[12px] text-neutral-400">
                <span className="mr-2 inline-block h-4 w-[3px] bg-neutral-300 align-middle" />
                Tamper demo
              </div>
              <h3 className="max-w-md text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.04em] text-[#f5f5f0]">
                Reject modified receipts the moment proof breaks.
              </h3>
              <p className="mt-5 max-w-md font-mono text-sm leading-7 text-neutral-500">
                Mutate a receipt hash and the verification chain fails immediately.
                This demonstrates the difference between logs an agent can narrate
                and receipts that third parties can prove.
              </p>
              <button
                onClick={runTamperDemo}
                disabled={tamperLoading || !receipts[0]}
                className="mt-8 border border-red-500 px-5 py-3 font-mono text-[12px] uppercase tracking-[0.22em] text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-40"
              >
                {tamperLoading ? "Running tamper demo" : "Run tamper demo"}
              </button>
            </div>

            <div className="border border-white/0 bg-black p-6">
              {receipts[0] ? (
                <div className="space-y-5 font-mono text-sm text-neutral-300">
                  <div className="border border-red-500/30 bg-red-500/5 p-4 text-xs text-neutral-400">
                    <span className="font-semibold text-red-400">tampered input</span>
                    <div className="mt-2 break-all text-red-400">
                      0000000000000000000000000000000000000000000000000000000000000000
                    </div>
                  </div>

                  {tamperResult ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <CheckPill label="URL hash" pass={tamperResult.url_valid} />
                        <CheckPill label="Signature" pass={tamperResult.signature_valid} />
                        <CheckPill label="Chain" pass={tamperResult.chain_valid} />
                        <CheckPill label="On-chain" pass={tamperResult.anchor_valid} />
                      </div>
                      <div className="border border-white/10 p-4 text-xs text-neutral-500">
                        {tamperResult.detail}
                      </div>
                      <div
                        className="border p-4 font-semibold"
                        style={
                          tamperResult.overall
                            ? { color: GREEN, borderColor: GREEN, background: "rgba(12,255,145,0.05)" }
                            : { color: "#ff4444", borderColor: "#ff4444", background: "rgba(255,68,68,0.05)" }
                        }
                      >
                        {tamperResult.overall
                          ? "Unexpected: tampered receipt passed"
                          : "Expected: tampered receipt rejected"}
                      </div>
                    </div>
                  ) : (
                    <div className="border border-white/10 p-4 text-neutral-500">
                      Run the demo to see signature, chain, and on-chain verification fail.
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-white/10 p-4 font-mono text-sm text-neutral-500">
                  Run the e2e flow first to load at least one receipt for tamper testing.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/8">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row sm:px-8 lg:px-12">
          <span className="text-lg font-black tracking-[-0.06em]">
            Agent<span style={{ color: GREEN }}>Receipts</span>
          </span>
          <div className="flex gap-6">
            <a
              href={`https://chainscan.0g.ai/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 transition-colors hover:text-white"
            >
              Contract ↗
            </a>
            <a
              href="https://github.com/Prajhan26/agent-receipts"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 transition-colors hover:text-white"
            >
              GitHub ↗
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
