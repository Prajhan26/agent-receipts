# agent-receipts-sdk

Tamper-proof receipts for AI agent tool calls, anchored on 0G Chain.

## Install
```
npm install agent-receipts-sdk
```

## Quick Start
```js
import { wrapFetch, generateKeypair } from 'agent-receipts-sdk'

const keypair = await generateKeypair()

const config = {
  agentId: 'my-agent',
  keypair,
  anchorServiceUrl: 'https://agent-receipts-anchor.onrender.com'
}

const response = await wrapFetch(config, 'https://any-url.com')
// Receipt automatically created, signed, and anchored on 0G mainnet
```

## Dashboard
View live receipts at https://agentreceipts.vercel.app

## Contract
`0xcB33A8b65a599767301DcA89a8EdB15e8c4465E3` on 0G Mainnet
