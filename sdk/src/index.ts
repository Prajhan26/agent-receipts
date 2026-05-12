// sdk/src/index.ts
// Public API for agent-receipts-sdk

export type { Receipt, UnsignedReceipt, AgentConfig, VerificationResult, AgentRecord } from './types';

export { generateKeypair, signReceipt, verifySignature, computeReceiptHash } from './sign';

export { wrapFetch, createTrackedFetch, resetChain, getChainState } from './wrapFetch';

export { verifyReceipt, verifyReceiptChain } from './verify';

export {
  initStorage,
  uploadReceipt,
  downloadReceipt,
  persistReceipt,
  updateAgentKV,
  updateTaskKV,
} from './storage';
export type { StorageClient, UploadResult } from './storage';
