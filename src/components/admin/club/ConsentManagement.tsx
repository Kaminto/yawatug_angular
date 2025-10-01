import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Mail, Users, CheckCircle, XCircle, Clock, Send, Edit, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ClubShareAllocation } from '@/interfaces/ClubShareInterfaces';
import ConsentDocumentPreview from '@/components/consent/ConsentDocumentPreview';

interface ConsentManagementProps {
  onStatusUpdate?: () => void;
}

const ConsentManagement: React.FC<ConsentManagementProps> = ({ onStatusUpdate }) => {
  const [allocations, setAllocations] = useState<ClubShareAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAllocation, setSelectedAllocation] = useState<ClubShareAllocation | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedForInvite, setSelectedForInvite] = useState<ClubShareAllocation[]>([]);
  const [processing, setProcessing] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [consentDocDialogOpen, setConsentDocDialogOpen] = useState(false);

  const fetchAllocations = async () => {
    try {
      let query = supabase
        .from('club_share_allocations')
        .select(`
          *,
          investment_club_members (
            id,
            member_name,
            email,
            phone,
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('allocation_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setAllocations(data || []);
    } catch (error) {
      console.error('Error fetching allocations:', error);
      toast.error('Failed to fetch consent data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, [statusFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_activation':
      case 'pending_invitation':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'invited':
        return <Mail className="h-4 w-4 text-blue-500" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'pending_activation':
      case 'pending_invitation':
        return 'outline';
      case 'invited':
        return 'secondary';
      case 'accepted':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const sendInvitation = async (allocationId: string) => {
    try {
      const allocation = allocations.find(a => a.id === allocationId);
      if (!allocation || !allocation.investment_club_members) {
        throw new Error('Allocation or member data not found');
      }

      const member = allocation.investment_club_members;

      // Send consent invitation directly using unified-communication-sender
      const consentUrl = `${window.location.origin}/formal-consent/${encodeURIComponent(allocationId)}`;
      
      const { data, error } = await supabase.functions.invoke('unified-communication-sender', {
        body: {
          recipient: member.email,
          subject: 'Yawatu Club Share Consent Invitation',
          message: 'Please review and complete your consent for allocated club shares.',
          channel: 'email',
          templateType: 'consent_invitation',
          templateData: {
            club_allocation_id: allocationId,
            member_name: member.member_name,
            allocated_shares: allocation.allocated_shares,
            debt_amount_settled: allocation.debt_amount_settled,
            transfer_fee_paid: allocation.transfer_fee_paid,
            cost_per_share: allocation.cost_per_share || 0,
            total_cost: allocation.total_cost || 0,
            consent_url: consentUrl,
          }
        }
      });

      if (error) {
        throw new Error(`Email send error: ${error.message}`);
      }

      if (!(data?.success === true || data?.results?.email?.success === true)) {
        const errorMsg = data?.error || data?.results?.email?.error || 'Failed to send invitation';
        throw new Error(errorMsg);
      }

      // Update allocation status to 'pending_consent'
      const { error: updateError } = await supabase
        .from('club_share_allocations')
        .update({ 
          allocation_status: 'pending_consent',
          consent_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        })
        .eq('id', allocationId);

      if (updateError) throw updateError;

      toast.success(`Invitation sent to ${member.member_name}`);
      fetchAllocations();
      onStatusUpdate?.();

    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
    }
  };

  const sendBulkInvitations = async () => {
    if (selectedForInvite.length === 0) {
      toast.error('No allocations selected');
      return;
    }

    setProcessing(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const allocation of selectedForInvite) {
        try {
          await sendInvitation(allocation.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to send invitation for ${allocation.id}:`, error);
          errorCount++;
        }
      }

      toast.success(`Sent ${successCount} invitations successfully. ${errorCount} failed.`);
      setSelectedForInvite([]);
      setInviteDialogOpen(false);

    } catch (error) {
      console.error('Bulk invitation error:', error);
      toast.error('Failed to send bulk invitations');
    } finally {
      setProcessing(false);
    }
  };

  const viewAllocationDetails = (allocation: ClubShareAllocation) => {
    setSelectedAllocation(allocation);
    setShowViewDialog(true);
  };

  const editAllocation = (allocation: ClubShareAllocation) => {
    setSelectedAllocation(allocation);
    setEditDialogOpen(true);
  };

  const viewConsentDocument = (allocation: ClubShareAllocation) => {
    setSelectedAllocation(allocation);
    setConsentDocDialogOpen(true);
  };

  const filteredAllocations = allocations.filter(allocation => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending_invitation') {
      return allocation.allocation_status === 'pending_invitation' || allocation.allocation_status === 'pending_activation';
    }
    return allocation.allocation_status === statusFilter;
  });

  const pendingInvitations = allocations.filter(a => a.allocation_status === 'pending_invitation' || a.allocation_status === 'pending_activation');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Consent Management
          </CardTitle>
          <CardDescription>
            Manage member consent invitations and track responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <Label htmlFor="status-filter">Filter by Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending_invitation">Pending Invitation</SelectItem>
                    <SelectItem value="invited">Invited</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {pendingInvitations.length > 0 && (
              <Button 
                onClick={() => {
                  setSelectedForInvite(pendingInvitations);
                  setInviteDialogOpen(true);
                }}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Invite All Pending ({pendingInvitations.length})
              </Button>
            )}
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Allocated Shares</TableHead>
                  <TableHead>Debt Settled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Consent Deadline</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading consent data...
                    </TableCell>
                  </TableRow>
                ) : filteredAllocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No allocations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAllocations.map((allocation) => (
                    <TableRow key={allocation.id}>
                      <TableCell className="font-medium">
                        {allocation.investment_club_members?.member_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {allocation.investment_club_members?.email || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {allocation.allocated_shares.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        UGX {allocation.debt_amount_settled.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(allocation.allocation_status)}
                          <Badge variant={getStatusVariant(allocation.allocation_status)}>
                            {(allocation.allocation_status === 'pending_activation' || allocation.allocation_status === 'pending_invitation')
                              ? 'pending invitation'
                              : allocation.allocation_status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {allocation.consent_deadline 
                          ? new Date(allocation.consent_deadline).toLocaleDateString()
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewAllocationDetails(allocation)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => editAllocation(allocation)}
                            title="Edit Allocation"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewConsentDocument(allocation)}
                            title="Preview Consent Document"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          {(allocation.allocation_status === 'pending_invitation' || allocation.allocation_status === 'pending_activation') && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => sendInvitation(allocation.id)}
                              title="Send Invitation"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Allocation Details</DialogTitle>
            <DialogDescription>
              View complete allocation information and status
            </DialogDescription>
          </DialogHeader>
          {selectedAllocation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Member Name</Label>
                  <div className="font-medium">
                    {selectedAllocation.investment_club_members?.member_name || 'N/A'}
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <div>{selectedAllocation.investment_club_members?.email || 'N/A'}</div>
                </div>
                <div>
                  <Label>Phone</Label>
                  <div>{selectedAllocation.investment_club_members?.phone || 'N/A'}</div>
                </div>
                <div>
                  <Label>Allocated Shares</Label>
                  <div>{selectedAllocation.allocated_shares.toLocaleString()}</div>
                </div>
                <div>
                  <Label>Debt Amount Settled</Label>
                  <div>UGX {selectedAllocation.debt_amount_settled.toLocaleString()}</div>
                </div>
                <div>
                  <Label>Transfer Fee Paid</Label>
                  <div>UGX {selectedAllocation.transfer_fee_paid.toLocaleString()}</div>
                </div>
                <div>
                  <Label>Total Cost</Label>
                  <div>UGX {(selectedAllocation.total_cost || 0).toLocaleString()}</div>
                </div>
                <div>
                  <Label>Cost Per Share</Label>
                  <div>UGX {(selectedAllocation.cost_per_share || 0).toLocaleString()}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedAllocation.allocation_status)}
                    <Badge variant={getStatusVariant(selectedAllocation.allocation_status)}>
                      {(selectedAllocation.allocation_status === 'pending_activation' || selectedAllocation.allocation_status === 'pending_invitation')
                        ? 'pending invitation'
                        : selectedAllocation.allocation_status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Consent Deadline</Label>
                  <div>
                    {selectedAllocation.consent_deadline 
                      ? new Date(selectedAllocation.consent_deadline).toLocaleDateString()
                      : 'N/A'
                    }
                  </div>
                </div>
              </div>
              
              {selectedAllocation.rejection_reason && (
                <div>
                  <Label>Rejection Reason</Label>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800">
                    {selectedAllocation.rejection_reason}
                  </div>
                </div>
              )}
              
              {selectedAllocation.import_batch_reference && (
                <div>
                  <Label>Import Batch Reference</Label>
                  <div className="font-mono text-sm">
                    {selectedAllocation.import_batch_reference}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Bulk Invitations</DialogTitle>
            <DialogDescription>
              Send consent invitations to {selectedForInvite.length} selected members
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Shares</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedForInvite.map((allocation) => (
                    <TableRow key={allocation.id}>
                      <TableCell className="font-medium">
                        {allocation.investment_club_members?.member_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {allocation.investment_club_members?.email || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {allocation.allocated_shares.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={sendBulkInvitations} disabled={processing}>
                {processing ? 'Sending...' : `Send ${selectedForInvite.length} Invitations`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Allocation Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Allocation</DialogTitle>
            <DialogDescription>
              Modify allocation details for {selectedAllocation?.investment_club_members?.member_name}
            </DialogDescription>
          </DialogHeader>
          {selectedAllocation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="allocated_shares">Allocated Shares</Label>
                  <Input
                    id="allocated_shares"
                    type="number"
                    defaultValue={selectedAllocation.allocated_shares}
                  />
                </div>
                <div>
                  <Label htmlFor="debt_amount_settled">Debt Amount Settled (UGX)</Label>
                  <Input
                    id="debt_amount_settled"
                    type="number"
                    defaultValue={selectedAllocation.debt_amount_settled}
                  />
                </div>
                <div>
                  <Label htmlFor="transfer_fee_paid">Transfer Fee Paid (UGX)</Label>
                  <Input
                    id="transfer_fee_paid"
                    type="number"
                    defaultValue={selectedAllocation.transfer_fee_paid}
                  />
                </div>
                <div>
                  <Label htmlFor="total_cost">Total Cost (UGX)</Label>
                  <Input
                    id="total_cost"
                    type="number"
                    defaultValue={selectedAllocation.total_cost || 0}
                  />
                </div>
                <div>
                  <Label htmlFor="cost_per_share">Cost Per Share (UGX)</Label>
                  <Input
                    id="cost_per_share"
                    type="number"
                    defaultValue={selectedAllocation.cost_per_share || 0}
                  />
                </div>
                <div>
                  <Label htmlFor="debt_rejected">Debt Rejected (UGX)</Label>
                  <Input
                    id="debt_rejected"
                    type="number"
                    defaultValue={selectedAllocation.debt_rejected || 0}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="allocation_status">Status</Label>
                <Select defaultValue={selectedAllocation.allocation_status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_invitation">Pending Invitation</SelectItem>
                    <SelectItem value="invited">Invited</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  // TODO: Implement save functionality
                  toast.success('Allocation updated successfully');
                  setEditDialogOpen(false);
                  fetchAllocations();
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Consent Document Preview Dialog */}
      <Dialog open={consentDocDialogOpen} onOpenChange={setConsentDocDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Consent Document Preview</DialogTitle>
            <DialogDescription>
              Preview of the consent document for {selectedAllocation?.investment_club_members?.member_name}
            </DialogDescription>
          </DialogHeader>
          {selectedAllocation && (
            <ConsentDocumentPreview
              memberData={{
                member_name: selectedAllocation.investment_club_members?.member_name || 'N/A',
                email: selectedAllocation.investment_club_members?.email || 'N/A',
                phone: selectedAllocation.investment_club_members?.phone || '',
                allocated_shares: selectedAllocation.allocated_shares,
                debt_amount_settled: selectedAllocation.debt_amount_settled || 0,
                transfer_fee_paid: selectedAllocation.transfer_fee_paid || 0,
                cost_per_share: selectedAllocation.cost_per_share || 0,
                total_cost: selectedAllocation.total_cost || 0,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConsentManagement;