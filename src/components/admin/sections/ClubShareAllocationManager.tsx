import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText,
  AlertTriangle,
  Eye,
  Users,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClubMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  allocated_shares: number;
  allocation_status: string;
  consent_deadline: string;
  consent_signed_at: string | null;
  transfer_fee_paid: number;
  debt_amount_settled: number;
  rejection_reason: string | null;
  rejection_count: number;
  last_rejection_at: string | null;
  can_reapply_after: string | null;
  created_at: string;
}

const ClubShareAllocationManager = () => {
  const [allocations, setAllocations] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAllocation, setSelectedAllocation] = useState<ClubMember | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject' | 'edit' | null;
  }>({
    open: false,
    type: null
  });
  const [actionData, setActionData] = useState({
    shares: 0,
    notes: '',
    transferFee: 0,
    debtAmount: 0
  });

  useEffect(() => {
    loadAllocations();
  }, []);

  const loadAllocations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('club_share_allocations')
        .select(`
          *,
          profiles!club_share_allocations_club_member_id_fkey (
            full_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedAllocations = data?.map(allocation => ({
        id: allocation.id,
        user_id: allocation.club_member_id,
        full_name: (allocation.profiles as any)?.full_name || 'Unknown',
        email: (allocation.profiles as any)?.email || '',
        phone: (allocation.profiles as any)?.phone || '',
        allocated_shares: allocation.allocated_shares,
        allocation_status: allocation.allocation_status,
        consent_deadline: allocation.consent_deadline,
        consent_signed_at: allocation.consent_signed_at,
        transfer_fee_paid: allocation.transfer_fee_paid,
        debt_amount_settled: allocation.debt_amount_settled,
        rejection_reason: allocation.rejection_reason,
        rejection_count: allocation.rejection_count || 0,
        last_rejection_at: allocation.last_rejection_at,
        can_reapply_after: allocation.can_reapply_after,
        created_at: allocation.created_at
      })) || [];

      setAllocations(formattedAllocations);
    } catch (error) {
      console.error('Error loading allocations:', error);
      toast.error('Failed to load share allocations');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAllocation = async () => {
    if (!selectedAllocation) return;

    try {
      const { error } = await supabase
        .from('club_share_allocations')
        .update({
          allocation_status: 'approved',
          allocated_shares: actionData.shares || selectedAllocation.allocated_shares,
          transfer_fee_paid: actionData.transferFee,
          debt_amount_settled: actionData.debtAmount,
          admin_release_percentage: 100,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAllocation.id);

      if (error) throw error;

      toast.success('Share allocation approved successfully');
      setActionDialog({ open: false, type: null });
      loadAllocations();
    } catch (error) {
      console.error('Error approving allocation:', error);
      toast.error('Failed to approve allocation');
    }
  };

  const handleRejectAllocation = async () => {
    if (!selectedAllocation || !actionData.notes.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      const { error } = await supabase
        .from('club_share_allocations')
        .update({
          allocation_status: 'rejected',
          rejection_reason: actionData.notes,
          rejection_count: selectedAllocation.rejection_count + 1,
          last_rejection_at: new Date().toISOString(),
          can_reapply_after: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAllocation.id);

      if (error) throw error;

      toast.success('Share allocation rejected');
      setActionDialog({ open: false, type: null });
      loadAllocations();
    } catch (error) {
      console.error('Error rejecting allocation:', error);
      toast.error('Failed to reject allocation');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'consent_required': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'consent_required': return <FileText className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const isConsentOverdue = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  const openActionDialog = (allocation: ClubMember, type: 'approve' | 'reject' | 'edit') => {
    setSelectedAllocation(allocation);
    setActionData({
      shares: allocation.allocated_shares,
      notes: '',
      transferFee: allocation.transfer_fee_paid,
      debtAmount: allocation.debt_amount_settled
    });
    setActionDialog({ open: true, type });
  };

  const filteredAllocations = {
    pending: allocations.filter(a => a.allocation_status === 'pending'),
    consent: allocations.filter(a => a.allocation_status === 'consent_required'),
    approved: allocations.filter(a => a.allocation_status === 'approved'),
    rejected: allocations.filter(a => a.allocation_status === 'rejected')
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-1/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Club Share Allocations</h3>
          <p className="text-sm text-muted-foreground">
            Manage share assignments for club members and track consent status
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          Total: {allocations.length}
        </Badge>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({filteredAllocations.pending.length})
          </TabsTrigger>
          <TabsTrigger value="consent" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Consent ({filteredAllocations.consent.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Approved ({filteredAllocations.approved.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Rejected ({filteredAllocations.rejected.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-6">
          {filteredAllocations.pending.map(allocation => (
            <Card key={allocation.id} className="border-l-4 border-l-yellow-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h4 className="font-medium">{allocation.full_name}</h4>
                        <p className="text-sm text-muted-foreground">{allocation.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Allocated Shares</p>
                        <p className="font-medium">{allocation.allocated_shares.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Transfer Fee</p>
                        <p className="font-medium">UGX {allocation.transfer_fee_paid.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Debt Settled</p>
                        <p className="font-medium">UGX {allocation.debt_amount_settled.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Consent Deadline</p>
                        <p className={`font-medium ${isConsentOverdue(allocation.consent_deadline) ? 'text-red-600' : ''}`}>
                          {new Date(allocation.consent_deadline).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openActionDialog(allocation, 'edit')}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openActionDialog(allocation, 'approve')}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openActionDialog(allocation, 'reject')}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredAllocations.pending.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No pending allocations</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="consent" className="space-y-4 mt-6">
          {filteredAllocations.consent.map(allocation => (
            <Card key={allocation.id} className="border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h4 className="font-medium">{allocation.full_name}</h4>
                        <p className="text-sm text-muted-foreground">{allocation.email}</p>
                      </div>
                      <Badge className={getStatusColor(allocation.allocation_status)}>
                        {getStatusIcon(allocation.allocation_status)}
                        <span className="ml-1">Awaiting Consent</span>
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Allocated Shares</p>
                        <p className="font-medium">{allocation.allocated_shares.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Consent Deadline</p>
                        <p className={`font-medium flex items-center gap-1 ${isConsentOverdue(allocation.consent_deadline) ? 'text-red-600' : ''}`}>
                          <Calendar className="h-4 w-4" />
                          {new Date(allocation.consent_deadline).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="font-medium">
                          {isConsentOverdue(allocation.consent_deadline) ? 'Overdue' : 'Pending'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Days Remaining</p>
                        <p className="font-medium">
                          {Math.max(0, Math.ceil((new Date(allocation.consent_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredAllocations.consent.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No allocations awaiting consent</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4 mt-6">
          {filteredAllocations.approved.slice(0, 10).map(allocation => (
            <Card key={allocation.id} className="border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium">{allocation.full_name}</h4>
                      <p className="text-sm text-muted-foreground">{allocation.email}</p>
                    </div>
                    <Badge className={getStatusColor(allocation.allocation_status)}>
                      {getStatusIcon(allocation.allocation_status)}
                      <span className="ml-1">Approved</span>
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{allocation.allocated_shares.toLocaleString()} shares</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(allocation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredAllocations.approved.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No approved allocations</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4 mt-6">
          {filteredAllocations.rejected.map(allocation => (
            <Card key={allocation.id} className="border-l-4 border-l-red-500">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h4 className="font-medium">{allocation.full_name}</h4>
                        <p className="text-sm text-muted-foreground">{allocation.email}</p>
                      </div>
                      <Badge className={getStatusColor(allocation.allocation_status)}>
                        {getStatusIcon(allocation.allocation_status)}
                        <span className="ml-1">Rejected</span>
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Rejection #{allocation.rejection_count}</p>
                      {allocation.can_reapply_after && (
                        <p className="text-xs text-muted-foreground">
                          Can reapply: {new Date(allocation.can_reapply_after).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  {allocation.rejection_reason && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm"><strong>Rejection Reason:</strong></p>
                      <p className="text-sm text-red-700 mt-1">{allocation.rejection_reason}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredAllocations.rejected.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <XCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No rejected allocations</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ open, type: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'approve' && 'Approve Share Allocation'}
              {actionDialog.type === 'reject' && 'Reject Share Allocation'}
              {actionDialog.type === 'edit' && 'Review Share Allocation'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAllocation && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{selectedAllocation.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedAllocation.email}</p>
              </div>

              {actionDialog.type === 'approve' && (
                <>
                  <div>
                    <Label htmlFor="shares">Allocated Shares</Label>
                    <Input
                      id="shares"
                      type="number"
                      value={actionData.shares}
                      onChange={(e) => setActionData(prev => ({ ...prev, shares: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="transferFee">Transfer Fee (UGX)</Label>
                    <Input
                      id="transferFee"
                      type="number"
                      value={actionData.transferFee}
                      onChange={(e) => setActionData(prev => ({ ...prev, transferFee: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="debtAmount">Debt Amount Settled (UGX)</Label>
                    <Input
                      id="debtAmount"
                      type="number"
                      value={actionData.debtAmount}
                      onChange={(e) => setActionData(prev => ({ ...prev, debtAmount: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </>
              )}

              {actionDialog.type === 'reject' && (
                <div>
                  <Label htmlFor="notes">Rejection Reason</Label>
                  <Textarea
                    id="notes"
                    placeholder="Please provide a clear reason for rejection..."
                    value={actionData.notes}
                    onChange={(e) => setActionData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                  />
                </div>
              )}

              {actionDialog.type === 'edit' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Shares</p>
                      <p className="font-medium">{selectedAllocation.allocated_shares.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className={getStatusColor(selectedAllocation.allocation_status)}>
                        {selectedAllocation.allocation_status}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Transfer Fee</p>
                      <p className="font-medium">UGX {selectedAllocation.transfer_fee_paid.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Debt Settled</p>
                      <p className="font-medium">UGX {selectedAllocation.debt_amount_settled.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setActionDialog({ open: false, type: null })}
                  className="flex-1"
                >
                  Cancel
                </Button>
                {actionDialog.type === 'approve' && (
                  <Button onClick={handleApproveAllocation} className="flex-1">
                    Approve
                  </Button>
                )}
                {actionDialog.type === 'reject' && (
                  <Button onClick={handleRejectAllocation} variant="destructive" className="flex-1">
                    Reject
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClubShareAllocationManager;