import { ethers } from 'ethers';
import { Transaction } from '../types';

/**
 * Generates random mock transactions
 * @param addresses Pool of addresses to use as senders and receivers
 * @param count Number of transactions to generate
 * @returns Array of mock transactions
 */
export const generateRandomTransactions = (addresses: string[], count: number): Transaction[] => {
  const transactions: Transaction[] = [];
  
  for (let i = 0; i < count; i++) {
    // Get random sender and receiver from address pool
    const fromIndex = Math.floor(Math.random() * addresses.length);
    let toIndex = Math.floor(Math.random() * addresses.length);
    
    // Ensure sender and receiver are different
    while (toIndex === fromIndex) {
      toIndex = Math.floor(Math.random() * addresses.length);
    }
    
    // Generate random ETH amount (0.001 to 10 ETH)
    const valueInEth = (Math.random() * 9.999 + 0.001).toFixed(6);
    const valueInWei = ethers.utils.parseEther(valueInEth).toString();
    
    // Create transaction hash by hashing transaction data
    const transactionData = `${addresses[fromIndex]}${addresses[toIndex]}${valueInWei}${Date.now()}${i}`;
    const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(transactionData));
    
    transactions.push({
      id: `tx-${i}-${Date.now()}`,
      from: addresses[fromIndex],
      to: addresses[toIndex],
      value: valueInWei,
      timestamp: Date.now(),
      hash
    });
  }
  
  return transactions;
};