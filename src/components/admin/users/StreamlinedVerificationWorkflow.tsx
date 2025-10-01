import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  FileText,
  User,
  Phone,
  Mail,
  Calendar,
  Shield,
  TrendingUp,
  Activity
} from 'lucide-react';

interface VerificationRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  user_profile: {
    full_name: string;
    email: string;
    phone: string;
    profile_picture_url?: string;
    profile_completion_percentage: number;
    account_type: string;
  };
  user_documents: Array<{
    id: string;
    type: string;
    url: string;
    status: string;
    uploaded_at: string;
  }>;
  risk_score: number;
}

interface StreamlinedVerificationWorkflowProps {
  onRequestUpdate?: () => void;
}

const StreamlinedVerificationWorkflow: React.FC<StreamlinedVerificationWorkflowProps> = ({
  onRequestUpdate
}) => {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVerificationRequests();
  }, []);

  const loadVerificationRequests = async () => {
    try {
      setLoading(true);
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          profile_picture_url,
          profile_completion_percentage,
          account_type,
          status,
          created_at,
          verification_submitted_at,
          user_documents (*)
        `)
        .eq('status', 'pending_verification')
        .not('verification_submitted_at', 'is', null)
        .order('verification_submitted_at', { ascending: false });

      if (error) throw error;

      const formattedRequests: VerificationRequest[] = (profiles || []).map(profile => {
        // Calculate risk score
        const riskScore = calculateVerificationRisk(profile);
        
        return {
          id: profile.id,
          user_id: profile.id,
          status: 'pending',
          submitted_at: profile.verification_submitted_at || profile.created_at,
          user_profile: {
            full_name: profile.full_name,
            email: profile.email,
            phone: profile.phone,
            profile_picture_url: profile.profile_picture_url,
            profile_completion_percentage: profile.profile_completion_percentage || 0,
            account_type: profile.account_type
          },
          user_documents: profile.user_documents || [],
          risk_score: riskScore
        };
      });

      setRequests(formattedRequests);
    } catch (error) {
      console.error('Error loading verification requests:', error);
      toast.error('Failed to load verification requests');
    } finally {
      setLoading(false);
    }
  };

  const calculateVerificationRisk = (profile: any) => {
    let score = 0;
    
    // Profile completion
    if ((profile.profile_completion_percentage || 0) < 70) score += 30;
    
    // Document count
    const docCount = profile.user_documents?.length || 0;
    if (docCount < 2) score += 25;
    
    // Account age
    const accountAge = Date.now() - new Date(profile.created_at).getTime();
    const daysSinceCreated = accountAge / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 7) score += 20;
    
    // Missing essential info
    if (!profile.full_name || !profile.phone) score += 15;
    
    return Math.min(score, 100);
  };

  const handleQuickApprove = async (request: VerificationRequest) => {
    await processVerification(request, 'approve', 'Quick approval - documents verified');
  };

  const handleQuickReject = async (request: VerificationRequest) => {
    await processVerification(request, 'reject', 'Documents incomplete or invalid');
  };

  const handleDetailedReview = (request: VerificationRequest) => {
    setSelectedRequest(request);
    setShowDialog(true);
  };

  const processVerification = async (request: VerificationRequest, action: 'approve' | 'reject', notes: string) => {
    setProcessing(true);
    try {
      const newStatus = action === 'approve' ? 'active' : 'blocked';
      
      const { error } = await supabase
        .from('profiles')
        .update({
          status: newStatus,
          verification_notes: notes,
          verification_reviewed_at: new Date().toISOString(),
          verification_reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.user_id);

      if (error) throw error;

      toast.success(`User ${action}d successfully`);
      await loadVerificationRequests();
      onRequestUpdate?.();
      setShowDialog(false);
      setAdminNotes('');
    } catch (error) {
      console.error('Error processing verification:', error);
      toast.error(`Failed to ${action} user`);
    } finally {
      setProcessing(false);
    }
  };

  const getRiskBadge = (riskScore: number) => {
    if (riskScore < 30) return <Badge variant="secondary" className="bg-green-100 text-green-800">Low Risk</Badge>;
    if (riskScore < 60) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>;
    return <Badge variant="destructive">High Risk</Badge>;
  };

  const getDocumentStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading verification requests...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Verification Workflow</h2>
          <p className="text-muted-foreground">
            Streamlined verification process with risk assessment
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{requests.length} Pending</Badge>
          <Badge variant="destructive">
            {requests.filter(r => r.risk_score >= 60).length} High Risk
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">High Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {requests.filter(r => r.risk_score >= 60).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Complete Profiles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {requests.filter(r => r.user_profile.profile_completion_percentage >= 80).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Missing Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {requests.filter(r => r.user_documents.length < 2).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verification Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {requests.map(request => (
          <Card key={request.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={request.user_profile.profile_picture_url} />
                    <AvatarFallback>
                      {request.user_profile.full_name?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{request.user_profile.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{request.user_profile.email}</p>
                  </div>
                </div>
                {getRiskBadge(request.risk_score)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Profile Completion */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Profile Completion</span>
                  <span>{request.user_profile.profile_completion_percentage}%</span>
                </div>
                <Progress value={request.user_profile.profile_completion_percentage} className="h-2" />
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  <span className="truncate">{request.user_profile.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className="truncate">{request.user_profile.account_type || 'Standard'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  <span>{request.user_documents.length} documents</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(request.submitted_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Documents Preview */}
              <div className="space-y-1">
                <p className="text-xs font-medium">Documents:</p>
                {request.user_documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between text-xs">
                    <span className="truncate">{doc.type}</span>
                    {getDocumentStatusIcon(doc.status)}
                  </div>
                ))}
                {request.user_documents.length === 0 && (
                  <p className="text-xs text-red-600">No documents uploaded</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDetailedReview(request)}
                >
                  <Activity className="h-3 w-3 mr-1" />
                  Review
                </Button>
                
                {request.risk_score < 30 && request.user_documents.length >= 2 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleQuickApprove(request)}
                    disabled={processing}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Quick Approve
                  </Button>
                )}
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleQuickReject(request)}
                  disabled={processing}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {requests.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No pending verification requests</p>
          </CardContent>
        </Card>
      )}

      {/* Detailed Review Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detailed Verification Review</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedRequest.user_profile.profile_picture_url} />
                    <AvatarFallback>
                      {selectedRequest.user_profile.full_name?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedRequest.user_profile.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedRequest.user_profile.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getRiskBadge(selectedRequest.risk_score)}
                      <Badge variant="outline">{selectedRequest.user_profile.account_type}</Badge>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Phone:</span> {selectedRequest.user_profile.phone}
                  </div>
                  <div>
                    <span className="font-medium">Profile:</span> {selectedRequest.user_profile.profile_completion_percentage}%
                  </div>
                  <div>
                    <span className="font-medium">Documents:</span> {selectedRequest.user_documents.length}
                  </div>
                  <div>
                    <span className="font-medium">Submitted:</span> {new Date(selectedRequest.submitted_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div>
                <Label>Admin Notes</Label>
                <Textarea
                  placeholder="Add verification notes..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedRequest && processVerification(selectedRequest, 'reject', adminNotes)}
              disabled={processing}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {processing ? 'Processing...' : 'Reject'}
            </Button>
            <Button
              onClick={() => selectedRequest && processVerification(selectedRequest, 'approve', adminNotes)}
              disabled={processing}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {processing ? 'Processing...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StreamlinedVerificationWorkflow;