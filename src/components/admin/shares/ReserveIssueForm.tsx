
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ReserveIssueFormProps {
  onSuccess: () => void;
}

interface UserOption {
  id: string;
  full_name: string;
  email: string;
}

const ReserveIssueForm: React.FC<ReserveIssueFormProps> = ({ onSuccess }) => {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const form = useForm({
    defaultValues: {
      user_id: '',
      quantity: 0,
      issue_rate: 0,
      reason: ''
    }
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Failed to load users",
        description: "Could not load user list",
        variant: "destructive"
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      // Get current share data
      const { data: shareData, error: shareError } = await supabase
        .from('shares')
        .select('*')
        .single();

      if (shareError) throw shareError;

      // Check if there are enough reserved shares
      if (values.quantity > (shareData.reserved_shares - (shareData.reserved_issued || 0))) {
        toast({
          title: "Insufficient Reserved Shares",
          description: "Not enough reserved shares available for this issue",
          variant: "destructive"
        });
        return;
      }

      // Create the share transaction record
      const { error: transactionError } = await supabase
        .from('share_transactions')
        .insert({
          user_id: values.user_id,
          share_id: shareData.id,
          transaction_type: 'reserve_issue',
          quantity: values.quantity,
          price_per_share: values.issue_rate,
          currency: shareData.currency,
          status: 'completed',
          transfer_reason: values.reason
        });

      if (transactionError) throw transactionError;

      // Create user shares record
      const { error: userSharesError } = await supabase
        .from('user_shares')
        .insert({
          user_id: values.user_id,
          share_id: shareData.id,
          quantity: values.quantity,
          purchase_price_per_share: values.issue_rate,
          currency: shareData.currency
        });

      if (userSharesError) throw userSharesError;

      // Update reserved issued count
      const { error: updateError } = await supabase
        .from('shares')
        .update({
          reserved_issued: (shareData.reserved_issued || 0) + values.quantity
        })
        .eq('id', shareData.id);

      if (updateError) throw updateError;

      toast({
        title: "Reserve Shares Issued",
        description: `Successfully issued ${values.quantity} shares to the selected user`
      });

      form.reset();
      onSuccess();

    } catch (error: any) {
      console.error('Error issuing reserve shares:', error);
      toast({
        title: "Failed to Issue Shares",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issue Reserve Shares</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select User</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user to issue shares to" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingUsers ? (
                        <SelectItem value="loading" disabled>Loading users...</SelectItem>
                      ) : (
                        users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name} ({user.email})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity to Issue</FormLabel>
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
              name="issue_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Rate (Price per Share)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0"
                      step="0.01"
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
                  <FormLabel>Reason for Issue</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Provide a reason for this reserve share issue..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={loading || loadingUsers}>
              {loading ? 'Issuing Shares...' : 'Issue Reserve Shares'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ReserveIssueForm;
