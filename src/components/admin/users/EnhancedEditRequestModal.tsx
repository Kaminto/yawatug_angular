
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle, XCircle, Edit3, Eye, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditRequest {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  account_type: string;
  user_role: string;
  edit_reason?: string;
  edit_request_status: string;
  last_edit_request: string;
  profile_picture_url?: string;
  nationality?: string;
  country_of_residence?: string;
  gender?: string;
  date_of_birth?: string;
  address?: string;
  tin?: string;
}

interface EnhancedEditRequestModalProps {
  request: EditRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (requestId: string, status: string, reason?: string) => void;
  onRefresh: () => void;
}

const EnhancedEditRequestModal: React.FC<EnhancedEditRequestModalProps> = ({
  request,
  isOpen,
  onClose,
  onStatusUpdate,
  onRefresh
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRequest, setEditedRequest] = useState<Partial<EditRequest>>({});
  const [adminResponse, setAdminResponse] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (request) {
      setEditedRequest(request);
    }
  }, [request]);

  const handleSaveEdit = async () => {
    if (!request) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editedRequest.full_name,
          phone: editedRequest.phone,
          account_type: editedRequest.account_type,
          nationality: editedRequest.nationality,
          country_of_residence: editedRequest.country_of_residence,
          gender: editedRequest.gender,
          date_of_birth: editedRequest.date_of_birth,
          address: editedRequest.address,
          tin: editedRequest.tin,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      setIsEditing(false);
      onRefresh();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!request) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          edit_request_status: 'approved',
          edit_approved: true,
          edit_requested: false,
          edit_reason: adminResponse || 'Request approved by admin',
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (error) throw error;

      toast.success('Edit request approved successfully');
      onStatusUpdate(request.id, 'approved', adminResponse);
      onClose();
    } catch (error) {
      console.error('Error approving edit request:', error);
      toast.error('Failed to approve edit request');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!request || !adminResponse.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          edit_request_status: 'rejected',
          edit_approved: false,
          edit_requested: false,
          edit_reason: adminResponse,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (error) throw error;

      toast.success('Edit request rejected');
      onStatusUpdate(request.id, 'rejected', adminResponse);
      onClose();
    } catch (error) {
      console.error('Error rejecting edit request:', error);
      toast.error('Failed to reject edit request');
    } finally {
      setLoading(false);
    }
  };

  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar>
              {request.profile_picture_url ? (
                <AvatarImage src={request.profile_picture_url} alt={request.full_name || ""} />
              ) : (
                <AvatarFallback>
                  {(request.full_name || "").substring(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <div>Edit Request Review - {request.full_name || 'Unnamed User'}</div>
              <div className="text-sm font-normal text-gray-500">
                Requested: {new Date(request.last_edit_request).toLocaleDateString()}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="request" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="request">Edit Request</TabsTrigger>
            <TabsTrigger value="profile">Profile Editor</TabsTrigger>
            <TabsTrigger value="actions">Admin Actions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="request" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">User's Edit Request</h3>
                {request.edit_reason ? (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Reason for edit request:</strong><br />
                      {request.edit_reason}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">No specific reason provided</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Current Profile Summary</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {request.full_name || 'Not provided'}</p>
                    <p><strong>Email:</strong> {request.email}</p>
                    <p><strong>Phone:</strong> {request.phone || 'Not provided'}</p>
                    <p><strong>Account Type:</strong> {request.account_type || 'Not provided'}</p>
                    <p><strong>Nationality:</strong> {request.nationality || 'Not provided'}</p>
                    <p><strong>Country:</strong> {request.country_of_residence || 'Not provided'}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Request Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Status:</strong> <Badge variant="outline">{request.edit_request_status}</Badge></p>
                    <p><strong>Requested:</strong> {new Date(request.last_edit_request).toLocaleDateString()}</p>
                    <p><strong>User Role:</strong> {request.user_role}</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="profile" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Profile Editor</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? <Eye className="h-4 w-4 mr-1" /> : <Edit3 className="h-4 w-4 mr-1" />}
                {isEditing ? 'View Mode' : 'Edit Mode'}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                {isEditing ? (
                  <Input
                    value={editedRequest.full_name || ''}
                    onChange={(e) => setEditedRequest(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                ) : (
                  <p className="p-2 border rounded bg-gray-50">{request.full_name || 'Not provided'}</p>
                )}
              </div>

              <div>
                <Label>Email (Read Only)</Label>
                <p className="p-2 border rounded bg-gray-100">{request.email}</p>
              </div>

              <div>
                <Label>Phone</Label>
                {isEditing ? (
                  <Input
                    value={editedRequest.phone || ''}
                    onChange={(e) => setEditedRequest(prev => ({ ...prev, phone: e.target.value }))}
                  />
                ) : (
                  <p className="p-2 border rounded bg-gray-50">{request.phone || 'Not provided'}</p>
                )}
              </div>

              <div>
                <Label>Account Type</Label>
                {isEditing ? (
                  <Input
                    value={editedRequest.account_type || ''}
                    onChange={(e) => setEditedRequest(prev => ({ ...prev, account_type: e.target.value }))}
                  />
                ) : (
                  <p className="p-2 border rounded bg-gray-50">{request.account_type || 'Not provided'}</p>
                )}
              </div>

              <div>
                <Label>Date of Birth</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editedRequest.date_of_birth || ''}
                    onChange={(e) => setEditedRequest(prev => ({ ...prev, date_of_birth: e.target.value }))}
                  />
                ) : (
                  <p className="p-2 border rounded bg-gray-50">{request.date_of_birth || 'Not provided'}</p>
                )}
              </div>

              <div>
                <Label>Gender</Label>
                {isEditing ? (
                  <Input
                    value={editedRequest.gender || ''}
                    onChange={(e) => setEditedRequest(prev => ({ ...prev, gender: e.target.value }))}
                  />
                ) : (
                  <p className="p-2 border rounded bg-gray-50">{request.gender || 'Not provided'}</p>
                )}
              </div>

              <div>
                <Label>Nationality</Label>
                {isEditing ? (
                  <Input
                    value={editedRequest.nationality || ''}
                    onChange={(e) => setEditedRequest(prev => ({ ...prev, nationality: e.target.value }))}
                  />
                ) : (
                  <p className="p-2 border rounded bg-gray-50">{request.nationality || 'Not provided'}</p>
                )}
              </div>

              <div>
                <Label>Country of Residence</Label>
                {isEditing ? (
                  <Input
                    value={editedRequest.country_of_residence || ''}
                    onChange={(e) => setEditedRequest(prev => ({ ...prev, country_of_residence: e.target.value }))}
                  />
                ) : (
                  <p className="p-2 border rounded bg-gray-50">{request.country_of_residence || 'Not provided'}</p>
                )}
              </div>

              <div className="col-span-2">
                <Label>Address</Label>
                {isEditing ? (
                  <Textarea
                    value={editedRequest.address || ''}
                    onChange={(e) => setEditedRequest(prev => ({ ...prev, address: e.target.value }))}
                  />
                ) : (
                  <p className="p-2 border rounded bg-gray-50">{request.address || 'Not provided'}</p>
                )}
              </div>

              <div>
                <Label>TIN</Label>
                {isEditing ? (
                  <Input
                    value={editedRequest.tin || ''}
                    onChange={(e) => setEditedRequest(prev => ({ ...prev, tin: e.target.value }))}
                  />
                ) : (
                  <p className="p-2 border rounded bg-gray-50">{request.tin || 'Not provided'}</p>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-2">
                <Button onClick={handleSaveEdit} disabled={loading}>
                  <Save className="h-4 w-4 mr-1" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="actions" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="admin-response">Admin Response</Label>
                <Textarea
                  id="admin-response"
                  placeholder="Provide feedback to the user about their edit request..."
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  rows={4}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleApproveRequest}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Edit Request
                </Button>
                
                <Button
                  onClick={handleRejectRequest}
                  disabled={loading || !adminResponse.trim()}
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Edit Request
                </Button>
              </div>
              
              <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded">
                <strong>Note:</strong> 
                <ul className="mt-1 space-y-1">
                  <li>• Approving will allow the user to edit their profile</li>
                  <li>• Rejecting will deny the request and send feedback to the user</li>
                  <li>• The user will be notified of your decision</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedEditRequestModal;
