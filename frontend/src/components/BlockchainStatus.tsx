import React from 'react';

interface BlockchainStatusProps {
  addresses: string[];
  currentNodeIndex: number;
  isCreatingBlock: boolean;
  blockCreationLog: string[];
  blockTimeMs?: number;
  isRunning?: boolean;
}

const BlockchainStatus: React.FC<BlockchainStatusProps> = ({
  addresses,
  currentNodeIndex,
  isCreatingBlock,
  blockCreationLog,
  blockTimeMs = 12000,
  isRunning = true,
}) => {
  const getCurrentNodeAddress = () => {
    if (addresses.length === 0 || currentNodeIndex >= addresses.length) {
      return 'N/A';
    }
    const address = addresses[currentNodeIndex];
    return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
  };

  return (
    <div className="blockchain-status">
      <h2>ZK-FOCIL Blockchain Status</h2>
      
      <div className="status-grid">
        <div className="status-item">
          <h3>Network Status</h3>
          <div className="status-details">
            <p>Total Nodes: {addresses.length}</p>
            <p>Current Node: {getCurrentNodeAddress()}</p>
            <p>Status: {isRunning ? (
              isCreatingBlock ? (
                <span className="status-creating">Creating Block...</span>
              ) : (
                <span className="status-idle">Idle</span>
              )
            ) : (
              <span className="status-halted">Halted</span>
            )}</p>
            <p>Next Block In: {isRunning ? <BlockTimer blockTimeMs={blockTimeMs} /> : <span className="block-timer-paused">Paused</span>}</p>
          </div>
        </div>
        
        <div className="status-item">
          <h3>Block Creation Log</h3>
          <div className="log-container">
            {blockCreationLog.slice(-10).map((log, index) => (
              <div key={index} className="log-entry">
                {log}
              </div>
            ))}
            {blockCreationLog.length === 0 && <p>No log entries yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

// A simple component to show a countdown timer until next block
interface BlockTimerProps {
  blockTimeMs?: number;
}

const BlockTimer: React.FC<BlockTimerProps> = ({ blockTimeMs = 12000 }) => {
  const blockTimeSeconds = Math.floor(blockTimeMs / 1000);
  const [secondsLeft, setSecondsLeft] = React.useState<number>(blockTimeSeconds);
  
  React.useEffect(() => {
    // Reset timer when block time changes
    setSecondsLeft(blockTimeSeconds);
    
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          return blockTimeSeconds;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [blockTimeSeconds]);
  
  return <span className="block-timer">{secondsLeft}s</span>;
};

export default BlockchainStatus;