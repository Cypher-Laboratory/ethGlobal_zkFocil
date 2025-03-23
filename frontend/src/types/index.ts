export interface Transaction {
  id: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  hash: string;
}

export interface Block {
  id: number;
  timestamp: number;
  hash: string;
  previousHash: string;
  creator: string;
  zkProof: string;
  transactions: Transaction[];
}

export interface ZKProofResponse {
  proof: string;
  elected: boolean;
}