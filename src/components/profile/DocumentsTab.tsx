
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, FileText, Eye, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { UserDocument } from '@/types/profile';
import { getDocumentTypesByUserType, DocumentType, DocumentStatus } from '@/types/documents';

interface DocumentsTabProps {
  userId: string;
  accountType: string;
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({ userId, accountType }) => {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const requiredDocuments = getDocumentTypesByUserType(accountType);

  useEffect(() => {
    loadDocuments();
  }, [userId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, documentType: DocumentType, documentNumber?: string) => {
    setUploading(documentType);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${documentType}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('user_documents')
        .insert({
          user_id: userId,
          type: documentType,
          url: publicUrl,
          document_number: documentNumber || undefined,
          status: 'pending' as DocumentStatus
        });

      if (insertError) throw insertError;

      toast.success('Document uploaded successfully');
      loadDocuments();
    } catch (error: any) {
      toast.error('Failed to upload document');
      console.error('Upload error:', error);
    } finally {
      setUploading(null);
    }
  };

  const deleteDocument = async (documentId: string, documentUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = documentUrl.split('/');
      const filePath = urlParts.slice(-3).join('/'); // Get last 3 parts: userId/documentType/filename

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

      if (storageError) {
        console.warn('Storage deletion failed:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('user_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      toast.success('Document deleted successfully');
      loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const formatDocumentType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">Loading documents...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Required Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {requiredDocuments.map((docType) => {
          const existingDoc = documents.find(d => d.type === docType);
          
          return (
            <div key={docType} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium">{formatDocumentType(docType)}</h4>
                  <p className="text-sm text-muted-foreground">
                    {docType === 'national_id' && 'Government issued national ID card'}
                    {docType === 'birth_certificate' && 'Official birth certificate'}
                    {docType === 'proof_of_address' && 'Utility bill or bank statement (last 3 months)'}
                    {docType === 'business_registration' && 'Business registration certificate'}
                    {docType === 'trading_license' && 'Valid trading license'}
                    {docType === 'operational_permit' && 'Operational permit from relevant authority'}
                    {docType === 'registration_certificate' && 'Organization registration certificate'}
                  </p>
                </div>
                {existingDoc && getStatusBadge(existingDoc.status as DocumentStatus)}
              </div>

              {existingDoc ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">
                        {existingDoc.document_number ? `#${existingDoc.document_number}` : 'Document uploaded'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(existingDoc.uploaded_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(existingDoc.url, '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteDocument(existingDoc.id, existingDoc.url)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  
                  {existingDoc.feedback && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm text-red-800">
                        <strong>Admin Feedback:</strong> {existingDoc.feedback}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor={`${docType}-number`}>Document Number (Optional)</Label>
                    <Input
                      id={`${docType}-number`}
                      placeholder="Enter document number if applicable"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`${docType}-file`}>Upload Document</Label>
                    <Input
                      id={`${docType}-file`}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        const numberInput = document.getElementById(`${docType}-number`) as HTMLInputElement;
                        const documentNumber = numberInput?.value;
                        
                        if (file) {
                          handleFileUpload(file, docType, documentNumber);
                        }
                      }}
                      disabled={uploading === docType}
                    />
                    {uploading === docType && (
                      <p className="text-sm text-muted-foreground mt-1">Uploading...</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        {requiredDocuments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No specific documents required for your account type.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentsTab;
