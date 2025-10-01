
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, AlertTriangle, User, FileText, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type UserStatus = 'active' | 'blocked' | 'unverified' | 'pending_verification';

interface VerificationItem {
  id: string;
  type: 'profile' | 'document' | 'contact';
  status: 'pending' | 'approved' | 'rejected';
  data: any;
  notes?: string;
}

interface EnhancedVerificationWorkflowProps {
  userId: string;
  userProfile: any;
  onVerificationComplete: () => void;
}

const EnhancedVerificationWorkflow: React.FC<EnhancedVerificationWorkflowProps> = ({
  userId,
  userProfile,
  onVerificationComplete
}) => {
  const [verificationItems, setVerificationItems] = useState<VerificationItem[]>([]);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | ''>('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [adminNotes, setAdminNotes] = useState('');
  const [autoRulesEnabled, setAutoRulesEnabled] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleAutoRulesChange = (checked: boolean) => {
    setAutoRulesEnabled(checked);
  };

  const getVerificationScore = () => {
    const requiredFields = ['full_name', 'phone', 'date_of_birth', 'nationality', 'address'];
    const completedFields = requiredFields.filter(field => userProfile[field]);
    const profileScore = (completedFields.length / requiredFields.length) * 40;
    
    const documentsScore = userProfile.user_documents?.length >= 2 ? 30 : 0;
    const contactsScore = userProfile.contact_persons?.length >= 1 ? 20 : 0;
    const pictureScore = userProfile.profile_picture_url ? 10 : 0;
    
    return Math.round(profileScore + documentsScore + contactsScore + pictureScore);
  };

  const getRecommendedAction = () => {
    const score = getVerificationScore();
    if (score >= 80) return { action: 'approve', confidence: 'high' };
    if (score >= 60) return { action: 'approve', confidence: 'medium' };
    if (score >= 40) return { action: 'pending', confidence: 'low' };
    return { action: 'reject', confidence: 'high' };
  };

  const handleBulkVerification = async () => {
    if (!bulkAction || selectedItems.length === 0) {
      toast.error('Please select items and an action');
      return;
    }

    try {
      setProcessing(true);
      
      // Process based on bulk action
      const newStatus: UserStatus = bulkAction === 'approve' ? 'active' : 'blocked';
      
      const { error } = await supabase
        .from('profiles')
        .update({
          status: newStatus,
          verification_reviewed_at: new Date().toISOString(),
          verification_notes: adminNotes || `Bulk ${bulkAction}ed by admin`
        })
        .eq('id', userId);

      if (error) throw error;

      // Log admin action
      await supabase
        .from('admin_verification_actions')
        .insert({
          admin_id: (await supabase.auth.getUser()).data.user?.id,
          user_id: userId,
          action_type: `bulk_${bulkAction}`,
          notes: adminNotes
        });

      toast.success(`User ${bulkAction}ed successfully`);
      onVerificationComplete();
    } catch (error) {
      console.error('Error in bulk verification:', error);
      toast.error('Failed to process bulk verification');
    } finally {
      setProcessing(false);
    }
  };

  const handleSmartVerification = async () => {
    const recommendation = getRecommendedAction();
    
    try {
      setProcessing(true);
      
      let newStatus: UserStatus = 'pending_verification';
      if (recommendation.action === 'approve') newStatus = 'active';
      if (recommendation.action === 'reject') newStatus = 'blocked';
      
      const { error } = await supabase
        .from('profiles')
        .update({
          status: newStatus,
          verification_reviewed_at: new Date().toISOString(),
          verification_notes: `Smart verification: Score ${getVerificationScore()}% - ${recommendation.confidence} confidence ${recommendation.action}`
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`Smart verification completed: ${recommendation.action}ed with ${recommendation.confidence} confidence`);
      onVerificationComplete();
    } catch (error) {
      console.error('Error in smart verification:', error);
      toast.error('Failed to process smart verification');
    } finally {
      setProcessing(false);
    }
  };

  const score = getVerificationScore();
  const recommendation = getRecommendedAction();

  return (
    <div className="space-y-6">
      {/* Verification Score Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Smart Verification Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Verification Score</p>
              <p className="text-2xl font-bold">{score}%</p>
            </div>
            <Badge 
              variant={score >= 80 ? 'default' : score >= 60 ? 'secondary' : 'destructive'}
            >
              {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor'}
            </Badge>
          </div>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Recommended Action: <strong>{recommendation.action.toUpperCase()}</strong> 
              ({recommendation.confidence} confidence)
            </AlertDescription>
          </Alert>

          <Button 
            onClick={handleSmartVerification} 
            disabled={processing}
            className="w-full"
          >
            <Zap className="h-4 w-4 mr-2" />
            Apply Smart Verification
          </Button>
        </CardContent>
      </Card>

      {/* Detailed Verification Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile Review</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Completeness Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { field: 'full_name', label: 'Full Name', required: true },
                  { field: 'phone', label: 'Phone Number', required: true },
                  { field: 'date_of_birth', label: 'Date of Birth', required: true },
                  { field: 'nationality', label: 'Nationality', required: true },
                  { field: 'address', label: 'Address', required: true },
                  { field: 'profile_picture_url', label: 'Profile Picture', required: false }
                ].map(({ field, label, required }) => (
                  <div key={field} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{label}</span>
                    <div className="flex items-center gap-2">
                      {userProfile[field] ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      {required && <Badge variant="outline" className="text-xs">Required</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Document Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userProfile.user_documents?.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{doc.type}</p>
                      <p className="text-sm text-gray-600">{doc.document_number || 'No number provided'}</p>
                    </div>
                    <Badge variant={doc.status === 'approved' ? 'default' : 
                                  doc.status === 'rejected' ? 'destructive' : 'secondary'}>
                      {doc.status}
                    </Badge>
                  </div>
                )) || (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>No documents uploaded</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Verification Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Action Type</Label>
                  <Select value={bulkAction} onValueChange={(value: 'approve' | 'reject') => setBulkAction(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approve">Approve User</SelectItem>
                      <SelectItem value="reject">Reject User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="auto-rules" 
                    checked={autoRulesEnabled}
                    onCheckedChange={handleAutoRulesChange}
                  />
                  <Label htmlFor="auto-rules">Apply auto-rules</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="admin-notes">Admin Notes</Label>
                <Textarea
                  id="admin-notes"
                  placeholder="Add notes about this verification decision..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleBulkVerification}
                disabled={processing || !bulkAction}
                className="w-full"
                variant={bulkAction === 'approve' ? 'default' : 'destructive'}
              >
                {processing ? 'Processing...' : `${bulkAction} User`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedVerificationWorkflow;
