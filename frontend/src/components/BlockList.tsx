import React, { useState } from 'react';
import { Block } from '../types';
import TransactionList from './TransactionList';

interface BlockListProps {
  blocks: Block[];
}

const BlockList: React.FC<BlockListProps> = ({ blocks }) => {
  const [expandedBlockId, setExpandedBlockId] = useState<number | null>(null);
  
  const toggleBlock = (blockId: number) => {
    if (expandedBlockId === blockId) {
      setExpandedBlockId(null);
    } else {
      setExpandedBlockId(blockId);
    }
  };
  
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  const shortenHash = (hash: string) => `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
  
  const shortenAddress = (address: string) => `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  
  return (
    <div className="block-list">
      <h2>Blocks ({blocks.length})</h2>
      {blocks.length > 0 ? (
        <div className="blocks-container">
          {blocks.map((block) => (
            <div 
              key={block.id} 
              className={`block-card ${expandedBlockId === block.id ? 'expanded' : ''}`}
              onClick={() => toggleBlock(block.id)}
            >
              <div className="block-header">
                <h3>Block #{block.id}</h3>
                <div className="block-info">
                  <p>Time: {formatTimestamp(block.timestamp)}</p>
                  <p>Creator: {shortenAddress(block.creator)}</p>
                  <p>Hash: {shortenHash(block.hash)}</p>
                  <p>Prev: {shortenHash(block.previousHash)}</p>
                  <p>ZK Proof: {`${block.zkProof.substring(0, 15)}...`}</p>
                  <p>Tx Count: {block.transactions.length}</p>
                </div>
              </div>
              
              {expandedBlockId === block.id && (
                <div className="block-transactions">
                  <TransactionList 
                    transactions={block.transactions}
                    title="Transactions in Block"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p>No blocks created yet</p>
      )}
    </div>
  );
};

export default BlockList;