import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Clock, CheckCircle, XCircle, Calendar, TrendingUp, Edit, Mail, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ClubShareAllocation } from '@/interfaces/ClubShareInterfaces';
import EnhancedClubShareAllocationImporter from './EnhancedClubShareAllocationImporter';
import ClubShareSimplifiedManager from './ClubShareSimplifiedManager';
import ClubBatchManager from './ClubBatchManager';
import BatchBasedShareReleaseManager from './BatchBasedShareReleaseManager';

const ClubShareAllocationManager: React.FC = () => {
  const [allocations, setAllocations] = useState<ClubShareAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<ClubShareAllocation | null>(null);
  const [editForm, setEditForm] = useState({
    member_name: '',
    email: '',
    phone: '',
    allocated_shares: 0,
    debt_amount_settled: 0
  });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    invited: 0,
    accepted: 0,
    rejected: 0,
    totalShares: 0,
    totalFees: 0,
    totalDebt: 0
  });

  useEffect(() => {
    loadAllocations();
  }, []);

  const loadAllocations = async () => {
    try {
      const { data, error } = await supabase
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

      if (error) throw error;

      setAllocations(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error loading allocations:', error);
      toast.error('Failed to load allocations');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: ClubShareAllocation[]) => {
    const stats = {
      total: data.length,
      pending: data.filter(a => a.allocation_status === 'pending_invitation').length,
      invited: data.filter(a => a.allocation_status === 'pending_consent').length,
      accepted: data.filter(a => a.allocation_status === 'accepted').length,
      rejected: data.filter(a => a.allocation_status === 'rejected').length,
      totalShares: data.reduce((sum, a) => sum + a.allocated_shares, 0),
      totalFees: data.reduce((sum, a) => sum + a.transfer_fee_paid, 0),
      totalDebt: data.reduce((sum, a) => sum + a.debt_amount_settled, 0)
    };
    setStats(stats);
  };

  const getStatusBadge = (status: string) => {
  const variants = {
    pending_invitation: { variant: 'outline', icon: Clock, color: 'text-orange-600' },
    pending_consent: { variant: 'secondary', icon: Mail, color: 'text-blue-600' },
    accepted: { variant: 'default', icon: CheckCircle, color: 'text-green-600' },
    rejected: { variant: 'destructive', icon: XCircle, color: 'text-red-600' },
    released_partially: { variant: 'secondary', icon: TrendingUp, color: 'text-blue-600' },
    released_fully: { variant: 'default', icon: CheckCircle, color: 'text-green-600' }
  };

  const config = variants[status as keyof typeof variants] || variants.pending_invitation;
  const Icon = config.icon;

    return (
      <Badge variant={config.variant as any}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const sendConsentInvitation = async (allocation: ClubShareAllocation) => {
    try {
      const clubMember = allocation.investment_club_members;
      if (!clubMember?.email) {
        toast.error('No email address found for this member');
        return;
      }

      // Send email first, update status after successful send

      const { error } = await supabase.functions.invoke('unified-communication-sender', {
        body: {
          recipient: clubMember.email,
          subject: 'Yawatu Club Share Consent Required',
          message: `Dear ${clubMember.member_name}, you have been allocated ${allocation.allocated_shares} shares for debt conversion.`,
          channel: 'email',
          templateType: 'consent_invitation',
          templateData: {
            club_allocation_id: allocation.id,
            club_member_id: allocation.club_member_id,
            phone: clubMember.phone || '',
            member_name: clubMember.member_name,
            allocated_shares: allocation.allocated_shares,
            debt_amount: allocation.debt_amount_settled || 0
          }
        }
      });

      if (error) throw error;

      // Update allocation status to pending_consent after successful email
      const { error: statusError } = await supabase
        .from('club_share_allocations')
        .update({
          allocation_status: 'pending_consent',
          updated_at: new Date().toISOString()
        })
        .eq('id', allocation.id);
      if (statusError) throw statusError;

      toast.success(`Consent invitation sent to ${clubMember.email}`);
      loadAllocations(); // Reload to see updated status
    } catch (error) {
      console.error('Error sending consent invitation:', error);
      toast.error('Failed to send consent invitation');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleEditMember = (allocation: ClubShareAllocation) => {
    setEditingMember(allocation);
    setEditForm({
      member_name: allocation.investment_club_members?.member_name || '',
      email: allocation.investment_club_members?.email || '',
      phone: allocation.investment_club_members?.phone || '',
      allocated_shares: allocation.allocated_shares,
      debt_amount_settled: allocation.debt_amount_settled
    });
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;

    try {
      // Update club member details
      const { error: memberError } = await supabase
        .from('investment_club_members')
        .update({
          member_name: editForm.member_name,
          email: editForm.email,
          phone: editForm.phone
        })
        .eq('id', editingMember.club_member_id);

      if (memberError) throw memberError;

      // Update allocation details
      const { error: allocationError } = await supabase
        .from('club_share_allocations')
        .update({
          allocated_shares: editForm.allocated_shares,
          debt_amount_settled: editForm.debt_amount_settled
        })
        .eq('id', editingMember.id);

      if (allocationError) throw allocationError;

      toast.success('Member details updated successfully');
      setEditingMember(null);
      loadAllocations();
    } catch (error) {
      console.error('Error updating member:', error);
      toast.error('Failed to update member details');
    }
  };

  const resetAllocationStatus = async (allocation: ClubShareAllocation) => {
    try {
      const { error } = await supabase
        .from('club_share_allocations')
        .update({
          allocation_status: 'pending_invitation',
          consent_signed_at: null,
          rejection_reason: null
        })
        .eq('id', allocation.id);

      if (error) throw error;

      toast.success('Allocation status reset to pending');
      loadAllocations();
    } catch (error) {
      console.error('Error resetting allocation:', error);
      toast.error('Failed to reset allocation status');
    }
  };

  if (loading) {
    return <div className="p-6">Loading allocations...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Allocations</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Invitations Sent</p>
                <p className="text-2xl font-bold">{stats.invited}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Accepted</p>
                <p className="text-2xl font-bold">{stats.accepted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Shares</p>
                <p className="text-2xl font-bold">{stats.totalShares.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different management sections */}
      <Tabs defaultValue="consent" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="consent">Consent Management</TabsTrigger>
          <TabsTrigger value="release">Share Release</TabsTrigger>
          <TabsTrigger value="import">Import & Batch</TabsTrigger>
        </TabsList>

        <TabsContent value="consent">
          <Card>
            <CardHeader>
              <CardTitle>Consent Management</CardTitle>
              <CardDescription>
                Send consent invitations and manage responses from club members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Shares</TableHead>
                      <TableHead>Debt Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.map((allocation) => (
                      <TableRow key={allocation.id}>
                        <TableCell className="font-medium">
                          {allocation.investment_club_members?.member_name}
                        </TableCell>
                        <TableCell>
                          {allocation.investment_club_members?.email}
                        </TableCell>
                        <TableCell>
                          {allocation.allocated_shares.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(allocation.debt_amount_settled)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(allocation.allocation_status)}
                        </TableCell>
                        <TableCell>
                          {allocation.consent_deadline ? (
                            <div className="space-y-1">
                              <div className="text-sm">
                                {formatDate(allocation.consent_deadline)}
                              </div>
                              <div className={`text-xs ${
                                getDaysUntilDeadline(allocation.consent_deadline) < 7 
                                  ? 'text-red-600' 
                                  : 'text-muted-foreground'
                              }`}>
                                {getDaysUntilDeadline(allocation.consent_deadline)} days left
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {allocation.allocation_status === 'pending_invitation' && (
                              <Button
                                onClick={() => sendConsentInvitation(allocation)}
                                size="sm"
                                variant="outline"
                              >
                                <Mail className="h-4 w-4 mr-1" />
                                Send Invitation
                              </Button>
                            )}
                            {allocation.allocation_status === 'pending_consent' && (
                              <Badge variant="secondary">Invitation Sent</Badge>
                            )}
                            {allocation.allocation_status === 'accepted' && (
                              <Badge variant="default">Consent Given</Badge>
                            )}
                            {allocation.allocation_status === 'rejected' && (
                              <div className="space-y-1">
                                <Badge variant="destructive">Rejected</Badge>
                                {allocation.rejection_reason && (
                                  <div className="text-xs text-muted-foreground">
                                    {allocation.rejection_reason}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleEditMember(allocation)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Details
                                </DropdownMenuItem>
                                {allocation.allocation_status !== 'pending_invitation' && (
                                  <DropdownMenuItem onClick={() => resetAllocationStatus(allocation)}>
                                    <Clock className="h-4 w-4 mr-2" />
                                    Reset to Pending
                                  </DropdownMenuItem>
                                )}
                                {(allocation.allocation_status === 'pending_invitation' || allocation.allocation_status === 'rejected') && (
                                  <DropdownMenuItem onClick={() => sendConsentInvitation(allocation)}>
                                    <Mail className="h-4 w-4 mr-2" />
                                    {allocation.allocation_status === 'rejected' ? 'Resend Invitation' : 'Send Invitation'}
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Edit Member Dialog */}
                <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Member Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="member_name">Member Name</Label>
                        <Input
                          id="member_name"
                          value={editForm.member_name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, member_name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={editForm.phone}
                          onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="allocated_shares">Allocated Shares</Label>
                        <Input
                          id="allocated_shares"
                          type="number"
                          value={editForm.allocated_shares}
                          onChange={(e) => setEditForm(prev => ({ ...prev, allocated_shares: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="debt_amount">Debt Amount Settled</Label>
                        <Input
                          id="debt_amount"
                          type="number"
                          value={editForm.debt_amount_settled}
                          onChange={(e) => setEditForm(prev => ({ ...prev, debt_amount_settled: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditingMember(null)}>
                          Cancel
                        </Button>
                        <Button onClick={handleUpdateMember}>
                          Update Member
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="release">
          <BatchBasedShareReleaseManager />
        </TabsContent>

        <TabsContent value="import">
          <div className="space-y-6">
            <EnhancedClubShareAllocationImporter onImportComplete={loadAllocations} />
            <ClubBatchManager onBatchDeleted={loadAllocations} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClubShareAllocationManager;