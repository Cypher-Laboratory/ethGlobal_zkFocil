export interface Transaction {
  id: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  hash: string;
  includedByValidator?: boolean; // Flag to mark transactions included by our validator
}

export interface Block {
  id: number;
  timestamp: number;
  hash: string;
  previousHash: string;
  creator: string;
  zkProof: string;
  transactions: Transaction[];
  zkPrivateData?: ZKPrivateData; // Optional private data for ZK proof
}

export interface ZKPrivateData {
  randomness: string;
  threshold: number;
  eligibilityScore: number;
  validatorWeight: number;
  timestamp: number;
}

export interface ZKProofResponse {
  proof: string;
  elected: boolean;
  privateData?: ZKPrivateData;
}