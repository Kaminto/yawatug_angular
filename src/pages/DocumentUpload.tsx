
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import UserNavbar from '@/components/user/UserNavbar';
import Footer from '@/components/layout/Footer';
import DocumentUploadTab from '@/components/user/DocumentUploadTab';
import { CheckCircle, Upload, AlertCircle, Clock } from 'lucide-react';

interface Document {
  id: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  url?: string;
  feedback?: string;
  uploaded_at: string;
}

const DocumentUpload = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string>('individual');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Get user profile to determine user type
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserType(profile.user_type || 'individual');
      }

      // Load user documents
      const { data: docsData, error: docsError } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', user.id);

      if (docsError) throw docsError;
      setDocuments(docsData || []);

    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const getRequiredDocuments = () => {
    const baseDocuments = ['national_id', 'proof_of_address'];
    
    if (userType === 'business' || userType === 'organisation') {
      return [...baseDocuments, 'business_registration', 'trading_license'];
    }
    
    return baseDocuments;
  };

  const getDocumentStatus = (docType: string) => {
    const doc = documents.find(d => d.type === docType);
    if (!doc) return 'not_uploaded';
    return doc.status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Upload className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: 'default',
      pending: 'secondary',
      rejected: 'destructive',
      not_uploaded: 'outline'
    } as const;

    const labels = {
      approved: 'Approved',
      pending: 'Under Review',
      rejected: 'Rejected',
      not_uploaded: 'Not Uploaded'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {labels[status as keyof typeof labels] || 'Unknown'}
      </Badge>
    );
  };

  const calculateProgress = () => {
    const required = getRequiredDocuments();
    const approved = required.filter(doc => getDocumentStatus(doc) === 'approved').length;
    return (approved / required.length) * 100;
  };

  const getDocumentDisplayName = (type: string) => {
    const names = {
      national_id: 'National ID',
      proof_of_address: 'Proof of Address',
      business_registration: 'Business Registration',
      trading_license: 'Trading License',
      birth_certificate: 'Birth Certificate'
    };
    return names[type as keyof typeof names] || type;
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <UserNavbar />
        <main className="flex-grow pt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="animate-pulse">Loading documents...</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const requiredDocuments = getRequiredDocuments();
  const progress = calculateProgress();
  const allApproved = requiredDocuments.every(doc => getDocumentStatus(doc) === 'approved');

  return (
    <div className="flex flex-col min-h-screen">
      <UserNavbar />
      
      <main className="flex-grow pt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Document Verification</h1>
              <p className="text-muted-foreground">
                Upload your documents to verify your account and unlock full features
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Verification Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(progress)}% Complete</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
                
                {allApproved && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">All documents verified!</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6">
              {requiredDocuments.map((docType) => {
                const status = getDocumentStatus(docType);
                const document = documents.find(d => d.type === docType);
                
                return (
                  <Card key={docType}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(status)}
                          <CardTitle className="text-lg">
                            {getDocumentDisplayName(docType)}
                          </CardTitle>
                        </div>
                        {getStatusBadge(status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {document?.feedback && document.status === 'rejected' && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                          <p className="text-sm text-red-700">
                            <strong>Feedback:</strong> {document.feedback}
                          </p>
                        </div>
                      )}
                      
                      <DocumentUploadTab
                        documentType={docType as any}
                        currentDocument={document}
                        onUploadComplete={loadUserData}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {allApproved && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-green-800">
                        Verification Complete!
                      </h3>
                      <p className="text-green-700">
                        Your account is now fully verified. You can access all features.
                      </p>
                    </div>
                    <Button 
                      onClick={() => navigate('/dashboard')} 
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Go to Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default DocumentUpload;
