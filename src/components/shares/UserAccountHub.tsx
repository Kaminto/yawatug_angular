
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Shield, FileText, Settings, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UserAccountHubProps {
  userProfile: any;
  userId: string;
  onUpdate: () => void;
}

const UserAccountHub: React.FC<UserAccountHubProps> = ({
  userProfile,
  userId,
  onUpdate
}) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [tradingLimits, setTradingLimits] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAccountData();
  }, [userId]);

  const loadAccountData = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Load user documents
      const { data: docsData } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      setDocuments(docsData || []);

      // Load verification requests
      const { data: verificationData } = await supabase
        .from('user_verification_requests')
        .select('*')
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false })
        .limit(1);

      if (verificationData && verificationData.length > 0) {
        setVerificationStatus(verificationData[0]);
      }

      // Load trading limits based on account type
      const { data: limitsData } = await supabase
        .from('share_buying_limits')
        .select('*')
        .eq('account_type', userProfile?.account_type || 'individual')
        .limit(1);

      if (limitsData && limitsData.length > 0) {
        setTradingLimits(limitsData[0]);
      }
    } catch (error) {
      console.error('Error loading account data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
      case 'active':
        return 'text-green-600';
      case 'pending_verification':
      case 'pending':
        return 'text-yellow-600';
      case 'blocked':
      case 'rejected':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getVerificationIcon = (status: string) => {
    switch (status) {
      case 'verified':
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending_verification':
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'blocked':
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const completionPercentage = userProfile?.profile_completion_percentage || 0;

  return (
    <div className="space-y-6">
      {/* Account Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Account Management</h2>
          <p className="text-muted-foreground">Manage your profile, verification status, and account settings</p>
        </div>
        <Button variant="outline" onClick={onUpdate}>
          <Settings className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Account Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verification Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {getVerificationIcon(userProfile?.status)}
                  <span className={`font-medium ${getVerificationStatusColor(userProfile?.status)}`}>
                    {userProfile?.status?.replace('_', ' ').toUpperCase() || 'UNVERIFIED'}
                  </span>
                </div>
              </div>
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Profile Completion</p>
                <p className="text-2xl font-bold">{completionPercentage.toFixed(0)}%</p>
                <Progress value={completionPercentage} className="mt-2" />
              </div>
              <User className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Account Type</p>
                <p className="text-2xl font-bold capitalize">
                  {userProfile?.account_type || 'Individual'}
                </p>
              </div>
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Management Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="limits">Trading Limits</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <p className="text-lg">{userProfile?.full_name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-lg">{userProfile?.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <p className="text-lg">{userProfile?.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Nationality</label>
                  <p className="text-lg">{userProfile?.nationality || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Date of Birth</label>
                  <p className="text-lg">
                    {userProfile?.date_of_birth 
                      ? new Date(userProfile.date_of_birth).toLocaleDateString()
                      : 'Not provided'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Account Type</label>
                  <p className="text-lg capitalize">{userProfile?.account_type || 'Individual'}</p>
                </div>
              </div>
              
              {completionPercentage < 100 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm font-medium">Profile Incomplete</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete your profile to unlock all features and increase your trading limits.
                  </p>
                  <Button size="sm" className="mt-3">
                    Update Profile
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verification Status</CardTitle>
            </CardHeader>
            <CardContent>
              {verificationStatus ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Current Status</p>
                      <p className="text-sm text-muted-foreground">
                        Submitted: {new Date(verificationStatus.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={verificationStatus.status === 'approved' ? 'default' : 'secondary'}>
                      {verificationStatus.status}
                    </Badge>
                  </div>
                  
                  {verificationStatus.status === 'pending' && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <p className="text-sm font-medium">Verification in Progress</p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your verification request is being reviewed. This typically takes 1-3 business days.
                      </p>
                    </div>
                  )}
                  
                  {verificationStatus.status === 'rejected' && verificationStatus.feedback && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <p className="text-sm font-medium">Verification Rejected</p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {verificationStatus.feedback}
                      </p>
                      <Button size="sm" className="mt-3">
                        Resubmit Verification
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No verification request submitted</p>
                  <p className="text-sm text-gray-400">Submit your verification to unlock higher trading limits</p>
                  <Button className="mt-4">
                    Start Verification
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No documents uploaded</p>
                  <p className="text-sm text-gray-400">Upload your verification documents to get started</p>
                  <Button className="mt-4">
                    Upload Documents
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium capitalize">{doc.type.replace('_', ' ')}</p>
                        <p className="text-sm text-muted-foreground">
                          Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                        {doc.document_number && (
                          <p className="text-xs text-muted-foreground">
                            Doc #: {doc.document_number}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant={
                          doc.status === 'approved' ? 'default' : 
                          doc.status === 'rejected' ? 'destructive' : 'secondary'
                        }>
                          {doc.status}
                        </Badge>
                        {doc.feedback && (
                          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                            {doc.feedback}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trading Limits & Rules</CardTitle>
            </CardHeader>
            <CardContent>
              {tradingLimits ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium">Buying Limits</h4>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Minimum Purchase</span>
                          <span className="text-sm font-medium">
                            UGX {tradingLimits.min_buy_amount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Maximum Purchase</span>
                          <span className="text-sm font-medium">
                            UGX {tradingLimits.max_buy_amount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Down Payment Required</span>
                          <span className="text-sm font-medium">
                            {tradingLimits.required_down_payment_percentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium">Credit Terms</h4>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Credit Period</span>
                          <span className="text-sm font-medium">
                            {tradingLimits.credit_period_days} days
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Account Type</span>
                          <span className="text-sm font-medium capitalize">
                            {tradingLimits.account_type}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h5 className="font-medium text-blue-800 dark:text-blue-200">Trading Guidelines</h5>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                      <li>• All purchases require verification of payment source</li>
                      <li>• Credit purchases are subject to approval and down payment</li>
                      <li>• Higher limits available for verified business accounts</li>
                      <li>• Selling restrictions may apply during high-volume periods</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No trading limits configured</p>
                  <p className="text-sm text-gray-400">Contact support for custom trading limits</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserAccountHub;
