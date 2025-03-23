import { ethers } from 'ethers';

/**
 * Generates a specified number of random Ethereum private keys
 * This is more efficient than creating full wallets for large numbers
 * @param count Number of keys to generate
 * @returns Array of private keys (hex strings)
 */
export const generatePrivateKeys = (count: number): string[] => {
  const privateKeys: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Create a random 32-byte private key directly instead of creating a full wallet
    // This is much faster for large numbers
    const randomBytes = ethers.utils.randomBytes(32);
    const privateKey = ethers.utils.hexlify(randomBytes);
    privateKeys.push(privateKey);
    
    // Log progress for large generations
    if (count > 50 && i % 50 === 0) {
      console.log(`Generated ${i} keys of ${count}...`);
    }
  }
  
  return privateKeys;
};

/**
 * Derives Ethereum addresses from private keys more efficiently
 * @param privateKeys Array of private keys
 * @returns Array of corresponding addresses
 */
export const deriveAddresses = (privateKeys: string[]): string[] => {
  return privateKeys.map((key, index) => {
    // Log progress for large derivations
    if (privateKeys.length > 50 && index % 50 === 0) {
      console.log(`Derived ${index} addresses of ${privateKeys.length}...`);
    }
    
    const wallet = new ethers.Wallet(key);
    return wallet.address;
  });
};