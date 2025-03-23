import React from 'react';
import { Transaction } from '../types';
import { ethers } from 'ethers';

interface TransactionListProps {
  transactions: Transaction[];
  title: string;
  highlightAddress?: string | null; // Address to highlight (current validator)
}

const TransactionList: React.FC<TransactionListProps> = ({ 
  transactions, 
  title, 
  highlightAddress = null 
}) => {
  const shortenAddress = (address: string) => `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  
  const formatEther = (wei: string) => {
    try {
      return parseFloat(ethers.utils.formatEther(wei)).toFixed(6);
    } catch (e) {
      return '0.000000';
    }
  };

  // Check if transaction is from or to the current validator
  const isValidatorTransaction = (tx: Transaction) => {
    if (!highlightAddress) return false;
    return tx.from.toLowerCase() === highlightAddress.toLowerCase() || 
           tx.to.toLowerCase() === highlightAddress.toLowerCase();
  };
  
  // Check if transaction was included by our validator in the inclusion list
  const isIncludedByValidator = (tx: Transaction) => {
    return !!tx.includedByValidator;
  };
  
  return (
    <div className="transaction-list">
      <h3>{title} ({transactions.length})</h3>
      {transactions.length > 0 ? (
        <div className="transaction-table-container">
          <table className="transaction-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>From</th>
                <th>To</th>
                <th>Value (ETH)</th>
                <th>Hash</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr 
                  key={tx.id} 
                  className={`
                    ${isValidatorTransaction(tx) ? "validator-transaction" : ""}
                    ${isIncludedByValidator(tx) ? "inclusion-list-transaction" : ""}
                  `}
                >
                  <td>
                    {isValidatorTransaction(tx) && <span className="validator-badge">Validator</span>}
                    {isIncludedByValidator(tx) && <span className="inclusion-badge">Included</span>}
                    {tx.id.substring(0, 8)}
                  </td>
                  <td className={tx.from.toLowerCase() === highlightAddress?.toLowerCase() ? "highlight-address" : ""}>
                    {shortenAddress(tx.from)}
                  </td>
                  <td className={tx.to.toLowerCase() === highlightAddress?.toLowerCase() ? "highlight-address" : ""}>
                    {shortenAddress(tx.to)}
                  </td>
                  <td>{formatEther(tx.value)}</td>
                  <td>{`${tx.hash.substring(0, 10)}...`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No transactions</p>
      )}
    </div>
  );
};

export default TransactionList;