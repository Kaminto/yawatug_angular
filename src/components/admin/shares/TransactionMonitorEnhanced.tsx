
import React from 'react';
import ShareTransactionMonitor from './ShareTransactionMonitor';

interface TransactionMonitorEnhancedProps {
  shareData: any;
}

const TransactionMonitorEnhanced: React.FC<TransactionMonitorEnhancedProps> = ({ shareData }) => {
  return <ShareTransactionMonitor shareData={shareData} />;
};

export default TransactionMonitorEnhanced;
