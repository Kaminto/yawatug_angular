import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Eye, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface Document {
  id: string;
  type: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  feedback?: string;
  uploaded_at: string;
  document_number?: string;
}

interface FixedDocumentUploadSectionProps {
  userType?: string;
  dateOfBirth?: string;
  documents: Document[];
  canEdit: boolean;
  onDocumentsUpdate: () => void;
}

const FixedDocumentUploadSection: React.FC<FixedDocumentUploadSectionProps> = ({
  userType = 'individual',
  dateOfBirth,
  documents,
  canEdit,
  onDocumentsUpdate
}) => {
  const [uploadingTypes, setUploadingTypes] = useState<Set<string>>(new Set());
  const [viewingDocument, setViewingDocument] = useState<string | null>(null);

  // Calculate user age
  const getUserAge = () => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Get required document types based on user type and age
  const getRequiredDocumentTypes = () => {
    const age = getUserAge();
    const baseDocuments = ['national_id', 'proof_of_address'];
    
    if (userType === 'business' || userType === 'organisation') {
      return [...baseDocuments, 'business_registration', 'trading_license'];
    }
    
    if (age && age < 18) {
      return ['birth_certificate', 'guardian_id', 'proof_of_address'];
    }
    
    return baseDocuments;
  };

  const requiredDocumentTypes = getRequiredDocumentTypes();

  const getDocumentDisplayName = (type: string) => {
    const names = {
      national_id: 'National ID',
      proof_of_address: 'Proof of Address',
      business_registration: 'Business Registration',
      trading_license: 'Trading License',
      birth_certificate: 'Birth Certificate',
      guardian_id: 'Guardian ID'
    };
    return names[type as keyof typeof names] || type;
  };

  const getDocumentForType = (type: string) => {
    return documents.find(doc => doc.type === type);
  };

  const uploadDocument = async (file: File, documentType: string) => {
    try {
      setUploadingTypes(prev => new Set(prev).add(documentType));
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log(`Uploading ${documentType} document to user_documents table for user:`, user.id);

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${documentType}_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Ensure document type matches database enum
      const documentTypeValue = documentType as "national_id" | "proof_of_address" | "business_registration" | "trading_license" | "birth_certificate" | "operational_permit" | "registration_certificate";

      // Check if document already exists and delete the old one
      const existingDoc = getDocumentForType(documentType);
      if (existingDoc) {
        console.log(`Updating existing ${documentType} document in user_documents table:`, existingDoc.id);
        const { error: updateError } = await supabase
          .from('user_documents')
          .update({
            url: publicUrl,
            status: 'pending' as const,
            feedback: null,
            uploaded_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingDoc.id);

        if (updateError) throw updateError;
        console.log(`Successfully updated ${documentType} document in user_documents table`);
      } else {
        // Insert new document record into user_documents table
        console.log(`Creating new ${documentType} document in user_documents table for user:`, user.id);
        const { error: insertError } = await supabase
          .from('user_documents')
          .insert({
            user_id: user.id,
            type: documentTypeValue,
            url: publicUrl,
            status: 'pending' as const,
            uploaded_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
        console.log(`Successfully created ${documentType} document in user_documents table`);
      }

      toast.success(`${getDocumentDisplayName(documentType)} uploaded successfully`);
      onDocumentsUpdate();
    } catch (error: any) {
      console.error(`Error uploading ${documentType} document to user_documents table:`, error);
      toast.error(`Failed to upload ${getDocumentDisplayName(documentType)}`);
    } finally {
      setUploadingTypes(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentType);
        return newSet;
      });
    }
  };

  const deleteDocument = async (documentId: string, documentType: string) => {
    try {
      console.log(`Deleting ${documentType} document from user_documents table:`, documentId);
      
      const { error } = await supabase
        .from('user_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
      
      console.log(`Successfully deleted ${documentType} document from user_documents table`);
      toast.success(`${getDocumentDisplayName(documentType)} deleted successfully`);
      onDocumentsUpdate();
    } catch (error: any) {
      console.error(`Error deleting ${documentType} document from user_documents table:`, error);
      toast.error(`Failed to delete ${getDocumentDisplayName(documentType)}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Upload className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: 'default',
      pending: 'secondary',
      rejected: 'destructive'
    } as const;

    const labels = {
      approved: 'Approved',
      pending: 'Under Review',
      rejected: 'Rejected'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {labels[status as keyof typeof labels] || 'Not Uploaded'}
      </Badge>
    );
  };

  const DocumentUploadCard = ({ documentType }: { documentType: string }) => {
    const document = getDocumentForType(documentType);
    const isUploading = uploadingTypes.has(documentType);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop: (acceptedFiles) => {
        if (acceptedFiles.length > 0 && canEdit) {
          uploadDocument(acceptedFiles[0], documentType);
        }
      },
      accept: {
        'image/*': ['.png', '.jpg', '.jpeg'],
        'application/pdf': ['.pdf']
      },
      multiple: false,
      disabled: !canEdit || isUploading
    });

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon(document?.status || 'not_uploaded')}
              <CardTitle className="text-lg">
                {getDocumentDisplayName(documentType)}
              </CardTitle>
            </div>
            {document && getStatusBadge(document.status)}
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

          {document ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Uploaded: {new Date(document.uploaded_at).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingDocument(document.url)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteDocument(document.id, documentType)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              {canEdit && (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    {isUploading ? 'Uploading...' : 'Click or drag to replace document'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            canEdit && (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">
                  {isUploading ? 'Uploading...' : `Upload ${getDocumentDisplayName(documentType)}`}
                </p>
                <p className="text-sm text-gray-600">
                  Click here or drag and drop your document (PDF, PNG, JPG)
                </p>
              </div>
            )
          )}

          {!canEdit && !document && (
            <div className="text-center py-6 text-muted-foreground">
              <Upload className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No document uploaded</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Separate uploaded and pending documents
  const uploadedDocuments = documents.filter(doc => requiredDocumentTypes.includes(doc.type));
  const pendingDocumentTypes = requiredDocumentTypes.filter(type => !documents.some(doc => doc.type === type));

  return (
    <div className="space-y-8">
      {/* Upload Section - Only show types that haven't been uploaded */}
      {pendingDocumentTypes.length > 0 && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Upload Documents</h3>
            <p className="text-sm text-muted-foreground">
              Upload the following required documents for verification. All documents must be clear and legible.
            </p>
          </div>

          <div className="grid gap-6">
            {pendingDocumentTypes.map((docType) => (
              <DocumentUploadCard key={docType} documentType={docType} />
            ))}
          </div>
        </div>
      )}

      {/* Uploaded Documents List */}
      {uploadedDocuments.length > 0 && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Uploaded Documents</h3>
            <p className="text-sm text-muted-foreground">
              Your uploaded documents and their verification status.
            </p>
          </div>

          <div className="grid gap-4">
            {uploadedDocuments.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(doc.status)}
                      <div>
                        <h4 className="font-medium">{getDocumentDisplayName(doc.type)}</h4>
                        <p className="text-sm text-muted-foreground">
                          Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(doc.status)}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingDocument(doc.url)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteDocument(doc.id, doc.type)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  {doc.feedback && doc.status === 'rejected' && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-700">
                        <strong>Feedback:</strong> {doc.feedback}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Show message when all documents are uploaded */}
      {pendingDocumentTypes.length === 0 && uploadedDocuments.length === requiredDocumentTypes.length && (
        <div className="text-center py-8">
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
          <h3 className="text-lg font-semibold mb-2">All Documents Uploaded</h3>
          <p className="text-muted-foreground">
            You have uploaded all required documents. They are under review.
          </p>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Document Viewer</h3>
              <Button variant="outline" onClick={() => setViewingDocument(null)}>
                Close
              </Button>
            </div>
            <img 
              src={viewingDocument} 
              alt="Document" 
              className="max-w-full max-h-[70vh] object-contain mx-auto"
              onError={() => {
                toast.error('Failed to load document image');
                setViewingDocument(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FixedDocumentUploadSection;
