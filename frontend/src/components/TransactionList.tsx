import React from 'react';
import { Transaction } from '../types';
import { ethers } from 'ethers';

interface TransactionListProps {
  transactions: Transaction[];
  title: string;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, title }) => {
  const shortenAddress = (address: string) => `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  
  const formatEther = (wei: string) => {
    try {
      return parseFloat(ethers.utils.formatEther(wei)).toFixed(6);
    } catch (e) {
      return '0.000000';
    }
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
                <tr key={tx.id}>
                  <td>{tx.id.substring(0, 8)}</td>
                  <td>{shortenAddress(tx.from)}</td>
                  <td>{shortenAddress(tx.to)}</td>
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