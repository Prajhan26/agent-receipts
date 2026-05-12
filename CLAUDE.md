# CLAUDE.md — AgentReceipts

> Tamper-proof receipts for AI agent tool calls. 0G APAC Hackathon. Deadline: May 16, 2026.

## THE ONE RULE THAT OVERRIDES EVERYTHING

If the instruction is vague or you are filling a gap with an assumption —
STOP. Ask one clarifying question. Do not guess and run.

---

## PROJECT

AgentReceipts — SDK that wraps AI agent tool calls, creates ed25519-signed chained receipts capturing tool I/O hashes, stores them on 0G Storage, and anchors batches to 0G Chain mainnet via Merkle roots. Verification re-fetches URLs and compares hashes.

## SCOPE IS LOCKED

Read `/SCOPE.md` before every session. Do not add features. If you think of something new, add it to `/V2_IDEAS.md` and move on. Never build anything not in SCOPE.md.

Things that are OUT of scope: OpenClaw skill, x402 integration, Sealed Inference, LLM call receipts, dynamic URL handling, external team integrations.

## DATA CONTRACT

Read `/INTERFACES.md` before working on any receipt-related code. This is the single source of truth for:
- Receipt schema (field names, types, order)
- Signing rules
- 0G storage paths and KV keys
- Batch schema
- Smart contract ABI

Do not rename fields, change types, or add fields without being told. If INTERFACES.md and code disagree, INTERFACES.md wins.

## FOLDER OWNERSHIP

| Folder | Owner | Rule |
|---|---|---|
| `/sdk` | Prajhan | Haris does NOT edit files here |
| `/contract` | Haris | Prajhan does NOT edit files here |
| `/anchor-service` | Haris | Prajhan does NOT edit files here |
| `/dashboard` | Haris (Day 4+) | — |
| `/examples` | Either | — |
| `/INTERFACES.md` | Both | Only edit after WhatsApp agreement |

If you are running in Haris's session: only touch `/contract`, `/anchor-service`, `/dashboard`, `/examples`.
If you are running in Prajhan's session: only touch `/sdk`, `/examples`.

## STACK

- Language: TypeScript (all services)
- Smart contract: Solidity 0.8.20, Hardhat
- Frontend: Next.js, Tailwind, shadcn/ui
- Crypto: @noble/ed25519, merkletreejs, json-canonicalize (npm: canonicalize)
- Storage: @0gfoundation/0g-storage-ts-sdk (MemData for receipts, not ZgFile)
- Hosting: Vercel (dashboard), Railway (anchor-service)

## 0G NETWORK CONFIG

- Chain: 0G Mainnet, Chain ID 16661
- RPC: https://evmrpc.0g.ai
- Explorer: https://chainscan.0g.ai
- Storage network: Turbo
- Storage indexer: https://indexer-storage-turbo.0g.ai
- Flow contract: 0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526
- KV read endpoint: http://mainnet-kv.0g.ai:6789

## DEPLOYED CONTRACTS

- ReceiptAnchor (mainnet): 0xcB33A8b65a599767301DcA89a8EdB15e8c4465E3
- Deployment info + ABI: /contract/deployments/0g-mainnet.json

## CORE RULES

### Rule 01 — Ask Before Assuming
If the task has more than one valid interpretation, state both and ask which one. Never pick silently.

### Rule 02 — One Thing at a Time
Complete the exact task asked. Nothing more. If you notice something broken nearby, mention it — don't fix it.

### Rule 03 — Define Done Before Writing
Before any code, state in one line what success looks like. Then build to that.

### Rule 04 — No Silent Failures
If anything breaks or becomes unclear mid-task — stop immediately and surface it. Never work around a problem silently.

### Rule 05 — Match Existing Style
Use the same patterns already in the codebase. Don't introduce new conventions.

### Rule 06 — No New Dependencies Without Reason
Use existing tools in the stack first. If a new dependency is needed, state why and wait for approval.

### Rule 07 — Keep Diffs Small
Every changed line must trace directly to the instruction. No reformatting. No drive-by improvements.

### Rule 08 — The 3-Step Debugging Protocol
If an error isn't fixed in one attempt:
1. STOP — do not keep changing code blindly
2. ANALYZE — list 2-3 possible root causes
3. PROPOSE — state the fix and why it should work before writing any code

### Rule 09 — Never Touch Config You Don't Own
Hardhat config (network settings, chain ID, RPC) — do not change unless explicitly told.
0G endpoints — do not change. They are locked in this file.
INTERFACES.md — do not edit. Tell the human what needs changing.

### Rule 10 — Canonical JSON is Sacred
Always use the `canonicalize` npm package for JSON serialization before hashing or signing. Never hand-roll JSON.stringify for anything that gets hashed. Key order matters. Whitespace matters.

## AFTER EVERY TASK

List exactly what you changed and what you deliberately did not touch.

## COMMON COMMANDS

```bash
# Contract
cd contract && npx hardhat compile
cd contract && npx hardhat test
cd contract && npx hardhat run scripts/deploy.ts --network 0g-mainnet

# SDK
cd sdk && npm test

# Anchor service
cd anchor-service && npm run dev

# Dashboard
cd dashboard && npm run dev
```

## HOW TO KNOW THIS IS WORKING

- Diffs are small and surgical
- Clarifying questions come before code, not after mistakes
- Receipt schema matches INTERFACES.md exactly
- Nothing breaks that wasn't supposed to be touched
- No scope creep — new ideas go to V2_IDEAS.md
