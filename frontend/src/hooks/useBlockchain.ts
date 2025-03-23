import { useEffect, useState, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { Block, Transaction } from '../types';
import { generatePrivateKeys, deriveAddresses } from '../utils/keyGenerator';
import { generateRandomTransactions } from '../utils/transactionGenerator';
import { fetchZKProof, createBlock, broadcastBlock } from '../utils/blockService';
import { debugLog } from '../utils/debug';
// Number of transactions to include in each block
const TRANSACTIONS_PER_BLOCK = 10;

// Block creation interval in milliseconds (default 12 seconds)
const DEFAULT_BLOCK_INTERVAL = 12000;

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
    console.log(message); // Add console logging for debugging
    setBlockCreationLog(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
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
      
      if (!zkProofResponse.elected) {
        addLog(`Node ${blockCreator.substring(0, 8)}... was not elected by ZK proof`);
        setIsCreatingBlock(false);
        return;
      }
      
      addLog(`Node ${blockCreator.substring(0, 8)}... was elected! Creating inclusion list...`);
      
      // Select transactions for new block
      const transactionsForBlock = currentPendingTransactions.slice(0, TRANSACTIONS_PER_BLOCK);
      
      // Remove selected transactions from pending pool
      setPendingTransactions(prev => prev.slice(TRANSACTIONS_PER_BLOCK));
      
      // Create the new block
      const previousBlock = currentBlocks[currentBlocks.length - 1];
      const newBlock = createBlock(
        currentBlocks.length,
        transactionsForBlock,
        previousBlock.hash,
        blockCreator,
        zkProofResponse.proof
      );
      
      // Simulate broadcasting the block
      addLog(`Broadcasting block #${newBlock.id} to the network...`);
      await broadcastBlock(newBlock);
      
      // Add the new block to the chain
      setBlocks(prev => [...prev, newBlock]);
      
      addLog(`Block #${newBlock.id} created successfully with ${newBlock.transactions.length} transactions`);
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
    addLog
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