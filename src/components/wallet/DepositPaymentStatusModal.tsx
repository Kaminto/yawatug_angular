import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EnhancedLoading } from '@/components/ui/enhanced-loading';
import { CircularCountdown } from '@/components/ui/circular-countdown';
import { CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DepositPaymentStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string | null;
  transactionReference: string | null;
  onComplete?: () => void;
}

export const DepositPaymentStatusModal: React.FC<DepositPaymentStatusModalProps> = ({
  open,
  onOpenChange,
  transactionId,
  transactionReference,
  onComplete
}) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'pending'>('loading');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [message, setMessage] = useState('Processing your deposit...');
  
  const MINIMUM_WAIT_TIME = 30; // 30 seconds
  const POLL_INTERVAL = 3000; // Poll every 3 seconds

  useEffect(() => {
    if (!open || !transactionId) return;

    let pollInterval: NodeJS.Timeout;
    let timeoutTimer: NodeJS.Timeout;
    let elapsedTimer: NodeJS.Timeout;

    const pollTransactionStatus = async () => {
      try {
        const { data: transaction, error } = await supabase
          .from('transactions')
          .select('status, metadata')
          .eq('id', transactionId)
          .single();

        if (error) {
          console.error('Error polling transaction status:', error);
          return;
        }

        if (transaction) {
          console.log('Transaction status:', transaction.status);
          
          // Check if payment is successful
          if (transaction.status === 'completed' || transaction.status === 'success') {
            setStatus('success');
            setMessage('Payment successful! Your deposit has been confirmed.');
            
            // Close modal after showing success for 3 seconds
            setTimeout(() => {
              onOpenChange(false);
              onComplete?.();
            }, 3000);
            
            // Clear polling
            if (pollInterval) clearInterval(pollInterval);
            if (timeoutTimer) clearTimeout(timeoutTimer);
            if (elapsedTimer) clearInterval(elapsedTimer);
          }
        }
      } catch (error) {
        console.error('Error checking transaction status:', error);
      }
    };

    // Start polling immediately
    pollTransactionStatus();
    pollInterval = setInterval(pollTransactionStatus, POLL_INTERVAL);

    // Track elapsed time
    elapsedTimer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    // Set minimum wait time timeout
    timeoutTimer = setTimeout(() => {
      // If still loading after minimum time, mark as pending
      if (status === 'loading') {
        setStatus('pending');
        setMessage('Your deposit is being processed. You will be notified once confirmed.');
        
        // Close modal after 3 seconds
        setTimeout(() => {
          onOpenChange(false);
          onComplete?.();
        }, 3000);
      }
      
      // Clear polling
      if (pollInterval) clearInterval(pollInterval);
    }, MINIMUM_WAIT_TIME * 1000);

    // Cleanup
    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (elapsedTimer) clearInterval(elapsedTimer);
    };
  }, [open, transactionId, status, onOpenChange]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStatus('loading');
      setElapsedTime(0);
      setMessage('Processing your deposit...');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {status === 'success' ? 'Payment Successful' : 
             status === 'pending' ? 'Payment Pending' : 
             'Processing Payment'}
          </DialogTitle>
          <DialogDescription>
            {transactionReference && (
              <span className="text-xs text-muted-foreground">
                Reference: {transactionReference}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          {status === 'loading' && (
            <>
              <div className="relative">
                <CircularCountdown totalSeconds={MINIMUM_WAIT_TIME} elapsedSeconds={elapsedTime} size={120} />
              </div>
              <p className="text-center text-sm text-muted-foreground">{message}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Waiting for confirmation • {Math.max(MINIMUM_WAIT_TIME - elapsedTime, 0)}s remaining</span>
              </div>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-600 animate-in zoom-in duration-300" />
              <p className="text-center font-medium text-green-600">
                {message}
              </p>
            </>
          )}
          
          {status === 'pending' && (
            <>
              <Clock className="h-16 w-16 text-orange-600 animate-in zoom-in duration-300" />
              <p className="text-center font-medium text-orange-600">
                {message}
              </p>
              <p className="text-xs text-center text-muted-foreground">
                Check your transaction history for updates
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
