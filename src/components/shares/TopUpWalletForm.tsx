
import React, { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const formSchema = z.object({
  wallet_id: z.string().uuid(),
  amount: z.number().positive().min(1),
  payment_method: z.string()
});

export interface TopUpWalletFormProps {
  isOpen?: boolean;
  onClose?: () => void;
  wallets: any[];
  onTopUpComplete?: () => void;
}

const TopUpWalletForm: React.FC<TopUpWalletFormProps> = ({ 
  isOpen = false, 
  onClose, 
  wallets,
  onTopUpComplete 
}) => {
  const [loading, setLoading] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      wallet_id: '',
      amount: 0,
      payment_method: 'bank_transfer'
    }
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      
      // Get the selected wallet
      const wallet = wallets.find(w => w.id === values.wallet_id);
      if (!wallet) return;
      
      // Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // 1. Add transaction record
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          wallet_id: values.wallet_id,
          amount: values.amount,
          transaction_type: 'deposit',
          status: 'completed',
          currency: wallet.currency,
          reference: `Wallet top-up via ${values.payment_method}`
        })
        .select()
        .single();
      
      if (transactionError) throw transactionError;
      
      // 2. Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({
          balance: wallet.balance + values.amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', values.wallet_id);
      
      if (walletError) throw walletError;
      
      toast.success('Wallet topped up successfully');
      form.reset();
      
      if (onClose) onClose();
      if (onTopUpComplete) onTopUpComplete();
    } catch (error: any) {
      console.error('Error topping up wallet:', error);
      toast.error('Failed to top up wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Top Up Wallet</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="wallet_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Wallet</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select wallet" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {wallets.map(wallet => (
                          <SelectItem key={wallet.id} value={wallet.id}>
                            {wallet.currency} Wallet
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
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
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="mobile_money">Mobile Money</SelectItem>
                        <SelectItem value="card">Credit/Debit Card</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Processing...' : 'Top Up'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TopUpWalletForm;
