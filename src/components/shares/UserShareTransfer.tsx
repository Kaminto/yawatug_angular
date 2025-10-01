import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import EnhancedUserHoldings from '@/components/shares/EnhancedUserHoldings';
import { useShareTransfer } from '@/hooks/useShareTransfer';
import { useEnhancedTransferLimits } from '@/hooks/useEnhancedTransferLimits';

interface UserShareTransferProps {
  userId: string | null;
  onTransferComplete: () => void;
}

const UserShareTransfer: React.FC<UserShareTransferProps> = ({
  userId,
  onTransferComplete
}) => {
  const { loading, createTransferRequest } = useShareTransfer();
  const { calculateTransferFee } = useEnhancedTransferLimits();
  const [transferFee, setTransferFee] = useState(0);

  const form = useForm({
    defaultValues: {
      shareId: '',
      recipientEmail: '',
      quantity: 1,
      reason: '',
    },
    mode: 'onChange'
  });

  const handleCalculateTransferFee = (quantity: number, shareId: string, holdings: any[]) => {
    const share = holdings.find(s => s.share_id === shareId);
    if (!share) {
      setTransferFee(0);
      return;
    }

    const sharePrice = share.shares?.price_per_share || 0;
    const feeCalculation = calculateTransferFee(quantity, sharePrice);
    setTransferFee(feeCalculation.fee);
  };

  const handleTransferShares = async (values: any, holdings: any[]) => {
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }
    
    try {
      console.log('Starting share transfer with values:', values);
      
      // Find the share being transferred
      const shareToTransfer = holdings.find(s => s.share_id === values.shareId);
      if (!shareToTransfer) {
        toast.error('Share not found');
        return;
      }

      // Validate quantity
      if (values.quantity > shareToTransfer.quantity) {
        toast.error('Cannot transfer more shares than you own');
        return;
      }

      const sharePrice = shareToTransfer.shares?.price_per_share || 0;
      const transferValue = values.quantity * sharePrice;

      console.log('Transfer data:', {
        shareId: values.shareId,
        quantity: values.quantity,
        sharePrice,
        transferValue,
        transferFee
      });

      const transferData = {
        shareId: values.shareId,
        quantity: values.quantity,
        recipientId: values.recipientEmail, // The hook will resolve this to actual ID
        reason: values.reason,
        sharePrice: sharePrice,
        transferValue: transferValue,
        transferFee: transferFee
      };

      const result = await createTransferRequest(transferData, userId);
      console.log('Transfer result:', result);
      
      form.reset();
      setTransferFee(0);
      onTransferComplete();
    } catch (error: any) {
      console.error('Error transferring shares:', error);
      toast.error(error.message || 'Failed to transfer shares');
    }
  };

  return (
    <EnhancedUserHoldings userId={userId!}>
      {(holdings, loading: boolean, refreshHoldings) => {
        const directHoldings = holdings.filter(h => h.source === 'direct');

        // Effect to calculate transfer fee when share or quantity changes
        useEffect(() => {
          const shareId = form.watch('shareId');
          const quantity = form.watch('quantity');
          
          console.log('Form values changed:', { shareId, quantity });
          
          if (shareId && quantity > 0) {
            handleCalculateTransferFee(quantity, shareId, directHoldings);
          } else {
            setTransferFee(0);
          }
        }, [form.watch('shareId'), form.watch('quantity'), directHoldings, form.watch]);

        return (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Shares</CardTitle>
              <CardDescription>
                Transfer your direct shares to another user for a small fee (progressive shares cannot be transferred)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((values) => handleTransferShares(values, directHoldings))} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="shareId"
                    rules={{ required: 'Please select a share to transfer' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Share</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a share to transfer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {directHoldings.map((share) => (
                              <SelectItem key={share.share_id} value={share.share_id}>
                                {share.shares?.name} - {share.quantity} available
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="recipientEmail"
                    rules={{ required: 'Recipient email is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipient Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="recipient@example.com"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="quantity"
                    rules={{ required: 'Quantity is required', min: { value: 1, message: 'Minimum quantity is 1' }}}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity to Transfer</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            {...field} 
                            onChange={e => field.onChange(Number(e.target.value))} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="e.g., Gift, Trade, Family transfer..."
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {transferFee > 0 && (
                    <div className="bg-muted p-3 rounded-md">
                      <div className="flex justify-between">
                        <span>Transfer Fee:</span>
                        <span className="font-semibold">UGX {transferFee.toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        This fee will be deducted from your wallet
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    disabled={loading || !form.formState.isValid || !form.getValues('shareId') || !form.getValues('recipientEmail')} 
                    className="w-full"
                  >
                    {loading ? 'Processing...' : 'Send Transfer Request'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        );
      }}
    </EnhancedUserHoldings>
  );
};

export default UserShareTransfer;