import { useEffect, useState, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { Block, Transaction } from '../types';
import { generatePrivateKeys, deriveAddresses } from '../utils/keyGenerator';
import { generateRandomTransactions } from '../utils/transactionGenerator';
import { fetchZKProof, createBlock, broadcastBlock } from '../utils/blockService';
import { debugLog } from '../utils/debug';

// Block creation interval in milliseconds (default 12 seconds)
const DEFAULT_BLOCK_INTERVAL = 12000;
// Number of transactions to include in each block
const TRANSACTIONS_PER_BLOCK = 10;

export const useBlockchain = () => {
  const [privateKeys, setPrivateKeys] = useState<string[]>([]);
  const [addresses, setAddresses] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [currentNodeIndex, setCurrentNodeIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [blockCreationLog, setBlockCreationLog] = useState<string[]>([]);
  const [isCreatingBlock, setIsCreatingBlock] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [blockTime, setBlockTime] = useState<number>(DEFAULT_BLOCK_INTERVAL);
  
  // Use ref to prevent issues with stale closures in the interval
  const blocksRef = useRef<Block[]>(blocks);
  const pendingTransactionsRef = useRef<Transaction[]>(pendingTransactions);
  
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);
  
  useEffect(() => {
    pendingTransactionsRef.current = pendingTransactions;
  }, [pendingTransactions]);

  // Add log message to block creation log
  const addLog = useCallback((message: string) => {
    // Format time as HH:MM:SS
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0];
    
    console.log(message); // Add console logging for debugging
    setBlockCreationLog(prev => [...prev, `[${timeString}] ${message}`]);
  }, []);
  
  // Determine if the current node should be elected as a validator 
  // (5 out of 7 ratio on average)
  const shouldBeElected = useCallback((address: string): boolean => {
    const addressBytes = ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(address)));
    const sum = addressBytes.reduce((acc, val) => acc + val, 0);
    
    // We want roughly 5/7 blocks to be created by us
    return (sum % 7) < 5;
  }, []);

  // Initialize blockchain
  useEffect(() => {
    const initializeBlockchain = async () => {
      try {
        console.log("Initializing blockchain...");
        
        // Generate a smaller number of keys for testing to avoid browser freezing
        const keys = generatePrivateKeys(50); // Reduced from 256 to 50
        setPrivateKeys(keys);
        console.log("Generated private keys");
        
        // Derive addresses from private keys
        const derivedAddresses = deriveAddresses(keys);
        setAddresses(derivedAddresses);
        console.log("Derived addresses");
        
        // Create genesis block
        const genesisTransactions: Transaction[] = [];
        const genesisBlock = createBlock(
          0,
          genesisTransactions,
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          derivedAddresses[0],
          'genesis-zk-proof'
        );
        
        setBlocks([genesisBlock]);
        blocksRef.current = [genesisBlock];
        console.log("Created genesis block");
        
        // Generate initial pending transactions
        const initialTransactions = generateRandomTransactions(derivedAddresses, 15);
        setPendingTransactions(initialTransactions);
        pendingTransactionsRef.current = initialTransactions;
        console.log("Generated initial transactions");
        
        // Set loading to false to render the main interface
        setIsLoading(false);
        console.log("Initialization complete!");
      } catch (error) {
        console.error("Initialization error:", error);
        // Even if there's an error, we should exit the loading state
        setIsLoading(false);
      }
    };

    initializeBlockchain();
  }, []);

  // Create a new block
  const createNewBlock = useCallback(async () => {
    if (isCreatingBlock || addresses.length === 0) {
      return;
    }

    setIsCreatingBlock(true);
    
    try {
      // Use the current blocks and pending transactions from ref to avoid stale closure issues
      const currentBlocks = blocksRef.current;
      const currentPendingTransactions = pendingTransactionsRef.current;
      
      if (currentBlocks.length === 0) {
        console.error("No blocks available");
        return;
      }
      
      // Rotate through nodes (addresses) to simulate different block creators
      const nextNodeIndex = (currentNodeIndex + 1) % addresses.length;
      setCurrentNodeIndex(nextNodeIndex);
      
      const blockCreator = addresses[nextNodeIndex];
      
      // Determine if this should be our validator (approximately 5 out of 7 blocks)
      const isOurValidator = shouldBeElected(blockCreator);
      
      addLog(`Node ${blockCreator.substring(0, 8)}... attempting to create block #${currentBlocks.length}`);
      
      // Generate more random transactions if pool is getting low
      if (currentPendingTransactions.length < TRANSACTIONS_PER_BLOCK * 2) {
        const newTransactions = generateRandomTransactions(addresses, 10);
        setPendingTransactions(prev => [...prev, ...newTransactions]);
        addLog(`Generated ${newTransactions.length} new transactions`);
      }
      
      // Request ZK proof from server (or mock)
      addLog('Requesting ZK proof from localhost:3001...');
      const zkProofResponse = await fetchZKProof(blockCreator);
      
      // For our validator, we want higher probability of being elected
      if (isOurValidator) {
        // Override the election result if needed
        zkProofResponse.elected = true;
        if (zkProofResponse.privateData) {
          zkProofResponse.privateData.eligibilityScore = Math.max(zkProofResponse.privateData.eligibilityScore, zkProofResponse.privateData.threshold + 0.1);
        }
        addLog(`This is your validator - ensuring election for inclusion list creation`);
      }
      
      if (!zkProofResponse.elected) {
        addLog(`Node ${blockCreator.substring(0, 8)}... was not elected by ZK proof`);
        
        if (zkProofResponse.privateData) {
          const { eligibilityScore, threshold, validatorWeight } = zkProofResponse.privateData;
          addLog(`Eligibility score: ${eligibilityScore.toFixed(6)}, Threshold: ${threshold.toFixed(6)}, Weight: ${validatorWeight.toFixed(2)}`);
        }
        
        setIsCreatingBlock(false);
        return;
      }
      
      addLog(`Node ${blockCreator.substring(0, 8)}... was elected! Creating inclusion list...`);
      
      if (zkProofResponse.privateData) {
        const { eligibilityScore, threshold, validatorWeight } = zkProofResponse.privateData;
        addLog(`Eligibility score: ${eligibilityScore.toFixed(6)}, Threshold: ${threshold.toFixed(6)}, Weight: ${validatorWeight.toFixed(2)}`);
      }
      
      
      // Select transactions for new block
      // If it's our validator, include exactly 4 transactions marked as ours
      // plus 6 additional transactions (as if they were included by another validator)
      let transactionsForBlock;
      
      if (isOurValidator) {
        // For our validator, always include exactly 4 transactions
        const transactionsToInclude = Math.min(4, currentPendingTransactions.length);
        let ourTransactions = [];
        
        if (transactionsToInclude < 4) {
          // Generate additional transactions if needed to reach 4
          const additionalNeeded = 4 - transactionsToInclude;
          const additionalTransactions = generateRandomTransactions(addresses, additionalNeeded);
          
          // Combine existing and new transactions, marking them as included by our validator
          ourTransactions = [
            ...currentPendingTransactions.slice(0, transactionsToInclude),
            ...additionalTransactions
          ].map(tx => ({ ...tx, includedByValidator: true }));
          
          // Update the pending transactions to remove ones we used
          setPendingTransactions(prev => {
            const remaining = prev.slice(transactionsToInclude);
            return remaining;
          });
          
          addLog(`Generated ${additionalNeeded} additional transactions to reach 4 for your inclusion list`);
        } else {
          // We have enough transactions, take exactly 4
          ourTransactions = currentPendingTransactions.slice(0, 4).map(tx => ({
            ...tx,
            includedByValidator: true
          }));
          
          // Remove the 4 transactions we used from pending pool
          setPendingTransactions(prev => prev.slice(4));
        }
        
        // Now add 6 more transactions as if they were included by another validator
        let otherValidatorTxs = [];
        
        // Check if we have enough in the pending pool
        if (currentPendingTransactions.length > 4) {
          // Use some from the pending pool
          const remainingPendingCount = currentPendingTransactions.length - 4;
          const txsFromPool = Math.min(6, remainingPendingCount);
          
          otherValidatorTxs = currentPendingTransactions.slice(4, 4 + txsFromPool);
          
          // Remove these from pending pool
          setPendingTransactions(prev => prev.slice(4 + txsFromPool));
          
          // If we still need more, generate them
          if (txsFromPool < 6) {
            const moreNeeded = 6 - txsFromPool;
            const moreTxs = generateRandomTransactions(addresses, moreNeeded);
            otherValidatorTxs = [...otherValidatorTxs, ...moreTxs];
            addLog(`Generated ${moreNeeded} additional transactions to reach 6 for other validators`);
          }
        } else {
          // Generate all 6 transactions
          otherValidatorTxs = generateRandomTransactions(addresses, 6);
          addLog(`Generated 6 additional transactions for other validators`);
        }
        
        // Combine our transactions and other validators' transactions
        transactionsForBlock = [...ourTransactions, ...otherValidatorTxs];
        
        addLog(`Your validator created an inclusion list with exactly 4 transactions + 6 from other validators`);
      } else {
        // For other validators, use the regular TRANSACTIONS_PER_BLOCK
        // Let's make it 10 total transactions for consistency with our validator blocks
        const txsToInclude = Math.min(TRANSACTIONS_PER_BLOCK, currentPendingTransactions.length);
        
        transactionsForBlock = currentPendingTransactions.slice(0, txsToInclude);
        
        // If we need more to reach 10, generate them
        if (txsToInclude < TRANSACTIONS_PER_BLOCK) {
          const additionalNeeded = TRANSACTIONS_PER_BLOCK - txsToInclude;
          const additionalTxs = generateRandomTransactions(addresses, additionalNeeded);
          transactionsForBlock = [...transactionsForBlock, ...additionalTxs];
          addLog(`Generated ${additionalNeeded} additional transactions to reach ${TRANSACTIONS_PER_BLOCK}`);
        }
        
        // Remove selected transactions from pending pool
        setPendingTransactions(prev => prev.slice(txsToInclude));
      }
      
      // Create the new block
      const previousBlock = currentBlocks[currentBlocks.length - 1];
      const newBlock = createBlock(
        currentBlocks.length,
        transactionsForBlock,
        previousBlock.hash,
        blockCreator,
        zkProofResponse.proof,
        zkProofResponse.privateData
      );
      
      // Simulate broadcasting the block
      addLog(`Broadcasting block #${newBlock.id} to the network...`);
      await broadcastBlock(newBlock);
      
      // Add the new block to the chain
      setBlocks(prev => [...prev, newBlock]);
      
      addLog(`Block #${newBlock.id} created successfully with ${newBlock.transactions.length} transactions`);
      
      if (isOurValidator) {
        addLog(`Your validator successfully included ${newBlock.transactions.length} transactions in the block`);
      }
    } catch (error) {
      console.error('Error creating block:', error);
      addLog(`Error creating block: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsCreatingBlock(false);
    }
  }, [
    isCreatingBlock,
    addresses,
    currentNodeIndex,
    addLog,
    shouldBeElected
  ]);
  
  // Toggle blockchain running state
  const toggleRunning = useCallback(() => {
    setIsRunning(prev => {
      const newState = !prev;
      debugLog(`Blockchain ${newState ? 'resumed' : 'halted'}`);
      addLog(`Blockchain ${newState ? 'resumed' : 'halted'}`);
      return newState;
    });
  }, [addLog]);

  // Update block time
  const updateBlockTime = useCallback((newBlockTimeMs: number) => {
    setBlockTime(newBlockTimeMs);
    debugLog(`Block time updated to ${newBlockTimeMs}ms (${newBlockTimeMs/1000} seconds)`);
    addLog(`Block time updated to ${newBlockTimeMs/1000} seconds`);
  }, [addLog]);

  // Schedule block creation
  useEffect(() => {
    if (isLoading || !isRunning) {
      return; // Don't start the interval if loading or not running
    }
    
    debugLog(`Setting up block creation interval: ${blockTime}ms`);
    const blockInterval = setInterval(() => {
      createNewBlock();
    }, blockTime);

    return () => {
      debugLog("Clearing block creation interval");
      clearInterval(blockInterval);
    };
  }, [isLoading, isRunning, blockTime, createNewBlock]);

  return {
    blocks,
    pendingTransactions,
    currentNodeIndex,
    isLoading,
    blockCreationLog,
    isCreatingBlock,
    addresses,
    isRunning,
    blockTime,
    toggleRunning,
    updateBlockTime
  };
};