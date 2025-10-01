
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, X, Eye, Download } from 'lucide-react';

interface Document {
  id: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  url?: string;
  feedback?: string;
  uploaded_at: string;
  document_number?: string;
}

interface DocumentUploadTabProps {
  documentType: string;
  currentDocument?: Document;
  onUploadComplete: () => Promise<void>;
  canDelete?: boolean;
}

const DocumentUploadTab: React.FC<DocumentUploadTabProps> = ({ 
  documentType, 
  currentDocument, 
  onUploadComplete,
  canDelete = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [documentNumber, setDocumentNumber] = useState(currentDocument?.document_number || '');

  const getDocumentDisplayName = (type: string) => {
    const names = {
      national_id: 'National ID',
      proof_of_address: 'Proof of Address',
      business_registration: 'Business Registration',
      trading_license: 'Trading License',
      birth_certificate: 'Birth Certificate',
      operational_permit: 'Operational Permit',
      registration_certificate: 'Registration Certificate'
    };
    return names[type as keyof typeof names] || type.replace('_', ' ').toUpperCase();
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please upload an image or PDF file');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // For now, we'll create a mock URL since storage isn't fully configured
      const mockUrl = `https://example.com/documents/${user.id}/${documentType}/${file.name}`;

      // Ensure documentType matches the expected enum values
      const validDocumentTypes = [
        'national_id',
        'proof_of_address', 
        'business_registration',
        'trading_license',
        'birth_certificate',
        'operational_permit',
        'registration_certificate'
      ];

      if (!validDocumentTypes.includes(documentType)) {
        throw new Error('Invalid document type');
      }

      // Check if document already exists
      if (currentDocument) {
        // Update existing document
        const { error } = await supabase
          .from('user_documents')
          .update({
            document_number: documentNumber,
            url: mockUrl,
            status: 'pending' as const,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentDocument.id);

        if (error) throw error;
      } else {
        // Create new document
        const { error } = await supabase
          .from('user_documents')
          .insert({
            user_id: user.id,
            type: documentType as any,
            document_number: documentNumber,
            url: mockUrl,
            status: 'pending' as const
          });

        if (error) throw error;
      }

      toast.success('Document uploaded successfully');
      await onUploadComplete();
      setDocumentNumber('');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentDocument) return;

    try {
      const { error } = await supabase
        .from('user_documents')
        .delete()
        .eq('id', currentDocument.id);

      if (error) throw error;

      toast.success('Document deleted successfully');
      await onUploadComplete();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{getDocumentDisplayName(documentType)}</h3>
        {currentDocument && (
          <Badge className={getStatusColor(currentDocument.status)}>
            {currentDocument.status.charAt(0).toUpperCase() + currentDocument.status.slice(1)}
          </Badge>
        )}
      </div>

      {currentDocument?.feedback && currentDocument.status === 'rejected' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">
            <strong>Feedback:</strong> {currentDocument.feedback}
          </p>
        </div>
      )}

      {currentDocument && currentDocument.status === 'approved' ? (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-800">Document Approved</p>
                <p className="text-sm text-green-600">
                  Document Number: {currentDocument.document_number}
                </p>
                <p className="text-xs text-green-500">
                  Uploaded: {new Date(currentDocument.uploaded_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div>
              <Label htmlFor={`docNumber-${documentType}`}>Document Number</Label>
              <Input
                id={`docNumber-${documentType}`}
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Enter document number"
              />
            </div>

            <div>
              <Label htmlFor={`file-${documentType}`}>Choose File</Label>
              <Input
                id={`file-${documentType}`}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Accepted formats: PDF, JPG, PNG (max 5MB)
              </p>
            </div>

            {uploading && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm">Uploading...</span>
              </div>
            )}

            {currentDocument && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="text-sm font-medium">Current Document</p>
                  <p className="text-xs text-muted-foreground">
                    {currentDocument.document_number} • {new Date(currentDocument.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                {canDelete && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDelete}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentUploadTab;
