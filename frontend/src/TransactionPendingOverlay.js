import React from 'react';
import './TransactionPendingOverlay.css';

const TransactionPendingOverlay = ({ open, message, onClose }) => {
  if (!open) return null;
  return (
    <div className="tx-overlay-backdrop" onClick={onClose}>
      <div className="tx-overlay-card" onClick={e => e.stopPropagation()}>
        <div className="tx-spinner" />
        <h2 className="tx-overlay-heading">Transaction Pending</h2>
        <p className="tx-overlay-message">{message || 'Your transaction is being processed. Please wait...'} </p>
      </div>
    </div>
  );
};

export default TransactionPendingOverlay; 