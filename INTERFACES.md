# INTERFACES.md — The Contract Between SDK and Contract

> This file is the ONLY source of truth for data formats.
> Both Hari and Prajhan follow this exactly.
> To change: WhatsApp first, agree, then ONE person edits.

---

## Receipt Schema (v0.1)

```typescript
type Receipt = {
  // Identity
  receipt_id: string;              // UUID v4
  agent_pubkey: string;            // Hex-encoded ed25519 public key
  
  // Chaining
  prev_receipt_hash: string;       // SHA-256 hex of previous receipt (or "0x0" if first)
  
  // Task grouping
  task_id: string;                 // Free-form string to group receipts
  
  // Timestamp
  timestamp: number;               // Unix milliseconds
  
  // Tool call data
  tool_url: string;                // The URL fetched
  tool_method: string;             // "GET" | "POST" | etc.
  tool_request_hash: string;       // SHA-256 hex of request body (or "0x0" if GET)
  tool_response_hash: string;      // SHA-256 hex of response body
  tool_response_status: number;    // HTTP status code (200, 404, etc.)
  tool_response_excerpt: string;   // First 500 chars of response (UTF-8 safe)
  
  // Signature
  signature: string;               // ed25519 signature (hex) over canonical JSON of all fields above
};
```

---

## How to compute receipt_hash
receipt_hash = SHA-256(canonical_json(receipt_without_signature))

- Use `json-canonicalize` library (npm: `canonicalize`)
- Sort keys alphabetically
- No whitespace
- Numbers as-is (no scientific notation)

---

## Canonical JSON Example

Input:
```json
{
  "tool_url": "https://example.com",
  "timestamp": 1715000000000,
  "agent_pubkey": "abc123"
}
```

Canonical output (keys sorted, no spaces):
{"agent_pubkey":"abc123","timestamp":1715000000000,"tool_url":"https://example.com"}

---

## Signing Rule

1. Build receipt object with ALL fields except `signature`
2. Compute canonical JSON of that object
3. Sign the canonical JSON bytes with agent's ed25519 private key
4. Add signature as `signature` field

---

## 0G Storage Paths

| What | Path |
|------|------|
| Receipt | `receipts/{receipt_id}.json` |
| Batch | `batches/{batch_id}.json` |

---

## 0G KV Keys

| Key | Value |
|-----|-------|
| `agent:{agent_pubkey}` | Agent record JSON |
| `agent:{agent_pubkey}:receipts` | Array of receipt_ids |
| `task:{task_id}` | Array of receipt_ids |
| `receipt:{receipt_id}:batch` | batch_id string |

---

## Batch Schema (for on-chain anchoring)

```typescript
type Batch = {
  batch_id: string;            // SHA-256 of sorted receipt_ids
  receipt_ids: string[];       // In chain order
  merkle_root: string;         // Hex, root of Merkle tree over receipt hashes
  anchored_at: number;         // Unix millis when tx confirmed
  tx_hash: string;             // 0G Chain transaction hash
  block_number: number;
};
```

---

## Smart Contract Interface

```solidity
function anchorBatch(
    bytes32 batchId,
    bytes32 merkleRoot,
    uint256 receiptCount
) external;

function getBatchRoot(bytes32 batchId) external view returns (bytes32);
```

---

## Who Owns What

| Folder | Owner | Responsibility |
|--------|-------|----------------|
| `/sdk` | Prajhan | wrapFetch, sign, store receipts, verify |
| `/contract` | Hari | ReceiptAnchor.sol, deploy scripts |
| `/anchor-service` | Hari | Batch receipts, submit merkle roots |
| `/dashboard` | Hari (Day 4) | UI for agents, receipts, trust scores |
| `/examples` | Either | Demo agent for dogfood |

---

## Change Log

| Date | Change | Who |
|------|--------|-----|
| Day 0 | Initial version | Both |