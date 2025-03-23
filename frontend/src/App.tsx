import React, { useEffect } from 'react';
import './App.css';
import { useBlockchain } from './hooks/useBlockchain';
import BlockList from './components/BlockList';
import TransactionList from './components/TransactionList';
import BlockchainStatus from './components/BlockchainStatus';
import BlockchainControl from './components/BlockchainControl';

function App() {
  const {
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
  } = useBlockchain();

  // Debug logging
  useEffect(() => {
    console.log("App render state:", { 
      isLoading, 
      blocksCount: blocks.length,
      pendingCount: pendingTransactions.length,
      addressesCount: addresses.length 
    });
  }, [isLoading, blocks.length, pendingTransactions.length, addresses.length]);

  if (isLoading) {
    return (
      <div className="loading">
        <h1>Initializing Ethereum ZK-FOCIL Blockchain...</h1>
        <p>Generating private keys and initializing the blockchain</p>
        <p>This may take a few moments...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Ethereum ZK-FOCIL Proof of Concept</h1>
        <p>A zero-knowledge proof-based blockchain implementation demo</p>
      </header>
      
      <main className="app-content">
        <div className="grid-container">
          <div className="grid-item status">
            <div className="status-controls-wrapper">
              <BlockchainStatus
                addresses={addresses}
                currentNodeIndex={currentNodeIndex}
                isCreatingBlock={isCreatingBlock}
                blockCreationLog={blockCreationLog}
                blockTimeMs={blockTime}
                isRunning={isRunning}
              />
              <BlockchainControl
                isRunning={isRunning}
                blockTime={blockTime}
                onToggleRunning={toggleRunning}
                onUpdateBlockTime={updateBlockTime}
              />
            </div>
          </div>
          
          <div className="grid-item blocks">
            <BlockList 
              blocks={blocks} 
              currentNodeAddress={addresses[currentNodeIndex]}
            />
          </div>
          
          <div className="grid-item transactions">
            <TransactionList
              transactions={pendingTransactions}
              title="Pending Transactions"
            />
          </div>
        </div>
      </main>
      
      <footer className="app-footer">
        <p>Ethereum ZK-FOCIL Proof of Concept | © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;