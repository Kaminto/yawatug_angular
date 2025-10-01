import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ShareTransferData {
  shareId: string;
  quantity: number;
  recipientId: string;
  reason?: string;
  sharePrice: number;
  transferValue: number;
  transferFee: number;
}

export const useShareTransfer = () => {
  const [loading, setLoading] = useState(false);

  const createTransferRequest = useCallback(async (transferData: ShareTransferData, userId: string) => {
    setLoading(true);
    try {
      // If recipientId is an email, resolve it to user ID
      let recipientId = transferData.recipientId;
      if (transferData.recipientId.includes('@')) {
        const { data: recipient, error: recipientError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('email', transferData.recipientId)
          .single();
          
        if (recipientError || !recipient) {
          throw new Error('Recipient not found. Please check the email address.');
        }
        
        if (recipient.id === userId) {
          throw new Error('Cannot transfer shares to yourself');
        }
        
        recipientId = recipient.id;
      }

      // Validate wallet balance for transfer fee
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .eq('currency', 'UGX')
        .single();

      if (!wallet || wallet.balance < transferData.transferFee) {
        throw new Error('Insufficient wallet balance to cover transfer fee');
      }

      // Create transfer request
      const { data, error } = await supabase
        .from('share_transfer_requests')
        .insert({
          sender_id: userId,
          recipient_id: recipientId,
          share_id: transferData.shareId,
          quantity: transferData.quantity,
          share_price: transferData.sharePrice,
          transfer_value: transferData.transferValue,
          transfer_fee: transferData.transferFee,
          reason: transferData.reason,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Process transfer using edge function for better reliability
      const { data: processResult, error: processError } = await supabase.functions.invoke(
        'process-share-transfer',
        {
          body: { transferId: data.id }
        }
      );

      if (processError) {
        throw new Error(processError.message || 'Failed to process transfer');
      }

      if (processResult?.success) {
        toast.success('Transfer completed successfully! The shares have been transferred.');
      } else {
        toast.error(processResult?.error || 'Transfer processing failed');
      }

      return data;
    } catch (error: any) {
      console.error('Error creating transfer request:', error);
      toast.error(error.message || 'Failed to create transfer request');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTransferHistory = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('share_transfer_requests')
        .select(`
          *,
          sender:sender_id (full_name, email),
          recipient:recipient_id (full_name, email),
          share:share_id (name, price_per_share)
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching transfer history:', error);
      return [];
    }
  }, []);

  return {
    loading,
    createTransferRequest,
    getTransferHistory
  };
};