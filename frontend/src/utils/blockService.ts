import { ethers } from 'ethers';
import axios from 'axios';
import { Block, Transaction, ZKProofResponse } from '../types';

/**
 * Fetches a ZK proof from the local server
 * @param address The address requesting to create an inclusion list
 * @returns Promise with the ZK proof response
 */
export const fetchZKProof = async (address: string): Promise<ZKProofResponse> => {
  try {
    const response = await axios.get(`http://localhost:3001/zk-proof?address=${address}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching ZK proof:', error);
    
    // Mock the response in case the server is not available
    return {
      proof: `mock-zk-proof-${ethers.utils.keccak256(ethers.utils.toUtf8Bytes(address + Date.now()))}`,
      elected: Math.random() > 0.3 // 70% chance of being elected
    };
  }
};

/**
 * Creates a new block with the given transactions and previous block hash
 * @param blockId The new block ID
 * @param transactions List of transactions to include
 * @param previousHash Hash of the previous block
 * @param creator Address of the block creator
 * @param zkProof ZK proof string
 * @returns The newly created block
 */
export const createBlock = (
  blockId: number,
  transactions: Transaction[],
  previousHash: string,
  creator: string,
  zkProof: string
): Block => {
  const timestamp = Date.now();
  
  // Create block hash by hashing block data
  const blockData = `${blockId}${timestamp}${previousHash}${creator}${zkProof}${JSON.stringify(transactions)}`;
  const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(blockData));
  
  return {
    id: blockId,
    timestamp,
    hash,
    previousHash,
    creator,
    zkProof,
    transactions
  };
};

/**
 * Simulates broadcasting the block to other nodes
 * @param block The block to broadcast
 */
export const broadcastBlock = async (block: Block): Promise<void> => {
  // In a real implementation, this would send the block to peers
  console.log('Broadcasting block:', block.id);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('Block broadcast complete:', block.id);
};