## Done
- ReceiptAnchor.sol deployed to 0G mainnet: 0xcB33A8b65a599767301DcA89a8EdB15e8c4465E3
- Contract verified on chainscan.0g.ai
- Hardhat config with 0g-mainnet and 0g-testnet networks
- Deploy script at /contract/scripts/deploy.ts
- Deployment JSON + ABI at /contract/deployments/0g-mainnet.json
- Demo URLs verified: 3/3 PASS (GitHub raw + IPFS)
- Anchor service built and tested (/anchor-service)
  - 0G Storage upload working on mainnet (Chain ID 16661, Turbo network)
  - anchorBatch working on mainnet contract 0xcB33A8b65a599767301DcA89a8EdB15e8c4465E3
  - Duplicate batch detection working (contract rejects re-anchoring)

## Next
- Verification API: re-fetch URL, compare hash, verify signature, verify chain, verify on-chain anchor
- Dashboard: Next.js + trust scores + tamper demo button (Day 4)
