// sdk/src/types.ts
// All type definitions for AgentReceipts SDK

export type Receipt = {
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

export type UnsignedReceipt = Omit<Receipt, 'signature'>;

export type AgentConfig = {
  privateKey: string;
  publicKey: string;
  taskId: string;
  storageEndpoint: string;
};

export type VerificationResult = {
  verified: boolean;
  reason?: string;
  details?: {
    signature_valid: boolean;
    chain_intact: boolean;
    response_hash_match: boolean;
    refetch_status?: number;
    refetch_hash?: string;
  };
};

export type AgentRecord = {
  agent_pubkey: string;
  registered_at: number;
  latest_receipt_hash: string;
  receipt_count: number;
  task_count: number;
};
