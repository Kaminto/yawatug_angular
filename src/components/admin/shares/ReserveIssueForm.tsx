import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Edit2, X } from "lucide-react";
import { format } from "date-fns";

interface ReserveIssueFormProps {
  onSuccess: () => void;
}

interface UserOption {
  value: string;
  label: string;
}

interface RecentIssue {
  id: string;
  user_id: string;
  quantity: number;
  issue_rate: number;
  created_at: string;
  user_name: string;
  user_email: string;
}

export const ReserveIssueForm = ({ onSuccess }: ReserveIssueFormProps) => {
  const form = useForm({
    defaultValues: {
      userId: "",
      quantity: 0,
      issueRate: 0,
      reason: ""
    }
  });

  const [users, setUsers] = useState<UserOption[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentIssues, setRecentIssues] = useState<RecentIssue[]>([]);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
    loadRecentIssues();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;

      setUsers((data || []).map(user => ({
        value: user.id,
        label: `${user.full_name} (${user.email})`
      })));
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadRecentIssues = async () => {
    try {
      const { data, error } = await supabase
        .from('share_transactions')
        .select(`
          id,
          user_id,
          quantity,
          price_per_share,
          created_at,
          profiles!share_transactions_user_id_fkey (
            full_name,
            email
          )
        `)
        .eq('transaction_type', 'reserve_issue')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setRecentIssues((data || []).map(issue => {
        const profile = Array.isArray(issue.profiles) ? issue.profiles[0] : issue.profiles;
        return {
          id: issue.id,
          user_id: issue.user_id,
          quantity: issue.quantity,
          issue_rate: issue.price_per_share,
          created_at: issue.created_at,
          user_name: profile?.full_name || '',
          user_email: profile?.email || ''
        };
      }));
    } catch (error) {
      console.error('Error loading recent issues:', error);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setIsSubmitting(true);

      // Get current share data
      const { data: shareData, error: shareError } = await supabase
        .from('shares')
        .select('*')
        .single();

      if (shareError) throw shareError;

      // Check if there are enough reserved shares
      if (values.quantity > (shareData.reserved_shares - (shareData.reserved_issued || 0))) {
        toast.error('Not enough reserved shares available for this issue');
        return;
      }

      // Create the share transaction record
      const { error: transactionError } = await supabase
        .from('share_transactions')
        .insert({
          user_id: values.userId,
          share_id: shareData.id,
          transaction_type: 'reserve_issue',
          quantity: values.quantity,
          price_per_share: values.issueRate,
          currency: shareData.currency,
          status: 'completed'
        });

      if (transactionError) throw transactionError;

      // Create user shares record
      const { error: userSharesError } = await supabase
        .from('user_shares')
        .insert({
          user_id: values.userId,
          share_id: shareData.id,
          quantity: values.quantity,
          purchase_price_per_share: values.issueRate,
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

      toast.success('Shares issued successfully!');
      form.reset();
      setEditingIssueId(null);
      loadRecentIssues();
      onSuccess();
    } catch (error: any) {
      console.error('Error issuing shares:', error);
      toast.error(error.message || 'Failed to issue shares');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditIssue = (issue: RecentIssue) => {
    setEditingIssueId(issue.id);
    form.setValue('userId', issue.user_id);
    form.setValue('quantity', issue.quantity);
    form.setValue('issueRate', issue.issue_rate);
  };

  const handleCancelIssue = async (issueId: string) => {
    try {
      const { error } = await supabase
        .from('share_transactions')
        .update({ status: 'cancelled' })
        .eq('id', issueId);

      if (error) throw error;

      toast.success('Issue cancelled successfully');
      loadRecentIssues();
      onSuccess();
    } catch (error: any) {
      console.error('Error cancelling issue:', error);
      toast.error('Failed to cancel issue');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Issue Reserved Shares</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Recipient</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={users}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Search by name or email..."
                        disabled={isLoadingUsers || isSubmitting}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="issueRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Rate (Price per Share)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter reason for issue..."
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                disabled={isSubmitting || isLoadingUsers}
                className="w-full"
              >
                {isSubmitting ? 'Issuing...' : editingIssueId ? 'Update Issue' : 'Issue Shares'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {recentIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Issues (Last 5)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentIssues.map((issue) => (
                <div 
                  key={issue.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                >
                  <div className="flex-1">
                    <p className="font-medium">{issue.user_name}</p>
                    <p className="text-sm text-muted-foreground">{issue.user_email}</p>
                    <p className="text-sm mt-1">
                      {issue.quantity} shares @ UGX {issue.issue_rate.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(issue.created_at), 'PPp')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditIssue(issue)}
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancelIssue(issue.id)}
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
