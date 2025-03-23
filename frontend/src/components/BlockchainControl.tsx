import React, { useState } from 'react';

interface BlockchainControlProps {
  isRunning: boolean;
  blockTime: number;
  onToggleRunning: () => void;
  onUpdateBlockTime: (newBlockTime: number) => void;
}

const BlockchainControl: React.FC<BlockchainControlProps> = ({
  isRunning,
  onToggleRunning,
}) => {
  return (
    <div className="blockchain-control">
      <h3>Blockchain Controls</h3>
      <div className="control-panel">
        <button 
          className={`control-button ${isRunning ? 'stop' : 'start'}`}
          onClick={onToggleRunning}
        >
          {isRunning ? 'Halt Blockchain' : 'Resume Blockchain'}
        </button>
        <div className="Chain data">
          <p>Block Time: 12 seconds</p>
        </div>
      </div>
    </div>
  );
};

export default BlockchainControl;