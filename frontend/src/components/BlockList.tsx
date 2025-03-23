import React, { useState } from 'react';
import { Block } from '../types';
import TransactionList from './TransactionList';

interface BlockListProps {
  blocks: Block[];
  currentNodeAddress?: string;
}

const BlockList: React.FC<BlockListProps> = ({ blocks, currentNodeAddress }) => {
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
              className={`block-card ${expandedBlockId === block.id ? 'expanded' : ''} ${block.creator === currentNodeAddress ? 'validator-block' : ''}`}
              onClick={() => toggleBlock(block.id)}
            >
              <div className="block-header">
                <h3>
                  Block #{block.id}
                  {block.creator === currentNodeAddress && (
                    <span className="validator-flag">Your Validator</span>
                  )}
                </h3>
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
                <div className="block-details">
                  {block.zkPrivateData && (
                    <div className="zk-private-data">
                      <h4>ZK Private Data (Used for Proof Generation)</h4>
                      <div className="zk-data-grid">
                        <div>
                          <p><strong>Randomness:</strong> {block.zkPrivateData.randomness}</p>
                          <p><strong>Timestamp:</strong> {new Date(block.zkPrivateData.timestamp * 1000).toLocaleString()}</p>
                        </div>
                        <div>
                          <p><strong>Eligibility Score:</strong> {block.zkPrivateData.eligibilityScore.toFixed(6)}</p>
                          <p><strong>Threshold:</strong> {block.zkPrivateData.threshold.toFixed(6)}</p>
                          <p><strong>Validator Weight:</strong> {block.zkPrivateData.validatorWeight.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="block-transactions">
                    <TransactionList 
                      transactions={block.transactions}
                      title="Transactions in Block"
                      highlightAddress={block.creator}
                    />
                    {block.creator === currentNodeAddress && (
                      <div className="inclusion-info">
                        <p>
                          <span className="inclusion-badge">Included</span>
                          Your validator included exactly 4 transactions in this block (highlighted in green)
                        </p>
                        <p className="other-validator-note">
                          The other 6 transactions were included by other validators
                        </p>
                      </div>
                    )}
                  </div>
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