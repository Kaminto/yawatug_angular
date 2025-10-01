import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertTriangle, 
  CheckCircle2, 
  UserCheck, 
  Mail,
  Search,
  RefreshCw,
  Eye,
  MessageSquare,
  Merge
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ConflictingUser {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  import_batch_id: string;
  auth_created_at: string | null;
  account_activation_status: string;
  status: string;
  created_at: string;
  last_login: string | null;
  login_count: number | null;
}

const ImportUserReconciliation: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<ConflictingUser | null>(null);
  const [reconciliationNote, setReconciliationNote] = useState('');
  const [selectedAction, setSelectedAction] = useState<'merge' | 'separate' | 'delete_import'>('merge');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conflicting users (those with both imported records and auth accounts)
  const { data: conflictingUsers, isLoading, refetch } = useQuery({
    queryKey: ['conflicting-users', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(`
          id, email, phone, full_name, import_batch_id, 
          auth_created_at, account_activation_status, status, 
          created_at, last_login, login_count
        `)
        .not('import_batch_id', 'is', null)
        .not('auth_created_at', 'is', null);

      if (searchTerm) {
        query = query.or(`email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ConflictingUser[];
    }
  });

  // Get duplicate email/phone statistics
  const { data: duplicateStats } = useQuery({
    queryKey: ['duplicate-stats'],
    queryFn: async () => {
      // Get duplicate emails directly
      const { data: emailData, error: emailError } = await supabase
        .from('profiles')
        .select('email')
        .not('email', 'is', null);
        
      // Get duplicate phones directly
      const { data: phoneData, error: phoneError } = await supabase
        .from('profiles')
        .select('phone')
        .not('phone', 'is', null);

      if (emailError || phoneError) {
        console.error('Error fetching data:', emailError || phoneError);
        return { emailDuplicates: 0, phoneDuplicates: 0, totalConflicts: 0 };
      }

      // Count duplicate emails
      const emailCounts = emailData?.reduce((acc: Record<string, number>, item) => {
        acc[item.email] = (acc[item.email] || 0) + 1;
        return acc;
      }, {});
      const emailDuplicates = Object.values(emailCounts || {}).filter(count => count > 1).length;

      // Count duplicate phones
      const phoneCounts = phoneData?.reduce((acc: Record<string, number>, item) => {
        acc[item.phone] = (acc[item.phone] || 0) + 1;
        return acc;
      }, {});
      const phoneDuplicates = Object.values(phoneCounts || {}).filter(count => count > 1).length;

      return {
        emailDuplicates,
        phoneDuplicates,
        totalConflicts: conflictingUsers?.length || 0
      };
    }
  });

  const reconcileUserMutation = useMutation({
    mutationFn: async ({ userId, action, note }: { userId: string; action: string; note: string }) => {
      const { error } = await supabase.functions.invoke('reconcile-imported-user', {
        body: {
          userId,
          action,
          adminNote: note,
          adminId: (await supabase.auth.getUser()).data.user?.id
        }
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conflicting-users'] });
      queryClient.invalidateQueries({ queryKey: ['duplicate-stats'] });
      setSelectedUser(null);
      setReconciliationNote('');
      toast({
        title: "Success",
        description: "User reconciliation completed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to reconcile user: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async ({ userId, message }: { userId: string; message: string }) => {
      const { error } = await supabase.functions.invoke('send-user-notification', {
        body: {
          userId,
          type: 'account_reconciliation',
          message,
          adminId: (await supabase.auth.getUser()).data.user?.id
        }
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Notification Sent",
        description: "User has been notified about account reconciliation",
      });
    }
  });

  const handleReconcileUser = () => {
    if (!selectedUser) return;
    
    reconcileUserMutation.mutate({
      userId: selectedUser.id,
      action: selectedAction,
      note: reconciliationNote
    });
  };

  const handleNotifyUser = (user: ConflictingUser) => {
    const message = `Hello ${user.full_name}, we detected that you have both an imported record and a registered account. Our admin team is reviewing your account to ensure proper consolidation. You'll be notified once this is complete.`;
    
    sendNotificationMutation.mutate({
      userId: user.id,
      message
    });
  };

  const getConflictBadge = (user: ConflictingUser) => {
    if (user.import_batch_id && user.auth_created_at) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Merge className="w-3 h-3 mr-1" />
          Needs Reconciliation
        </Badge>
      );
    }
    return null;
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading conflicting users...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{duplicateStats?.totalConflicts || 0}</div>
                <div className="text-sm text-muted-foreground">Users Needing Reconciliation</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Mail className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{duplicateStats?.emailDuplicates || 0}</div>
                <div className="text-sm text-muted-foreground">Duplicate Emails</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <UserCheck className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{duplicateStats?.phoneDuplicates || 0}</div>
                <div className="text-sm text-muted-foreground">Duplicate Phones</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Import User Reconciliation</span>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email, phone, or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Conflicting Users List */}
          <div className="space-y-4">
            {conflictingUsers?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-semibold mb-2">No Conflicts Found</h3>
                <p>All imported users have been properly reconciled.</p>
              </div>
            ) : (
              conflictingUsers?.map((user) => (
                <div key={user.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{user.full_name}</h4>
                        {getConflictBadge(user)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                          <strong>Email:</strong> {user.email}
                        </div>
                        <div>
                          <strong>Phone:</strong> {user.phone}
                        </div>
                        <div>
                          <strong>Import Batch:</strong> {user.import_batch_id?.slice(0, 8)}
                        </div>
                        <div>
                          <strong>Auth Created:</strong> {formatDate(user.auth_created_at)}
                        </div>
                        <div>
                          <strong>Last Login:</strong> {formatDate(user.last_login)}
                        </div>
                        <div>
                          <strong>Login Count:</strong> {user.login_count || 0}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleNotifyUser(user)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Notify User
                      </Button>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Reconcile
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Reconcile User Account</DialogTitle>
                            <DialogDescription>
                              Choose how to handle the conflicting records for {selectedUser?.full_name}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Action</label>
                              <Select value={selectedAction} onValueChange={(value: any) => setSelectedAction(value)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="merge">Merge accounts (recommended)</SelectItem>
                                  <SelectItem value="separate">Keep separate</SelectItem>
                                  <SelectItem value="delete_import">Delete import record</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <label className="text-sm font-medium">Admin Note</label>
                              <Textarea
                                placeholder="Add a note about this reconciliation..."
                                value={reconciliationNote}
                                onChange={(e) => setReconciliationNote(e.target.value)}
                                rows={3}
                              />
                            </div>

                            <div className="flex gap-2">
                              <Button 
                                onClick={handleReconcileUser}
                                disabled={reconcileUserMutation.isPending}
                                className="flex-1"
                              >
                                {reconcileUserMutation.isPending ? 'Processing...' : 'Confirm Reconciliation'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportUserReconciliation;