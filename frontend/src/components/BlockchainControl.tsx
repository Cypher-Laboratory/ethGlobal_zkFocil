import React, { useState } from 'react';

interface BlockchainControlProps {
  isRunning: boolean;
  blockTime: number;
  onToggleRunning: () => void;
  onUpdateBlockTime: (newBlockTime: number) => void;
}

const BlockchainControl: React.FC<BlockchainControlProps> = ({
  isRunning,
  blockTime,
  onToggleRunning,
  onUpdateBlockTime
}) => {
  const [inputBlockTime, setInputBlockTime] = useState<string>((blockTime / 1000).toString());

  const handleBlockTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputBlockTime(e.target.value);
  };

  const handleBlockTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newBlockTimeSeconds = parseInt(inputBlockTime, 10);
    if (!isNaN(newBlockTimeSeconds) && newBlockTimeSeconds >= 1) {
      // Convert seconds to milliseconds for internal use
      onUpdateBlockTime(newBlockTimeSeconds * 1000);
    } else {
      // Reset to current block time if invalid input
      setInputBlockTime((blockTime / 1000).toString());
      alert('Please enter a valid block time (minimum 1 second)');
    }
  };

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

        <form onSubmit={handleBlockTimeSubmit} className="block-time-form">
          <div className="form-group">
            <label htmlFor="blockTime">Block Time (seconds):</label>
            <div className="input-with-button">
              <input
                type="number"
                id="blockTime"
                min="1"
                step="1"
                value={inputBlockTime}
                onChange={handleBlockTimeChange}
                disabled={isRunning}
              />
              <button 
                type="submit"
                disabled={isRunning}
                className="update-button"
              >
                Update
              </button>
            </div>
            {isRunning && (
              <small className="form-note">Halt blockchain to change block time</small>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default BlockchainControl;